module prouter {

    export interface Options {
        mode?: string;
        root?: string;
    }

    export interface PathExp extends RegExp {
        keys?: PathExpToken[];
    }
    
    export interface Path {
        path: string;
        query: Object;
        queryString: string;
    }    

    export interface PathExpToken {
        name: string;
        prefix: string;
        delimiter: string;
        optional: boolean;
        repeat: boolean;
        pattern: string;
    }

    export interface Handler {
        pathExp: PathExp;
        activate: Function;
    }

    export interface GroupHandler {
        path: any;
        activate: Function;
    }
    
    export interface Param {
        [index: string]: string;
    }
    
    export interface Request extends Path {
        params?: Param;
        old?: string;
    }

    export interface RequestEvent {
        activate: Function;
        request: Request;
    }    

    declare const global: any;

    // Establish the root object, `window` (`self`) in the browser, or `global` on the server.
    // We use `self` instead of `window` for `WebWorker` support.
    const _global = (typeof self === 'object' && self.self === self && self) ||
        (typeof global === 'object' && global.global === global && global);

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
    
    // Cached regex for default route.
    const DEF_ROUTE = /.*/;


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
        private static _tokensToPathExp(tokens: any[], options: Object = {}): PathExp {

            const strict = options['strict'];
            const end = options['end'] !== false;
            let route = '';
            const lastToken = tokens[tokens.length - 1];
            const endsWithSlash = typeof lastToken === 'string' && lastToken.length && lastToken.charAt(lastToken.length - 1) === '/';

            // Iterate over the tokens and create our regexp string.
            for (let i = 0; i < tokens.length; i++) {

                const token = tokens[i];

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

        static parsePath(path: string): Path {

            let parser: any;

            if (typeof _global.URL === 'function') {
                parser = new _global.URL(path, 'http://example.com');
            } else {
                parser = document.createElement('a');
                parser.href = 'http://example.com/' + path;
            }

            const parsedPath: Path = {
                path: RouteHelper.clearSlashes(parser.pathname),
                query: RouteHelper.parseSearchString(parser.search),
                queryString: parser.search
            };

            return parsedPath;
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

            pathExp.keys = [];                   

            // Attach keys back to the regexp.
            for (let i = 0; i < tokens.length; i++) {
                if (typeof tokens[i] !== 'string') {
                    pathExp.keys.push(tokens[i]);
                }
            }

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
            switch (this._options.mode) {
                case 'history':
                    addEventListener('popstate', this._loadCurrent, false);
                    break;
                case 'hash':
                    addEventListener('hashchange', this._loadCurrent, false);
                    break;
                default:
                    throw new Error("Invalid mode '" + this._options.mode + "'. Valid modes are: 'history', 'hash'.");
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

        static stop(): Router {
            if (this._options.mode === 'history') {
                removeEventListener('popstate', this._loadCurrent, false);
                history.pushState(null, null, this._options.root);
            } else {
                removeEventListener('hashchange', this._loadCurrent, false);
                location.hash = '#';
            }
            this._handlers = [];
            this._listening = false;
            return this;
        }        

        static getCurrent(): string {
            
            let fragment: string;

            if (this._options.mode === 'history') {
                const root = this._options.root;
                fragment = RouteHelper.clearSlashes(decodeURI(location.pathname + location.search));
                fragment = fragment.replace(/\?(.*)$/, '');
                fragment = root !== '/' ? fragment.replace(root, '') : fragment;
            } else {
                const match = location.href.match(/#(.*)$/);
                fragment = match ? match[1] : '';
            }

            fragment = RouteHelper.clearSlashes(fragment);

            return fragment;
        }

        static navigate(path: string) {

            path = RouteHelper.clearSlashes(path);

            switch (this._options.mode) {
                case 'history':
                    this._load(path);
                    history.pushState(null, null, this._options.root + path);
                    break;
                case 'hash':
                    const oldPath = this.getCurrent();
                    // If the path has not changed, force _loadPath since the 'hashchange' event will not be triggered.
                    if (path === oldPath) {
                        this._load(path);
                    }
                    location.hash = '#' + path;
                    break;
            }
        }
        
        static use(path: any, activate?: any): Router {
            
            if (activate instanceof RouteGroup || path instanceof RouteGroup) {
                let parentPath: string;
                if (path instanceof RouteGroup) {
                    activate = path;
                } else {
                    parentPath = RouteHelper.clearSlashes(path);
                }
                this._handlers = this._obtainHandlers(parentPath, activate);
            } else {
                let pathExp: PathExp;
                // If default route.
                if (typeof path === 'function') {
                    activate = path;
                    pathExp = DEF_ROUTE;
                } else {
                    path = RouteHelper.clearSlashes(path);
                    pathExp = RouteHelper.stringToPathExp(path);
                }
                this._handlers.push({pathExp, activate});
            }
            
            return this;
        }

        private static _loadCurrent(): boolean {
            const path = this.getCurrent();
            return this._load(path);
        }

        private static _load(path: string): boolean {

            const requestProcessors = this._obtainRequestProcessors(path);
            const current = this.getCurrent();

            let count = 0;

            for (let i = 0; i < requestProcessors.length; i++) {
                const requestProcessor = requestProcessors[i];
                requestProcessor.request.old = current;
                const next = requestProcessor.activate.call(null, requestProcessor.request);
                if (next === false) {
                    break;
                } else {
                    count++;
                }
            }

            return count > 0;
        }                

        private static _obtainHandlers(parentPath: string, routeGroup: RouteGroup, handlers: Handler[] = []): Handler[] {

            const groupHandlers = routeGroup._handlers;

            for (let i = 0; i < groupHandlers.length; i++) {

                const itHandler = groupHandlers[i];
                let subPath: string;
                let activate: Function;

                if (typeof itHandler.path === 'function') {
                    activate = itHandler.path;
                } else {
                    activate = itHandler.activate;
                    subPath = RouteHelper.clearSlashes(itHandler.path);
                }

                let pathExp: PathExp;

                if (parentPath === undefined || subPath === undefined) {
                    if (parentPath === undefined && subPath === undefined) {
                        pathExp = DEF_ROUTE;
                    } else if (parentPath === undefined) {
                        pathExp = RouteHelper.stringToPathExp(subPath);
                    } else {
                        pathExp = RouteHelper.stringToPathExp(parentPath);
                    }
                } else {
                    const path = parentPath + '/' + subPath;
                    pathExp = RouteHelper.stringToPathExp(path);
                }

                handlers.push({ pathExp, activate });
            }

            return handlers;
        }
        
        /**
         * Given a route, and a path that it matches, return the object of
         * extracted decoded parameters.
         * @param {string} path The uri's path part.
         * @param {PathExp} route The alias         
         * @returns {NavigationParams} the extracted parameters
         * @private
         */
        private static _obtainRequest(path: string, pathExp: PathExp): Request {

            const request: Request = RouteHelper.parsePath(path);
            request.params = {};

            const result = pathExp ? pathExp.exec(request.path) : null;

            if (!result) {
                return request;
            }

            const args = result.slice(1);
            const keys = pathExp.keys;

            for (let i = 0; i < args.length; i++) {
                if (args[i] !== undefined) {
                    request.params[keys[i].name] = decodeURIComponent(args[i]);
                }
            }

            return request;
        }

        private static _obtainRequestProcessors(path: string): RequestEvent[] {

            const parsedPath = RouteHelper.parsePath(path);

            const requestProcessors: RequestEvent[] = [];

            for (let i = 0; i < this._handlers.length; i++) {

                const handler = this._handlers[i];
                const match = handler.pathExp.test(parsedPath.path);

                if (match) {

                    const request = this._obtainRequest(path, handler.pathExp);

                    const requestProcessor: RequestEvent = {activate: handler.activate, request};

                    requestProcessors.push(requestProcessor);
                }
            }

            return requestProcessors;
        }
    }


    export class RouteGroup {
        _handlers: GroupHandler[] = [];
        use(path: any, activate?: Function) {
            this._handlers.push({ path, activate });
        }
    }

}