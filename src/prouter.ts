/**
 * Contract of route handler.
 */
export interface Handler {
    route: string;
    activate: Function;
    deactivate?: Function;
}

/**
 * Contract for entry handler.
 */
interface Route {
    path: RegExp;
    callback: Function;
    keys: string[];
    alias: string;
    facade?: RoutingLevel;
}
/**
 * Contract for entry handler.
 */
interface NodeRoute {
    alias: string;
    callback: Function;
    params: Object[];
    routes: NodeRoute[];
    rootRerouting: boolean;
}

/**
 * Contract for entry handler.
 */
interface Options {
    mode: string;
    keys: boolean;
    root: string;
    rerouting: boolean;
}

/**
 * Contract for object param.
 */
export interface ObjectParam {
    [index: string]: any;
}

/**
 * Contract for event handler.
 */
interface EventHandler {
    [index: string]: Function[];
}


declare const global: any;

// Establish the root object, `window` (`self`) in the browser, or `global` on the server.
// We use `self` instead of `window` for `WebWorker` support.
const _global = (typeof self === 'object' && self.self === self && self) ||
    (typeof global === 'object' && global.global === global && global);

const _MODES = ['node', 'hash', 'history'];
const _DEF_OPTIONS: Options = { mode: 'hash', keys: true, root: '/', rerouting: true };

// Caches for common regexp.
const _OPTIONAL_PARAM = /\((.*?)\)/g;
const _NAMED_PARAM = /(\(\?)?:\w+/g;
const _SPLAT_PARAM = /\*\w+/g;
const _ESCAPE_REG_EXP = /[\-{}\[\]+?.,\\\^$|#\s]/g;


class RouteHelper {

    static _extractKeys(path: string): string[] {
        const keys = path.match(/:([^\/]+)/g);
        if (keys) {
            const resp: string[] = [];
            for (let i = 0; i < keys.length; i++) {
                resp[i] = keys[i].replace(/[:\(\)]/g, '');
            }
            return resp;
        }
        return null;
    }

    static _routeToRegExp(route: string): RegExp {
        route = route.replace(_ESCAPE_REG_EXP, '\\$&')
            .replace(_OPTIONAL_PARAM, '(?:$1)?')
            .replace(_NAMED_PARAM, function(match, optional) {
            return optional ? match : '([^/?]+)';
        })
            .replace(_SPLAT_PARAM, '([^?]*)');
        return new RegExp('^' + route + '(?:\\?*([^/]*))');
    }

    static _clearSlashes(path: string): string {
        return path.replace(/\/$/, '').replace(/^\//, '');
    }

    static _extractParameters(route: RegExp, fragment: string): Object[] {
        const params = route.exec(fragment).slice(1);
        return params.map(function(param, i) {
            if (i === params.length - 1) {
                return param || null;
            }
            return param ? _global.decodeURIComponent(param) : null;
        });
    }

    private static _parseQuery(qstr: string): Object {
        const query: any = {};
        const params = qstr.split('&');
        for (let i = 0; i < params.length; i++) {
            const pair = params[i].split('=');
            const prop = _global.decodeURIComponent(pair[0]);
            query[prop] = _global.decodeURIComponent(pair[1]);
        }
        return query;
    }

    static _prepareArguments(parameters: any[], keys?: string[]): Object[] {

        const lastIndex = parameters.length - 1;
        const query = parameters[lastIndex];

        if (keys) {
            const objectParam: ObjectParam = {};
            for (let i = 0; i < keys.length; i++) {
                objectParam[keys[i]] = parameters[i];
            }
            if (parameters[keys.length]) {
                objectParam['query'] = RouteHelper._parseQuery(parameters[keys.length]);
            }
            parameters = [objectParam];
        } else if (query && query.indexOf('=') > -1) {
            parameters[lastIndex] = RouteHelper._parseQuery(query);
        }

        return parameters;
    }
}


class RoutingLevel {

    _routes: Route[] = [];
    _options: Options = JSON.parse(JSON.stringify(_DEF_OPTIONS));

    add(path: any, callback?: Function): RoutingLevel {

        let keys: string[];
        let re: RegExp;

        // If default route.
        if (typeof path === 'function') {
            callback = path;
            re = /.*/;
        } else {
            keys = RouteHelper._extractKeys(path);
            re = RouteHelper._routeToRegExp(path);
        }

        this._routes.push({
            path: re,
            callback: callback,
            keys: keys,
            alias: path
        });

        return this;
    }

    remove(alias: any): RoutingLevel {

        for (let i = this._routes.length - 1; i >= 0; i--) {
            const r = this._routes[i];
            if (alias === r.alias || alias === r.callback || alias === r.path) {
                this._routes.splice(i, 1);
            }
        }

        return this;
    }

    check(fragment: string, nodeRoutes: NodeRoute[], lastURL: string): NodeRoute[] {

        for (let i = 0; i < this._routes.length; i++) {

            const route = this._routes[i];
            const match = fragment.match(route.path);

            if (match) {

                let params = RouteHelper._extractParameters(route.path, fragment);
                const keys = this._options.keys ? route.keys : null;
                params = RouteHelper._prepareArguments(params, keys);
                const shouldReroute = (fragment.slice(0, match[0].length) !== lastURL.slice(0, match[0].length));

                const nodeRoute: NodeRoute = {
                    alias: route.alias,
                    callback: route.callback,
                    params: params,
                    routes: [],
                    rootRerouting: this._options.rerouting || shouldReroute
                };

                nodeRoutes.push(nodeRoute);

                if (route.facade) {
                    fragment = fragment.slice(match[0].length, fragment.length);
                    lastURL = lastURL.slice(match[0].length, lastURL.length);
                    route.facade.check(fragment, nodeRoute.routes, lastURL);
                }

                break;
            }
        }

        return nodeRoutes;
    }

    drop(): RoutingLevel {
        this._routes = [];
        this.config(_DEF_OPTIONS);
        return this;
    }

    config(options: Options): RoutingLevel {
        if (options) {
            this._options.keys = options.keys;
            this._options.mode = options.mode ? options.mode : this._options.mode;
            this._options.root = options.root ? '/' + RouteHelper._clearSlashes(options.root) + '/' : this._options.root;
            this._options.root = this._options.root.replace(/\/{2,}/, "/");
            this._options.rerouting = options.rerouting;
        }
        return this;
    }

    to(alias: string): RoutingLevel {
        let subrouter: RoutingLevel;
        for (let i = 0; i < this._routes.length; i++) {
            const route = this._routes[i];
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
    }
}


class Prouter {

    private static _firstLevel = new RoutingLevel();
    private static _eventHandlers: EventHandler = {};
    private static _lastURL = '';
    private static _rollback = false;
    private static _listening = false;    

    static drop(): RoutingLevel {
        this._lastURL = '';
        return this._firstLevel.drop();
    }

    static listen() {
        if (this._listening) {
            throw new Error('Prouter already listening');
        }
        _global.addEventListener('hashchange', () => {
            const current = this.getCurrent();
            this.check(current);
        }, false);
        _global.addEventListener('popstate', (evt: PopStateEvent) => {
            if (evt.state !== null && evt.state !== undefined) {
                const current = this.getCurrent();
                this.check(current);
            }
        }, false);
        this._listening = true;
    }

    static check(path: string): RoutingLevel {
        const nodeRoutes = this._firstLevel.check(path, [], this._lastURL);
        this._apply(nodeRoutes);
        return this._firstLevel;
    }

    static navigate(path: string): RoutingLevel {
        const mode = this._firstLevel._options.mode;
        switch (mode) {
            case 'history':
                _global.history.pushState(null, null, this._firstLevel._options.root + RouteHelper._clearSlashes(path));
                break;
            case 'hash':
                _global.location.href = _global.location.href.replace(/#(.*)$/, '') + '#' + path;
                break;
            case 'node':
                this._lastURL = path;
                break;
        }
        return this._firstLevel;
    }

    static route(path: string): RoutingLevel {
        if (this._firstLevel._options.mode === 'node') {
            this.check(path);
        }
        if (!this._rollback) {
            this.navigate(path);
        }
        this._rollback = false;
        return this._firstLevel;
    }

    static config(options: Options): RoutingLevel {
        return this._firstLevel.config(options);
    }

    static to(alias: string): RoutingLevel {
        return this._firstLevel.to(alias);
    }

    static add(path: any, callback?: Function): RoutingLevel {
        return this._firstLevel.add(path, callback);
    }

    static remove(alias: string): RoutingLevel {
        return this._firstLevel.remove(alias);
    }

    static getCurrent(): string {

        const mode = this._firstLevel._options.mode;
        const root = this._firstLevel._options.root;
        let fragment = this._lastURL;

        if (mode === 'history') {
            fragment = RouteHelper._clearSlashes(_global.decodeURI(_global.location.pathname + _global.location.search));
            fragment = fragment.replace(/\?(.*)$/, '');
            fragment = root !== '/' ? fragment.replace(root, '') : fragment;
            fragment = RouteHelper._clearSlashes(fragment);
        } else if (mode === 'hash') {
            const match = _global.location.href.match(/#(.*)$/);
            fragment = match ? match[1] : '';
            fragment = RouteHelper._clearSlashes(fragment);
        }

        return fragment;
    }
    
    /**
     * Add event listener.
     * @param {string} evt Name of the event.
     * @param {Function} callback Method.
     * @returns {History} this history
     */
    static on(evt: string, callback: Function): Prouter {
        if (this._eventHandlers[evt] === undefined) {
            this._eventHandlers[evt] = [];
        }
        this._eventHandlers[evt].push(callback);
        return this;
    }

    /**
     * Remove event listener.
     * @param {string} evt Name of the event.
     * @param {Function} callback Method.
     * @returns {History} this history
     */
    static off(evt: string, callback: Function): Prouter {
        if (this._eventHandlers[evt]) {
            const callbacks = this._eventHandlers[evt];
            for (let i = 0; i < callbacks.length; i++) {
                if (callbacks[i] === callback) {
                    callbacks.splice(i, 1);
                    if (callbacks.length === 0) {
                        delete this._eventHandlers[evt];
                    }
                    break;
                }
            }
        }
        return this;
    }
    
    private static _applyNested(nodeRoutes: NodeRoute[]): Function {
        return function(param: any) {
            if (param === false) {
                Prouter._rollback = true;
                Prouter.navigate(Prouter._lastURL);
            } else if (typeof param === 'string') {
                Prouter.route(param);
            } else if (nodeRoutes && nodeRoutes.length) {
                Prouter._apply(nodeRoutes);
            }
        };
    }

    private static _apply(nodeRoutes: NodeRoute[]) {
        if (nodeRoutes) {
            let falseToReject: boolean;
            for (let i = 0; i < nodeRoutes.length; i += 1) {
                const nodeRoute = nodeRoutes[i];
                if (nodeRoute.rootRerouting) {
                    falseToReject = nodeRoute.callback.apply(null, nodeRoute.params);
                }
                this._applyNested(nodeRoute.routes)(falseToReject);
            }
        }
    }
}