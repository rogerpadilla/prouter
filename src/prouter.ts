declare const global: any;

// Establish the root object, `window` (`self`) in the browser, or `global` on the server.
// We use `self` instead of `window` for `WebWorker` support.
const _global = (typeof self === 'object' && self.self === self && self) ||
    (typeof global === 'object' && global.global === global && global);


const _ALLOWED_MODES = ['node', 'hash', 'history'];
const _DEFAULT_OPTIONS = { mode: 'node', keys: true, root: '/', rerouting: true };

// parse regular expression
const _OPTIONAL_PARAM = /\((.*?)\)/g;
const _NAMED_PARAM = /(\(\?)?:\w+/g;
const _SPLAT_PARAM = /\*\w+/g;
const _ESCAPE_REG_EXP = /[\-{}\[\]+?.,\\\^$|#\s]/g;
const _DEFAULT_ROUTE = /.*/;


function _getRouteKeys(path: string): Object[] {
    const keys = path.match(/:([^\/]+)/g);
    for (let i = 0, l = keys ? keys.length : 0; i < l; i++) {
        keys[i] = keys[i].replace(/[:\(\)]/g, '');
    }
    return keys;
}

function _routeToRegExp(route: string): RegExp {
    route = route.replace(_ESCAPE_REG_EXP, '\\$&')
        .replace(_OPTIONAL_PARAM, '(?:$1)?')
        .replace(_NAMED_PARAM, function(match, optional) {
            return optional ? match : '([^/?]+)';
        })
        .replace(_SPLAT_PARAM, '([^?]*)');

    return new RegExp('^' + route + '(?:\\?*([^/]*))');
}

function _clearSlashes(path: string): string {
    return path.replace(/\/$/, '').replace(/^\//, '');
}

function _extractParameters(route: RegExp, fragment: string): Object[] {
    const params = route.exec(fragment).slice(1);
    return params.map(function(param, i) {
        if (i === params.length - 1) {
          return param || null;
        }
        return param ? _global.decodeURIComponent(param) : null;
    });
}

function _parseQuery(qstr: string): Object {
    const query = {};
    const params = qstr.split('&');
    for (let i = 0; i < params.length; i++) {
        const pair = params[i].split('=');
        query[_global.decodeURIComponent(pair[0])] = _global.decodeURIComponent(pair[1]);
    }
    return query;
}

function _prepareArguments(parameters: any[], keys: any[]) {

    const wrapper: any = {};
    const lastIndex = parameters.length - 1;
    const query = parameters[lastIndex];

    if (keys && keys.length > 0) {
        for (let i = 0; i < keys.length; i++) {
            wrapper[keys[i]] = parameters[i];
        }
        if (parameters[keys.length]) {
            wrapper.query = _parseQuery(parameters[keys.length]);
        }
        parameters = [wrapper];
    } else if (query && query.indexOf('=') > -1) {
        parameters[lastIndex] = _parseQuery(query);
    }

    return parameters;
}

function RoutingLevel() {
    this._routes = [];
    this._options = JSON.parse(JSON.stringify(_DEFAULT_OPTIONS));
}

RoutingLevel.prototype.add = function(path: any, callback?: Function, options?: any) {

    let keys: Object[];
    let re: RegExp;

    if (typeof path === 'function') {
        options = callback;
        callback = <any> path;
        re = _DEFAULT_ROUTE;
    } else {
        keys = _getRouteKeys(path);
        re = _routeToRegExp(path);
    }

    this._routes.push({
        path: re,
        callback: callback,
        keys: keys,
        alias: (options && options.alias) ? options.alias : path,
        facade: null
    });

    return this;
};

RoutingLevel.prototype.remove = function(alias: string) {

    for (let i = this._routes.length - 1; i > -1; i -= 1) {
        let r = this._routes[i];
        if (alias === r.alias || alias === r.callback || alias.toString() === r.path.toString()) {
            this._routes.splice(i, 1);
        } else if (r._routes.length > 0) {
            for (let j = r._routes.length - 1; j > -1; j -= 1) {
                r._routes[j].remove(alias);
            }
        }
    }

    return this;
};

RoutingLevel.prototype.check = function(fragment: string, array: any[], lastURL: string) {

    for (let i = 0; i < this._routes.length; i++) {
        const route = this._routes[i];
        const match = fragment.match(route.path);
        if (match) {
            let params = _extractParameters(route.path, fragment);
            const keys = this._options.keys ? route.keys : null;
            params = _prepareArguments(params, keys);
            const should = (fragment.slice(0, match[0].length) !== lastURL.slice(0, match[0].length));

            const node: any = {
                callback: route.callback,
                params: params,
                routes: [],
                rootRerouting: this._options.rerouting || should
            };

            array.push(node);

            if (route.facade) {
                fragment = fragment.slice(match[0].length, fragment.length);
                lastURL = lastURL.slice(match[0].length, lastURL.length);
                route.facade.check(fragment, node.routes, lastURL);
            }
            break;
        }
    }

    return array;
};

RoutingLevel.prototype.drop = function() {
    this._routes = [];
    this.config(_DEFAULT_OPTIONS);
    return this;
};

RoutingLevel.prototype.config = function(options: any) {
    if (typeof options === 'object') {
        this._options.keys = (typeof options.keys === 'boolean') ? options.keys : this._options.keys;
        this._options.mode = (_ALLOWED_MODES.indexOf(options.mode) !== -1) ? options.mode : this._options.mode;
        this._options.root = options.root ? '/' + _clearSlashes(options.root) + '/' : this._options.root;
        this._options.rerouting = (typeof options.rerouting === 'boolean') ? options.rerouting : this._options.rerouting;
    }
    return this;
};

RoutingLevel.prototype.to = function(alias: string) {
    let subrouter: any;
    for (let i = 0; i < this._routes.length; i++) {
        const route = this._routes[i];
        if (alias === route.alias) {
            subrouter = route.facade;
            if (!subrouter) {
                route.facade = subrouter = (new RoutingLevel()).config(this._options);
            }
        }
    }

    return subrouter;
};

const Router = (function(facade: any) {

    let router: any = {}, lastURL = '', rollback = false;

    function applyNested(routes: any[]) {
        return function(param: any) {
            if (param === false) {
                rollback = true;
                router.navigate(lastURL);
            } else if (typeof param === 'string') {
                router.route(param);
            } else if (routes && routes.length) {
                apply(routes);
            }
        };
    }

    function apply(routes: any[]) {

        let falseToReject: boolean;

        if (routes) {
            for (let i = 0; i < routes.length; i += 1) {
                const route = routes[i];
                if (route.rootRerouting) {
                    falseToReject = route.callback.apply(null, route.params);
                }
                applyNested(route.routes)(falseToReject);
            }
        }
    }

    router.drop = function() {
        lastURL = '';
        return facade.drop();
    };

    router.listen = function() {

        let self = this, current = this.getCurrent();

        clearInterval(this._interval);

        this._interval = setInterval(function() {
            const location = router.getCurrent();
            if (current !== location) {
                current = location;
                self.check(self.getCurrent());
            }
        }, 50);

        _global.onpopstate = function(e: PopStateEvent) {
            if (e.state !== null && e.state !== undefined) {
                _global.clearInterval(self._interval);
                self.check(self.getCurrent());
            }
        };
    };

    router.check = function(path: string) {
        apply(facade.check(path, [], lastURL));
        return facade;
    };

    router.navigate = function(path: string) {
        const mode = facade._options.mode;
        switch (mode) {
            case 'history':
                _global.history.pushState(null, null, facade._options.root + _clearSlashes(path));
                break;
            case 'hash':
                _global.location.href = _global.location.href.replace(/#(.*)$/, '') + '#' + path;
                break;
            case 'node':
                lastURL = path;
                break;
        }
        return facade;
    };

    router.route = function(path: string) {
        if (facade._options.mode === 'node') {
            this.check(path);
        }
        if (!rollback) {
            this.navigate(path);
        }
        rollback = false;
        return facade;
    };

    router.config = function(options: Object) {
        return facade.config(options);
    };

    router.to = function(alias: string) {
        return facade.to(alias);
    };

    router.add = function(path: any, callback?: Function, alias?: string) {
        return facade.add(path, callback, alias);
    };

    router.remove = function(alias: string) {
        return facade.remove(alias);
    };

    router.getCurrent = function(): string {

        const mode = facade._options.mode;
        const root = facade._options.root;
        let fragment = lastURL;

        if (mode === 'history') {
            fragment = _clearSlashes(_global.decodeURI(_global.location.pathname + _global.location.search));
            fragment = fragment.replace(/\?(.*)$/, '');
            fragment = root !== '/' ? fragment.replace(root, '') : fragment;
            fragment = _clearSlashes(fragment);
        } else if (mode === 'hash') {
            const match = _global.location.href.match(/#(.*)$/);
            fragment = match ? match[1] : '';
            fragment = _clearSlashes(fragment);
        }

        return fragment;
    };

    return router;

})(new RoutingLevel());
