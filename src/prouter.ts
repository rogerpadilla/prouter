module prouter {

    export interface PathExp extends RegExp {
        keys?: PathExpToken[];
    }

    /**
     * Contract for entry handler.
     */
    export interface Route {
        path: PathExp;
        callback: Function;
        alias: string;
        facade?: RoutingLevel;
    }
    
    /**
     * Contract for entry handler.
     */
    export interface NodeRoute {
        alias: string;
        callback: Function;
        params: Request;
        routes: NodeRoute[];
        rootRerouting: boolean;
    }

    /**
     * Contract for entry handler.
     */
    export interface Options {
        mode?: string;
        root?: string;
        rerouting?: boolean;
    }
    
    export interface ParsedPath {
        path: string;
        query: Object;
        queryString: string;
    }

    /**
     * Contract for object param.
     */
    export interface Request extends ParsedPath {
        params?: Object;
    }

    export interface PathExpToken {
        name: string;
        prefix: string;
        delimiter: string;
        optional: boolean;
        repeat: boolean;
        pattern: string;
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
    const _DEF_OPTIONS: Options = { mode: 'hash', root: '/', rerouting: true };


    /**
     * The main path matching regexp utility.
     * @type {RegExp} path regexp.
     */
    const PATH_STRIPPER = new RegExp([
    // Match escaped characters that would otherwise appear in future matches.
    // This allows the user to escape special characters that won't transform.
        '(\\\\.)',
    // Match Express-style parameters and un-named parameters with a prefix
    // and optional suffixes. Matches appear as:
    //
    // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
    // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
    // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
        '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
    ].join('|'), 'g');

    // Cached regex for stripping a leading hash/slash and trailing space.
    const ROUTE_STRIPPER = /^[#\/]|\s+$/g;

    // Cached regex for stripping urls of hash.
    const HASH_STRIPPER = /#.*$/;


    class RouteHelper {             

        /**
         * Escape a regular expression string.
         * @param  {String} str the string to scape
         * @return {String} the escaped string
         */
        private static _escapeString(str: string): string {
            return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1');
        }

        /**
         * Escape the capturing group by escaping special characters and meaning.
         * @param  {String} group the group to escape
         * @return {String} escaped group.
         */
        private static _escapeGroup(group: string): string {
            return group.replace(/([=!:$\/()])/g, '\\$1');
        }

        static _clearSlashes(path: string): string {
            return path.replace(/\/$/, '').replace(/^\//, '');
        }

        /**
         * Get the flags for a regexp from the options.
         * @param  {Object} opts the options object for building the flags.
         * @return {String} flags.
         */
        private static _flags(opts: Object): string {
            return opts['sensitive'] ? '' : 'i';
        }        
        
        /**
         * Parse a string for the raw tokens.
         * @param  {String} str
         * @return {Array} tokens.
         */
        private static _parse(str: string): any[] {

            const tokens: any[] = [];
            let key = 0;
            let index = 0;
            let path = '';
            let res: RegExpExecArray;

            while ((res = PATH_STRIPPER.exec(str))) {

                const m = res[0];
                const escaped = res[1];
                const offset = res.index;

                path += str.slice(index, offset);
                index = offset + m.length;

                // Ignore already escaped sequences.
                if (escaped) {
                    path += escaped[1];
                    continue;
                }

                // Push the current path onto the tokens.
                if (path) {
                    tokens.push(path);
                    path = '';
                }

                const prefix = res[2];
                const name = res[3];
                const capture = res[4];
                const group = res[5];
                const suffix = res[6];
                const asterisk = res[7];

                const repeat = suffix === '+' || suffix === '*';
                const optional = suffix === '?' || suffix === '*';
                const delimiter = prefix || '/';
                const pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?');

                tokens.push({
                    name: name || (key++).toString(),
                    prefix: prefix || '',
                    delimiter: delimiter,
                    optional: optional,
                    repeat: repeat,
                    pattern: RouteHelper._escapeGroup(pattern)
                });
            }

            // Match any characters still remaining.
            if (index < str.length) {
                path += str.substr(index);
            }

            // If the path exists, push it onto the end.
            if (path) {
                tokens.push(path);
            }

            return tokens;
        }

        /**
         * Expose a function for taking tokens and returning a RegExp.
         * @param  {Array}  tokens
         * @param  {Object} options
         * @return {RegExp} the regexp.
         */
        private static _tokensToPathExp(tokens: string[], options: Object = {}): PathExp {

            const strict = options['strict'];
            const end = options['end'] !== false;
            let route = '';
            const lastToken = tokens[tokens.length - 1];
            const endsWithSlash = typeof lastToken === 'string' && lastToken.length && lastToken.charAt(lastToken.length - 1) === '/';

            // Iterate over the tokens and create our regexp string.
            for (let i = 0; i < tokens.length; i++) {

                const token: any = tokens[i];

                if (typeof token === 'string') {
                    route += RouteHelper._escapeString(token);
                } else {

                    const prefix = RouteHelper._escapeString(token.prefix);
                    let capture = token.pattern;

                    if (token.repeat) {
                        capture += '(?:' + prefix + capture + ')*';
                    }

                    if (token.optional) {
                        if (prefix) {
                            capture = '(?:' + prefix + '(' + capture + '))?';
                        } else {
                            capture = '(' + capture + ')?';
                        }
                    } else {
                        capture = prefix + '(' + capture + ')';
                    }

                    route += capture;
                }
            }

            // In non-strict mode we allow a slash at the end of match. If the path to
            // match already ends with a slash, we remove it for consistency. The slash
            // is valid at the end of a path match, not in the middle. This is important
            // in non-ending mode, where "/test/" shouldn't match "/test//route".
            if (!strict) {
                route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
            }

            if (end) {
                route += '$';
            } else {
                // In non-ending mode, we need the capturing groups to match as much as
                // possible by using a positive lookahead to the end or next path segment.
                route += strict && endsWithSlash ? '' : '(?=\\/|$)';
            }

            return new RegExp('^' + route, RouteHelper._flags(options));
        }
        
        static parseSearchString(search: string): Object {
            const searchParams = {};
            if (search.charAt(0) === '?') {
                search = search.slice(1);                    
            }
            const paramsArr = search.split('&');
            for (let i = 0; i < paramsArr.length; i++) {
                const pair = paramsArr[i].split('=');
                searchParams[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            }
            return searchParams;
        }
        
        static parsePath(path: string): ParsedPath {
            
            path = RouteHelper._clearSlashes(path);
            
            let parser: any;
            
            if (typeof _global.URL === 'function') {
                parser = new _global.URL(path, 'http://example.com');
            } else {
                parser = document.createElement('a');
                parser.href = 'http://example.com/' + path;
            }                                   
            
            return {               
                path: parser.pathname,
                query: RouteHelper.parseSearchString(parser.search),
                queryString: parser.search                
            };
        }           
        
        /**
         * Given a route, and a path that it matches, return the object of
         * extracted decoded parameters.
         * @param {string} path The uri's path part.
         * @param {PathExp} route The alias         
         * @returns {NavigationParams} the extracted parameters
         * @private
         */
        static extractRequest(path: string, pathExp: PathExp): Request {
            
            const request: Request = RouteHelper.parsePath(path);   
            request.params = {};        

            const result = pathExp.exec(request.path);

            if (!result) {
                return request;
            }

            const args = result.slice(1);
            const keys = pathExp.keys;                        

            for (let i = 0; i < args.length; i++) {
                request.params[keys[i].name] = _global.decodeURIComponent(args[i]);
            }

            return request;
        }

        /**
         * Create a path regexp from string input.
         * @param  {String} path
         * @param  {Object} options
         * @return {RegExp} the regexp
         */
        static stringToPathExp(path: string, options?: Object): PathExp {

            const tokens = RouteHelper._parse(path);

            const pathExp = RouteHelper._tokensToPathExp(tokens, options);  
            
            const keys: PathExpToken[] = [];                     

            // Attach keys back to the regexp.
            for (let i = 0; i < tokens.length; i++) {
                if (typeof tokens[i] !== 'string') {
                    keys.push(tokens[i]);
                }
            }

            pathExp.keys = keys;

            return pathExp;
        }                                     
    }


    export class RoutingLevel {

        _routes: Route[] = [];
        _options: Options = {};

        constructor(_options: Options = {}) {
            this.config(_options);
        }

        config(options: Options): RoutingLevel {
            for (let prop in _DEF_OPTIONS) {
                if (options[prop] !== undefined) {
                    this._options[prop] = options[prop];
                } else if (this._options[prop] === undefined) {
                    this._options[prop] = _DEF_OPTIONS[prop];
                }
            }
            return this;
        }

        add(path: any, callback?: Function): RoutingLevel {

            let re: PathExp;

            // If default route.
            if (typeof path === 'function') {
                callback = path;
                re = /.*/;
            } else {
                re = RouteHelper.stringToPathExp(path);
            }

            this._routes.push({
                path: re,
                callback: callback,
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

                    const params = RouteHelper.extractRequest(fragment, route.path);
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

        to(alias: string): RoutingLevel {
            let subrouter: RoutingLevel;
            for (let i = 0; i < this._routes.length; i++) {
                const route = this._routes[i];
                if (alias === route.alias) {
                    subrouter = route.facade;
                    if (!subrouter) {
                        subrouter = new RoutingLevel(this._options);
                        route.facade = subrouter;
                    }
                    break;
                }
            }
            return subrouter;
        }
    }


    export class Router {

        private static facade = new RoutingLevel();
        private static _eventHandlers: EventHandler = {};
        private static _lastURL = '';
        private static _listening = false;

        static drop(): RoutingLevel {
            Router._lastURL = '';
            Router.off();
            return Router.facade.drop();
        }

        static _listen() {
            if (Router._listening) {
                throw new Error('Prouter already listening');
            }
            _global.addEventListener('hashchange', () => {
                const current = Router.getCurrent();
                Router.check(current);
            }, false);
            _global.addEventListener('popstate', (evt: PopStateEvent) => {
                if (evt.state !== null && evt.state !== undefined) {
                    const current = Router.getCurrent();
                    Router.check(current);
                }
            }, false);
            Router._listening = true;
        }

        static check(path: string): RoutingLevel {
            const nodeRoutes = Router.facade.check(path, [], Router._lastURL);
            Router._apply(nodeRoutes);
            return Router.facade;
        }

        static navigate(path: string): RoutingLevel {
            const mode = Router.facade._options.mode;
            switch (mode) {
                case 'history':
                    _global.history.pushState(null, null, Router.facade._options.root + RouteHelper._clearSlashes(path));
                    break;
                case 'hash':
                    _global.location.href = _global.location.href.replace(/#(.*)$/, '') + '#' + path;
                    break;
                case 'node':
                    Router._lastURL = path;
                    break;
            }
            return Router.facade;
        }

        static route(path: string): boolean {            
            const current = Router.getCurrent();
            const next = Router.trigger('route:before', path, current);
            console.log('route current', current);
            if (next === false) {
                return false;
            }            
            Router.check(path);
            Router.navigate(path);            
            Router.trigger('route:after', path, current);
            console.log('route path', path);
            return true;
        }

        static config(options: Options): RoutingLevel {
            return Router.facade.config(options);
        }

        static to(alias: string): RoutingLevel {
            return Router.facade.to(alias);
        }

        static add(path: any, callback?: Function): RoutingLevel {
            return Router.facade.add(path, callback);
        }

        static remove(alias: string): RoutingLevel {
            return Router.facade.remove(alias);
        }

        static getCurrent(): string {

            const mode = Router.facade._options.mode;
            const root = Router.facade._options.root;
            let fragment: string;

            if (mode === 'history') {
                fragment = RouteHelper._clearSlashes(_global.decodeURI(_global.location.pathname + _global.location.search));
                fragment = fragment.replace(/\?(.*)$/, '');
                fragment = root !== '/' ? fragment.replace(root, '') : fragment;
                fragment = RouteHelper._clearSlashes(fragment);
            } else if (mode === 'hash') {
                const match = _global.location.href.match(/#(.*)$/);
                fragment = match ? match[1] : '';
                fragment = RouteHelper._clearSlashes(fragment);
            } else {
                fragment = Router._lastURL;
            }

            return fragment;
        }
    
        /**
         * Add event listener.
         * @param {string} evt Name of the event.
         * @param {Function} callback Method.
         * @returns {History} this history
         */
        static on(evt: string, callback: Function): Router {
            if (Router._eventHandlers[evt] === undefined) {
                Router._eventHandlers[evt] = [];
            }
            Router._eventHandlers[evt].push(callback);
            return Router;
        }

        /**
         * Remove event listener.
         * @param {string} evt Name of the event.
         * @param {Function} callback Method.
         * @returns {History} this history
         */
        static off(evt?: string, callback?: Function): Router {
            if (evt === undefined) {
                Router._eventHandlers = {};
            } else if (Router._eventHandlers[evt]) {
                if (callback) {
                    const callbacks = Router._eventHandlers[evt];
                    for (let i = 0; i < callbacks.length; i++) {
                        if (callbacks[i] === callback) {
                            callbacks.splice(i, 1);
                        }
                    }
                    if (callbacks.length === 0) {
                        delete Router._eventHandlers[evt];
                    }
                } else {
                    delete Router._eventHandlers[evt];
                }
            }
            return Router;
        }
    
        /**
         * Events triggering.
         * @param {string} evt Name of the event being triggered.
         * @return {boolean} null if not suscriptors, false if the event was cancelled for some suscriptor, true otherwise.
         */
        static trigger(evt: string, ...restParams: any[]): boolean {
            const callbacks = Router._eventHandlers[evt];
            if (!callbacks || !callbacks.length) {
                return null;
            }
            for (let i = 0; i < callbacks.length; i++) {
                const respIt = callbacks[i].apply(null, restParams);          
                // check if some listener cancelled the event.
                if (respIt === false) {
                    return false;
                }
            }
            return true;
        }

        private static _applyNested(nodeRoutes: NodeRoute[]): Function {
            return function(param: any) {
                if (typeof param === 'string') {
                    Router.route(param);
                } else if (nodeRoutes && nodeRoutes.length) {
                    Router._apply(nodeRoutes);
                }
            };
        }

        private static _apply(nodeRoutes: NodeRoute[]) {
            let falseToReject: boolean;
            for (let i = 0; i < nodeRoutes.length; i++) {
                const nodeRoute = nodeRoutes[i];
                if (nodeRoute.rootRerouting) {
                    falseToReject = nodeRoute.callback.call(null, nodeRoute.params);
                }
                Router._applyNested(nodeRoute.routes)(falseToReject);
            }
        }
    }


    Router._listen();

}