var _global = (typeof self === 'object' && self.self === self && self) ||
    (typeof global === 'object' && global.global === global && global);
var _ALLOWED_MODES = ['node', 'hash', 'history'];
var _DEFAULT_OPTIONS = { mode: 'node', keys: true, root: '/', rerouting: true };
var _OPTIONAL_PARAM = /\((.*?)\)/g;
var _NAMED_PARAM = /(\(\?)?:\w+/g;
var _SPLAT_PARAM = /\*\w+/g;
var _ESCAPE_REG_EXP = /[\-{}\[\]+?.,\\\^$|#\s]/g;
var _DEFAULT_ROUTE = /.*/;
var RouteHelper = (function () {
    function RouteHelper() {
    }
    RouteHelper._getRouteKeys = function (path) {
        var keys = path.match(/:([^\/]+)/g);
        if (!keys) {
            return keys;
        }
        for (var i = 0; i < keys.length; i++) {
            keys[i] = keys[i].replace(/[:\(\)]/g, '');
        }
        return keys;
    };
    RouteHelper._routeToRegExp = function (route) {
        route = route.replace(_ESCAPE_REG_EXP, '\\$&')
            .replace(_OPTIONAL_PARAM, '(?:$1)?')
            .replace(_NAMED_PARAM, function (match, optional) {
            return optional ? match : '([^/?]+)';
        })
            .replace(_SPLAT_PARAM, '([^?]*)');
        return new RegExp('^' + route + '(?:\\?*([^/]*))');
    };
    RouteHelper._clearSlashes = function (path) {
        return path.replace(/\/$/, '').replace(/^\//, '');
    };
    RouteHelper._extractParameters = function (route, fragment) {
        var params = route.exec(fragment).slice(1);
        return params.map(function (param, i) {
            if (i === params.length - 1) {
                return param || null;
            }
            return param ? _global.decodeURIComponent(param) : null;
        });
    };
    RouteHelper._parseQuery = function (qstr) {
        var query = {};
        var params = qstr.split('&');
        for (var i = 0; i < params.length; i++) {
            var pair = params[i].split('=');
            query[_global.decodeURIComponent(pair[0])] = _global.decodeURIComponent(pair[1]);
        }
        return query;
    };
    RouteHelper._prepareArguments = function (parameters, keys) {
        var wrapper = {};
        var lastIndex = parameters.length - 1;
        var query = parameters[lastIndex];
        if (keys && keys.length > 0) {
            for (var i = 0; i < keys.length; i++) {
                wrapper[keys[i]] = parameters[i];
            }
            if (parameters[keys.length]) {
                wrapper.query = RouteHelper._parseQuery(parameters[keys.length]);
            }
            parameters = [wrapper];
        }
        else if (query && query.indexOf('=') > -1) {
            parameters[lastIndex] = RouteHelper._parseQuery(query);
        }
        return parameters;
    };
    return RouteHelper;
})();
var RoutingLevel = (function () {
    function RoutingLevel() {
        this._routes = [];
        this._options = JSON.parse(JSON.stringify(_DEFAULT_OPTIONS));
    }
    RoutingLevel.prototype.add = function (path, callback, options) {
        var keys;
        var re;
        if (typeof path === 'function') {
            options = callback;
            callback = path;
            re = _DEFAULT_ROUTE;
        }
        else {
            keys = RouteHelper._getRouteKeys(path);
            re = RouteHelper._routeToRegExp(path);
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
    RoutingLevel.prototype.remove = function (alias) {
        for (var i = this._routes.length - 1; i >= 0; i--) {
            var r = this._routes[i];
            if (alias === r.alias || alias === r.callback || alias === r.path) {
                this._routes.splice(i, 1);
            }
            else if (r._routes.length > 0) {
                for (var j = r._routes.length - 1; j >= 0; j--) {
                    r._routes[j].remove(alias);
                }
            }
        }
        return this;
    };
    RoutingLevel.prototype.check = function (fragment, array, lastURL) {
        for (var i = 0; i < this._routes.length; i++) {
            var route = this._routes[i];
            var match = fragment.match(route.path);
            if (match) {
                var params = RouteHelper._extractParameters(route.path, fragment);
                var keys = this._options.keys ? route.keys : null;
                params = RouteHelper._prepareArguments(params, keys);
                var should = (fragment.slice(0, match[0].length) !== lastURL.slice(0, match[0].length));
                var node = {
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
    RoutingLevel.prototype.drop = function () {
        this._routes = [];
        this.config(_DEFAULT_OPTIONS);
        return this;
    };
    RoutingLevel.prototype.config = function (options) {
        if (options) {
            this._options.keys = (typeof options.keys === 'boolean') ? options.keys : this._options.keys;
            this._options.mode = (_ALLOWED_MODES.indexOf(options.mode) !== -1) ? options.mode : this._options.mode;
            this._options.root = options.root ? '/' + RouteHelper._clearSlashes(options.root) + '/' : this._options.root;
            this._options.rerouting = (typeof options.rerouting === 'boolean') ? options.rerouting : this._options.rerouting;
        }
        return this;
    };
    RoutingLevel.prototype.to = function (alias) {
        var subrouter;
        for (var i = 0; i < this._routes.length; i++) {
            var route = this._routes[i];
            if (alias === route.alias) {
                subrouter = route.facade;
                if (!subrouter) {
                    subrouter = new RoutingLevel();
                    subrouter.config(this._options);
                    route.facade = subrouter;
                }
                break;
            }
        }
        return subrouter;
    };
    return RoutingLevel;
})();
var Router = (function (facade) {
    var lastURL = '';
    var rollback = false;
    var router = {
        drop: function () {
            lastURL = '';
            return facade.drop();
        },
        listen: function () {
            var _this = this;
            _global.addEventListener('hashchange', function () {
                var current = _this.getCurrent();
                _this.check(current);
            }, false);
            _global.addEventListener('popstate', function (evt) {
                if (evt.state !== null && evt.state !== undefined) {
                    var current = _this.getCurrent();
                    _this.check(current);
                }
            }, false);
        },
        check: function (path) {
            apply(facade.check(path, [], lastURL));
            return facade;
        },
        navigate: function (path) {
            var mode = facade._options.mode;
            switch (mode) {
                case 'history':
                    _global.history.pushState(null, null, facade._options.root + RouteHelper._clearSlashes(path));
                    break;
                case 'hash':
                    _global.location.href = _global.location.href.replace(/#(.*)$/, '') + '#' + path;
                    break;
                case 'node':
                    lastURL = path;
                    break;
            }
            return facade;
        },
        route: function (path) {
            if (facade._options.mode === 'node') {
                this.check(path);
            }
            if (!rollback) {
                this.navigate(path);
            }
            rollback = false;
            return facade;
        },
        config: function (options) {
            return facade.config(options);
        },
        to: function (alias) {
            return facade.to(alias);
        },
        add: function (path, callback, alias) {
            return facade.add(path, callback, alias);
        },
        remove: function (alias) {
            return facade.remove(alias);
        },
        getCurrent: function () {
            var mode = facade._options.mode;
            var root = facade._options.root;
            var fragment = lastURL;
            if (mode === 'history') {
                fragment = RouteHelper._clearSlashes(_global.decodeURI(_global.location.pathname + _global.location.search));
                fragment = fragment.replace(/\?(.*)$/, '');
                fragment = root !== '/' ? fragment.replace(root, '') : fragment;
                fragment = RouteHelper._clearSlashes(fragment);
            }
            else if (mode === 'hash') {
                var match = _global.location.href.match(/#(.*)$/);
                fragment = match ? match[1] : '';
                fragment = RouteHelper._clearSlashes(fragment);
            }
            return fragment;
        }
    };
    function applyNested(routes) {
        return function (param) {
            if (param === false) {
                rollback = true;
                router.navigate(lastURL);
            }
            else if (typeof param === 'string') {
                router.route(param);
            }
            else if (routes && routes.length) {
                apply(routes);
            }
        };
    }
    function apply(routes) {
        if (routes) {
            var falseToReject;
            for (var i = 0; i < routes.length; i += 1) {
                var route = routes[i];
                if (route.rootRerouting) {
                    falseToReject = route.callback.apply(null, route.params);
                }
                applyNested(route.routes)(falseToReject);
            }
        }
    }
    return router;
})(new RoutingLevel());
//# sourceMappingURL=prouter.js.map