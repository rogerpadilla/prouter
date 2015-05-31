module prouter {

    export interface PathExp extends RegExp {
        keys?: PathExpToken[];
    }

    /**
     * Contract for entry handler.
     */
    export interface Handler {
        path: PathExp;
        activate: Function;
    }
    
    /**
     * Contract for entry handler.
     */
    export interface NodeRoute {
        activate: Function;
        request: Request;
    }

    /**
     * Contract for entry handler.
     */
    export interface Options {
        mode?: string;
        root?: string;
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
        old?: string;
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

    const _MODES = ['hash', 'history'];
    const _DEF_OPTIONS: Options = { mode: 'hash', root: '/' };


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

        static clearSlashes(path: string): string {
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
         * @param  {String} path
         * @return {Array} tokens.
         */
        private static _parse(path: string): any[] {

            const tokens: any[] = [];
            let key = 0;
            let index = 0;
            let pathIt = '';
            let res: RegExpExecArray;

            while ((res = PATH_STRIPPER.exec(path))) {

                const m = res[0];
                const escaped = res[1];
                const offset = res.index;

                pathIt += path.slice(index, offset);
                index = offset + m.length;

                // Ignore already escaped sequences.
                if (escaped) {
                    pathIt += escaped[1];
                    continue;
                }

                // Push the current path onto the tokens.
                if (pathIt) {
                    tokens.push(pathIt);
                    pathIt = '';
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
            if (index < path.length) {
                pathIt += path.substr(index);
            }

            // If the path exists, push it onto the end.
            if (pathIt) {
                tokens.push(pathIt);
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

            let parser: any;

            if (typeof _global.URL === 'function') {
                parser = new _global.URL(path, 'http://example.com');
            } else {
                parser = document.createElement('a');
                parser.href = 'http://example.com/' + path;
            }

            const parsedPath: ParsedPath = {
                path: RouteHelper.clearSlashes(parser.pathname),
                query: RouteHelper.parseSearchString(parser.search),
                queryString: parser.search
            };

            return parsedPath;
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
                if (args[i] !== undefined) {
                    request.params[keys[i].name] = _global.decodeURIComponent(args[i]);
                }
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


    export class Router {

        private static _handlers: Handler[] = [];
        private static _options: Options = {};
        private static _listening = false;

        static listen(options: Options): Router {
            if (this._listening) {
                throw new Error('Router already listening.');
            }
            this._listening = true;
            this.config(options);
            if (this._options.mode === 'history') {
                _global.addEventListener('popstate', this._loadCurrent, false);
            } else {
                _global.addEventListener('hashchange', this._loadCurrent, false);
            }
            return this;
        }

        static config(options: Options): Router {
            for (let prop in _DEF_OPTIONS) {
                if (options[prop] !== undefined) {
                    this._options[prop] = options[prop];
                } else if (this._options[prop] === undefined) {
                    this._options[prop] = _DEF_OPTIONS[prop];
                }
            }
            return this;
        }

        static reset(): Router {
            if (this._options.mode === 'history') {
                _global.removeEventListener('popstate', this._loadCurrent, false);
                _global.history.pushState(null, null, this._options.root);
            } else {
                _global.removeEventListener('hashchange', this._loadCurrent, false);
                _global.location.hash = '#';
            }
            this._handlers = [];
            this._listening = false;
            return this;
        }

        static use(path: any, activate?: any) {

            let pathExp: PathExp;

            // If default route.
            if (typeof path === 'function') {
                activate = path;
                pathExp = /.*/;
            } else {
                path = RouteHelper.clearSlashes(path);
                pathExp = RouteHelper.stringToPathExp(path);
            }

            this._handlers.push({
                path: pathExp,
                activate: activate
            });
        }

        static getCurrent(): string {

            const mode = this._options.mode;
            const root = this._options.root;
            let fragment: string;

            if (mode === 'history') {
                fragment = RouteHelper.clearSlashes(_global.decodeURI(_global.location.pathname + _global.location.search));
                fragment = fragment.replace(/\?(.*)$/, '');
                fragment = root !== '/' ? fragment.replace(root, '') : fragment;
            } else {
                const match = _global.location.href.match(/#(.*)$/);
                fragment = match ? match[1] : '';
            }

            fragment = RouteHelper.clearSlashes(fragment);

            return fragment;
        }

        static navigate(path: string): Router {

            path = RouteHelper.clearSlashes(path);

            const mode = this._options.mode;

            switch (mode) {
                case 'history':
                    this._load(path);
                    _global.history.pushState(null, null, this._options.root + path);
                    break;
                case 'hash':
                    const oldPath = this.getCurrent();
                    // Force load since 'hashchange' event is not triggered if the path has not changed
                    if (path === oldPath) {
                        this._load(path);
                    }
                    _global.location.hash = '#' + path;
                    break;
            }

            return this;
        }

        private static _loadCurrent(): boolean {
            const path = this.getCurrent();
            return this._load(path);
        }

        private static _load(path: string): boolean {

            const nodeRoutes = this._obtainNodeRoutes(path);
            const nodeRoutesLength = nodeRoutes.length;
            const current = this.getCurrent();

            let count = 0;

            for (let i = 0; i < nodeRoutesLength; i++) {
                const nodeRoute = nodeRoutes[i];
                nodeRoute.request.old = current;
                const next = nodeRoute.activate.call(null, nodeRoute.request);
                if (next === false) {
                    break;
                } else {
                    count++;
                }
            }

            return count > 0;
        }

        private static _obtainNodeRoutes(fragment: string): NodeRoute[] {

            const parsedPath = RouteHelper.parsePath(fragment);

            const nodeRoutes: NodeRoute[] = [];

            for (let i = 0; i < this._handlers.length; i++) {

                const route = this._handlers[i];
                const match = parsedPath.path.match(route.path);

                if (match) {

                    const params = RouteHelper.extractRequest(fragment, route.path);

                    const nodeRoute: NodeRoute = {
                        activate: route.activate,
                        request: params
                    };

                    nodeRoutes.push(nodeRoute);
                }
            }

            return nodeRoutes;
        }
    }

    export class RouteGroup {
        private _handlers: Handler[] = [];
        use = Router.use;
    }
}