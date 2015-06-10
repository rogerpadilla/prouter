/**
 * Unobtrusive, forward-thinking and lightweight JavaScript router library.
 */
module prouter {

    /**
     * Contracts for static type checking.
     */
    export interface Options {
        usePushState?: boolean;
        hashChange?: boolean;
        root?: string;
        silent?: boolean;
    }

    export interface Path {
        path: string;
        query: Object;
        queryString: string;
    }

    export interface PathExp extends RegExp {
        keys?: PathExpToken[];
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
        activate: Callback;
    }

    export interface GroupHandler {
        path: any;
        activate: Callback;
    }

    export interface Request extends Path {
        params?: any;
        oldPath?: string;
    }

    export interface RequestProcessor {
        request: Request;
        activate: Callback;
    }

    export interface Callback {
      (req?: Request): any;
    }

    /** @type {global} Allow accessing the global var in the IDE, only required for compilation. */
    declare const global: any;

    /**
     * Stablish the root object, `window` (`self`) in the browser, or `global` on the server.
     * We use `self` instead of `window` for `WebWorker` support.
     * @type {window} the root object
     */
    const _global = (typeof self === 'object' && self.self === self && self) ||
        (typeof global === 'object' && global.global === global && global);

    /** @type {RegExp} Cached regex for stripping out leading slashes. */
    const LEADING_SLASHES_STRIPPER = /^\/+|\/+$/;

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

    /** @type {RegExp} Cached regex for default route. */
    const DEF_ROUTE = /.*/;

    /** @type {Options} Default options for initializing the router. */
    const DEF_OPTIONS: Options = { hashChange: true, usePushState: false, root: '/', silent: false };


    /**
     * Collection of helpers for processing routes.
     */
    class RouteHelper {

        /**
         * Transform a query-string to an object.
         * @param  {string} search The query string.
         * @return {Object} The resulting object.
         */
        static parseQuery(queryString: string): Object {
            const searchParams = {};
            if (queryString.charAt(0) === '?') {
                queryString = queryString.slice(1);
            }
            const paramsArr = queryString.split('&');
            for (let i = 0; i < paramsArr.length; i++) {
                const pair = paramsArr[i].split('=');
                searchParams[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            }
            return searchParams;
        }

        /**
         * Transform a fragment to a Path object.
         * @param  {string} path The fragment to parse.
         * @return {Path} The resulting object.
         */
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
                query: RouteHelper.parseQuery(parser.search),
                queryString: parser.search
            };

            return parsedPath;
        }

        /**
         * Ensure the given string has leading slashes.
         * @param  {string} str The string.
         * @return {string} The string with leading slashes.
         */
        static ensureSlashes(str: string): string {
            if (str === '/') {
                return str;
            }
            if (str.charAt(0) !== '/') {
                str = '/' + str;
            }
            if (str.charAt(str.length - 1) !== '/') {
                str += '/';
            }
            return str;
        }

        /**
         * Escape a regular expression string.
         * @param  {String} str The string to scape
         * @return {String} The escaped string
         */
        static escapeString(str: string): string {
            return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1');
        }

        /**
         * Escape the capturing group by escaping special characters and meaning.
         * @param  {String} group The group to escape
         * @return {String} The escaped group.
         */
        private static _escapeGroup(group: string): string {
            return group.replace(/([=!:$\/()])/g, '\\$1');
        }

        /**
         * Removes leading slashes from the given string.
         * @param  {string} path The uri fragment.
         * @return {string} The string without leading slashes.
         */
        static clearSlashes(path: string): string {
            return path.replace(LEADING_SLASHES_STRIPPER, '');
        }

        /**
         * Get the flags for a regexp from the options.
         * @param  {Object} opts The options object for building the flags.
         * @return {String} The flags.
         */
        private static _flags(opts: Object): string {
            return opts['sensitive'] ? '' : 'i';
        }

        /**
         * Parse a string for the raw tokens.
         * @param  {String} path The fragment to pase.
         * @return {Array} The tokens the extracted tokens.
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
         * @param  {Array} tokens The array of tokens used to create the expression.
         * @param  {Object} [options] The configuration.
         * @return {PathExp} The resulting path expression.
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
                    route += RouteHelper.escapeString(token);
                } else {

                    const prefix = RouteHelper.escapeString(token.prefix);
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

        /**
         * Create a path regexp from string input.
         * @param  {String} path The given url fragment.
         * @param  {Object} [options] The configuration.
         * @return {PathExp} The resulting path expression.
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

    /**
     * Core component for the routing system.
     */
    export class Router {

        /** @type {string} Root path. */
        private static _root: string;
        /** @type {Handler[]} Handlers for the routing system. */
        private static _handlers: Handler[] = [];
        /** @type {string} Last loaded path. */
        private static _loadedPath: string;
        /** @type {boolean} Is hashChange desired? */
        private static _wantsHashChange: boolean;
        /** @type {boolean} Is pushState desired and supportted in the current browser? */
        private static _usePushState: boolean;

        /**
         * Start the routing system.
         * @param {Object = {}} [options] The initialization options for the Router.
         * @return {Router} The router.
         */
        static listen(options: Options = {}): Router {

            if (Router._root !== undefined && Router._root !== null) {
                throw new Error('Router already listening.');
            }

            for (let prop in DEF_OPTIONS) {
                if (options[prop] === undefined) {
                    options[prop] = DEF_OPTIONS[prop];
                }
            }

            Router._wantsHashChange = options.hashChange;
            Router._usePushState    = options.usePushState && !!(_global.history && _global.history.pushState);
            Router._root = RouteHelper.ensureSlashes(options.root);

            if (Router._usePushState) {
                addEventListener('popstate', Router.heedCurrent, false);
            } else if (Router._wantsHashChange) {
                addEventListener('hashchange', Router.heedCurrent, false);
            }

            if (!options.silent) {
                Router.heedCurrent();
            }

            return Router;
        }

        /**
         * Disable the route-change-handling and resets the Router's state, perhaps temporarily.
         * Not useful in a real app; but useful for unit testing.
         * @return {Router} The router.
         */
        static stop(): Router {
            removeEventListener('popstate', Router.heedCurrent, false);
            removeEventListener('hashchange', Router.heedCurrent, false);
            for (let propName in Router) {
                if (Router.hasOwnProperty(propName) && typeof Router[propName] !== 'function') {
                  Router[propName] = null;
                }
            }
            Router._handlers = [];
            return Router;
        }

        /**
         * Retrieve the current path without the root prefix.
         * @return {string} The current path.
         */
        static getCurrent(): string {

            let path: string;

            if (Router._usePushState || !Router._wantsHashChange) {
                path = decodeURI(location.pathname + location.search);
                // removes the root prefix from the path.
                path = path.slice(Router._root.length);
            } else {
                const match = location.href.match(/#(.*)$/);
                path = match ? match[1] : '';
            }

            path = RouteHelper.clearSlashes(path);

            return path;
        }

        /**
         * Add the given middleware as a handler for the given path (defaulting to any path).
         * @param {string|Callback|RouteGroup} path The fragment or the callback.
         * @param {Callback|RouteGroup} [activate] The activate callback or the group of routes.
         * @return {Router} The router.
         */
        static use(path: any, activate?: any): Router {

            if (activate instanceof RouteGroup || path instanceof RouteGroup) {
                let parentPath: string;
                if (path instanceof RouteGroup) {
                    activate = path;
                } else {
                    parentPath = RouteHelper.clearSlashes(path);
                }
                Router._handlers = Router._extractHandlers(parentPath, activate, Router._handlers);
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
                Router._handlers.push({ pathExp, activate });
            }

            return Router;
        }

        /**
         * Change the current path and load it.
         * @param {string} path The fragment to navigate to.
         * @returns {Router} The router.
         */
        static navigate(path: string): Router {

            if (Router._root === undefined || Router._root === null) {
                throw new Error("It is required to call the 'listen' function before navigating.");
            }

            path = RouteHelper.clearSlashes(path);

            if (Router._usePushState) {
                history.pushState(null, null, Router._root + path);
            } else if (Router._wantsHashChange) {
                location.hash = '#' + path;
            } else {
                // If you've told us that you explicitly don't want fallback hashchange-
                // based history, then `navigate` becomes a page refresh.
                location.assign(Router._root + path);
                return true;
            }

            return Router.load(path);
        }

        /**
         * Load the current path only if it has not been already heeded.
         * @return {Router} The router.
         */
        static heedCurrent(): Router {
            const currentPath = Router.getCurrent();
            return currentPath === Router._loadedPath ? Router : Router.load(currentPath);
        }

        /**
         * Attempt to loads the handlers matching the given URL fragment.
         * @param {string} path The url fragment, e.g.: 'users/pinocho'
         * @returns {Router} The router.
         */
        static load(path: string): Router {

            const reqProcessors = Router._obtainRequestProcessors(path);

            if (reqProcessors.length) {

                let count = 0;

                /** Anonymous function used for processing nested callbacks. */
                function next() {

                    if (count >= reqProcessors.length) {
                        return;
                    }

                    const reqProc = reqProcessors[count];

                    count++;

                    reqProc.request.oldPath = Router._loadedPath;

                    const resp = reqProc.activate.call(null, reqProc.request, next);

                    if (resp === true) {
                        next();
                    }
                }

                next();
            }

            Router._loadedPath = path;

            return Router;
        }

        /**
         * Extract the handlers from the given arguments.
         * @param  {string} parentPath The parent path of the group of routes.
         * @param  {RouteGroup} routeGroup The group of routes.
         * @param  {Handler[]=[]} [handlers] The holder for extracted handlers.
         * @return {Handler[]} The extracted handlers.
         */
        private static _extractHandlers(parentPath: string, routeGroup: RouteGroup, handlers: Handler[] = []): Handler[] {

            const groupHandlers = routeGroup._handlers;

            for (let i = 0; i < groupHandlers.length; i++) {

                const itHandler = groupHandlers[i];
                let subPath: string;
                let activate: Callback;

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
         * Obtain the request processors for the given path according to the current handlers in the router.
         * @param  {string} path The url fragment to check.
         * @return {RequestProcessor[]} The obtained request processors.
         */
        private static _obtainRequestProcessors(path: string): RequestProcessor[] {

            const parsedPath = RouteHelper.parsePath(path);

            const requestProcessors: RequestProcessor[] = [];

            for (let i = 0; i < Router._handlers.length; i++) {

                const handler = Router._handlers[i];
                const match = handler.pathExp.test(parsedPath.path);

                if (match) {
                    const request = Router._extractRequest(path, handler.pathExp);
                    requestProcessors.push({ activate: handler.activate, request });
                }
            }

            return requestProcessors;
        }

        /**
         * Extract a request from the given arguments, using decoded parameters.
         * @param {string} path The url fragment.
         * @param {PathExp} [pathExp] The path expression.
         * @returns {Request} The extracted request.
         */
        private static _extractRequest(path: string, pathExp?: PathExp): Request {

            const request: Request = RouteHelper.parsePath(path);
            request.params = {};

            const result = pathExp.exec(request.path);
            const args = result.slice(1);
            const keys = pathExp.keys;

            for (let i = 0; i < args.length; i++) {
                if (args[i] !== undefined) {
                    request.params[keys[i].name] = decodeURIComponent(args[i]);
                }
            }

            return request;
        }
    }

    /**
     * Allows to use a group of routes as middleware.
     */
    export class RouteGroup {

        /** @type {GroupHandler[]} The list of handlers for this group. */
        _handlers: GroupHandler[] = [];

        /**
         * Add the given middleware function as handler for the given path (defaulting to any path).
         * @param {string|Callback} path The fragment or the callback.
         * @param {Callback} [activate] The activate callback.
         * @return {RouteGroup} The router group.
         */
        use(path: any, activate?: Callback): RouteGroup {
            this._handlers.push({ path, activate });
            return this;
        }
    }

}
