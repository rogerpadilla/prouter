/**
 * Unobtrusive, forward-thinking and lightweight JavaScript router library.
 */
var prouter;
(function (prouter) {
    /**
     * Stablish the root object, `window` (`self`) in the browser, or `global` on the server.
     * We use `self` instead of `window` for `WebWorker` support.
     * @type {window} the root object
     */
    var _global = (typeof self === 'object' && self.self === self && self) ||
        (typeof global === 'object' && global.global === global && global);
    /** @type {RegExp} Cached regex for stripping out leading slashes. */
    var LEADING_SLASHES_STRIPPER = /^\/+|\/+$/;
    /** @type {RegExp} Cached regex for default route. */
    var DEF_ROUTE = /.*/;
    /** @type {Options} Default options for initializing the router. */
    var DEF_OPTIONS = { hashChange: true, usePushState: false, root: '/', silent: false };
    /**
     * The main path matching regexp utility.
     * @type {RegExp} path regexp.
     */
    var PATH_STRIPPER = new RegExp([
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
    /**
     * Collection of helpers for processing routes.
     */
    var RouteHelper = (function () {
        function RouteHelper() {
        }
        /**
         * Transform a query-string to an object.
         * @param  {string} search The query string.
         * @return {Object} The resulting object.
         */
        RouteHelper.parseQuery = function (queryString) {
            var searchParams = {};
            if (queryString.charAt(0) === '?') {
                queryString = queryString.slice(1);
            }
            var paramsArr = queryString.split('&');
            for (var i = 0; i < paramsArr.length; i++) {
                var pair = paramsArr[i].split('=');
                searchParams[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            }
            return searchParams;
        };
        /**
         * Transform a fragment to a Path object.
         * @param  {string} path The fragment to parse.
         * @return {Path} The resulting object.
         */
        RouteHelper.parsePath = function (path) {
            var parser;
            if (typeof _global.URL === 'function') {
                parser = new _global.URL(path, 'http://example.com');
            }
            else {
                parser = document.createElement('a');
                parser.href = 'http://example.com/' + path;
            }
            var parsedPath = {
                path: RouteHelper.clearSlashes(parser.pathname),
                query: RouteHelper.parseQuery(parser.search),
                queryString: parser.search
            };
            return parsedPath;
        };
        /**
         * Ensure the given string has leading slashes.
         * @param  {string} str The string.
         * @return {string} The string with leading slashes.
         */
        RouteHelper.ensureSlashes = function (str) {
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
        };
        /**
         * Escape a regular expression string.
         * @param  {String} str The string to scape
         * @return {String} The escaped string
         */
        RouteHelper.escapeString = function (str) {
            return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1');
        };
        /**
         * Escape the capturing group by escaping special characters and meaning.
         * @param  {String} group The group to escape
         * @return {String} The escaped group.
         */
        RouteHelper._escapeGroup = function (group) {
            return group.replace(/([=!:$\/()])/g, '\\$1');
        };
        /**
         * Removes leading slashes from the given string.
         * @param  {string} path The uri fragment.
         * @return {string} The string without leading slashes.
         */
        RouteHelper.clearSlashes = function (path) {
            return path.replace(LEADING_SLASHES_STRIPPER, '');
        };
        /**
         * Get the flags for a regexp from the options.
         * @param  {Object} opts The options object for building the flags.
         * @return {String} The flags.
         */
        RouteHelper._flags = function (opts) {
            return opts['sensitive'] ? '' : 'i';
        };
        /**
         * Parse a string for the raw tokens.
         * @param  {String} path The fragment to pase.
         * @return {Array} The tokens the extracted tokens.
         */
        RouteHelper._parse = function (path) {
            var tokens = [];
            var key = 0;
            var index = 0;
            var pathIt = '';
            var res;
            while ((res = PATH_STRIPPER.exec(path))) {
                var m = res[0];
                var escaped = res[1];
                var offset = res.index;
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
                var prefix = res[2];
                var name_1 = res[3];
                var capture = res[4];
                var group = res[5];
                var suffix = res[6];
                var asterisk = res[7];
                var repeat = suffix === '+' || suffix === '*';
                var optional = suffix === '?' || suffix === '*';
                var delimiter = prefix || '/';
                var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?');
                tokens.push({
                    name: name_1 || (key++).toString(),
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
        };
        /**
         * Expose a function for taking tokens and returning a RegExp.
         * @param  {Array} tokens The array of tokens used to create the expression.
         * @param  {Object} [options] The configuration.
         * @return {PathExp} The resulting path expression.
         */
        RouteHelper._tokensToPathExp = function (tokens, options) {
            if (options === void 0) { options = {}; }
            var strict = options['strict'];
            var end = options['end'] !== false;
            var route = '';
            var lastToken = tokens[tokens.length - 1];
            var endsWithSlash = typeof lastToken === 'string' && lastToken.length && lastToken.charAt(lastToken.length - 1) === '/';
            // Iterate over the tokens and create our regexp string.
            for (var i = 0; i < tokens.length; i++) {
                var token = tokens[i];
                if (typeof token === 'string') {
                    route += RouteHelper.escapeString(token);
                }
                else {
                    var prefix = RouteHelper.escapeString(token.prefix);
                    var capture = token.pattern;
                    if (token.repeat) {
                        capture += '(?:' + prefix + capture + ')*';
                    }
                    if (token.optional) {
                        if (prefix) {
                            capture = '(?:' + prefix + '(' + capture + '))?';
                        }
                        else {
                            capture = '(' + capture + ')?';
                        }
                    }
                    else {
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
            }
            else {
                // In non-ending mode, we need the capturing groups to match as much as
                // possible by using a positive lookahead to the end or next path segment.
                route += strict && endsWithSlash ? '' : '(?=\\/|$)';
            }
            return new RegExp('^' + route, RouteHelper._flags(options));
        };
        /**
         * Create a path regexp from string input.
         * @param  {String} path The given url fragment.
         * @param  {Object} [options] The configuration.
         * @return {PathExp} The resulting path expression.
         */
        RouteHelper.stringToPathExp = function (path, options) {
            var tokens = RouteHelper._parse(path);
            var pathExp = RouteHelper._tokensToPathExp(tokens, options);
            pathExp.keys = [];
            // Attach keys back to the regexp.
            for (var i = 0; i < tokens.length; i++) {
                if (typeof tokens[i] !== 'string') {
                    pathExp.keys.push(tokens[i]);
                }
            }
            return pathExp;
        };
        return RouteHelper;
    })();
    /**
     * Core component for the routing system.
     */
    var Router = (function () {
        function Router() {
        }
        /**
         * Start the routing system, returning `true` if the current URL was loaded for some handler,
         * and `false` otherwise.
         * @param {Object = {}} [options] The initialization options for the Router.
         * @return {boolean} true if the current fragment matched some handler, false otherwise.
         */
        Router.listen = function (options) {
            if (options === void 0) { options = {}; }
            if (this._root !== undefined && this._root !== null) {
                throw new Error('Router already listening.');
            }
            for (var prop in DEF_OPTIONS) {
                if (options[prop] === undefined) {
                    options[prop] = DEF_OPTIONS[prop];
                }
            }
            this._wantsHashChange = options.hashChange;
            this._usePushState = options.usePushState && !!(_global.history && _global.history.pushState);
            this._root = RouteHelper.ensureSlashes(options.root);
            this._handlers = [];
            if (this._usePushState) {
                addEventListener('popstate', this.heedCurrent, false);
            }
            else if (this._wantsHashChange) {
                addEventListener('hashchange', this.heedCurrent, false);
            }
            var loaded = false;
            if (!options.silent) {
                loaded = this.heedCurrent();
            }
            return loaded;
        };
        /**
         * Disable the route-change-handling and resets the Router's state, perhaps temporarily.
         * Not useful in a real app; but useful for unit testing.
         * @return {Router} The router.
         */
        Router.stop = function () {
            removeEventListener('popstate', this.heedCurrent, false);
            removeEventListener('hashchange', this.heedCurrent, false);
            for (var propName in this) {
                if (this.hasOwnProperty(propName) && typeof this[propName] !== 'function') {
                    this[propName] = null;
                }
            }
            return this;
        };
        /**
         * Retrieve the current path without the root prefix.
         * @return {string} The current path.
         */
        Router.getCurrent = function () {
            var path;
            if (this._usePushState || !this._wantsHashChange) {
                path = decodeURI(location.pathname + location.search);
                // removes the root prefix from the path.
                path = path.slice(this._root.length);
            }
            else {
                var match = location.href.match(/#(.*)$/);
                path = match ? match[1] : '';
            }
            path = RouteHelper.clearSlashes(path);
            return path;
        };
        /**
         * Add the given middleware as a handler for the given path (defaulting to any path).
         * @param {string|Function|RouteGroup} path The fragment or the callback.
         * @param {Function|RouteGroup} [activate] The activate callback or the group of routes.
         * @return {Router} The router.
         */
        Router.use = function (path, activate) {
            if (activate instanceof RouteGroup || path instanceof RouteGroup) {
                var parentPath;
                if (path instanceof RouteGroup) {
                    activate = path;
                }
                else {
                    parentPath = RouteHelper.clearSlashes(path);
                }
                this._handlers = this._extractHandlers(parentPath, activate);
            }
            else {
                var pathExp;
                // If default route.
                if (typeof path === 'function') {
                    activate = path;
                    pathExp = DEF_ROUTE;
                }
                else {
                    path = RouteHelper.clearSlashes(path);
                    pathExp = RouteHelper.stringToPathExp(path);
                }
                this._handlers.push({ pathExp: pathExp, activate: activate });
            }
            return this;
        };
        /**
         * Change the current path and load it.
         * @param {string} path The fragment to navigate to.
         * @returns {boolean} true if the path matched some handler, false otherwise.
         */
        Router.navigate = function (path) {
            if (this._root === undefined || this._root === null) {
                throw new Error("It is required to call the 'listen' function before navigating.");
            }
            path = RouteHelper.clearSlashes(path);
            if (this._usePushState) {
                history.pushState(null, null, this._root + path);
            }
            else if (this._wantsHashChange) {
                location.hash = '#' + path;
            }
            else {
                // If you've told us that you explicitly don't want fallback hashchange-
                // based history, then `navigate` becomes a page refresh.
                location.assign(this._root + path);
                return true;
            }
            return this.load(path);
        };
        /**
         * Load the current path only if it has not been already heeded.
         * @return {boolean} true if loaded, false otherwise.
         */
        Router.heedCurrent = function () {
            var currentPath = this.getCurrent();
            return currentPath === this._loadedPath ? false : this.load(currentPath);
        };
        /**
         * Attempt to loads the handlers matching the given URL fragment.
         * @param {string} path The url fragment, e.g.: 'users/pinocho'
         * @returns {boolean} true if the fragment matched some handler, false otherwise.
         */
        Router.load = function (path) {
            var requestProcessors = this._obtainRequestProcessors(path);
            var count = 0;
            for (var i = 0; i < requestProcessors.length; i++) {
                var requestProcessor = requestProcessors[i];
                requestProcessor.request.oldPath = this._loadedPath;
                var next = requestProcessor.activate.call(null, requestProcessor.request);
                // If some of the handlers returns 'false', then stop propagation.
                if (next === false) {
                    break;
                }
                count++;
            }
            var navigated = count > 0;
            this._loadedPath = path;
            return navigated;
        };
        /**
         * Extract the handlers from the given arguments.
         * @param  {string} parentPath The parent path of the group of routes.
         * @param  {RouteGroup} routeGroup The group of routes.
         * @param  {Handler[]=[]} [handlers] The holder for extracted handlers.
         * @return {Handler[]} The extracted handlers.
         */
        Router._extractHandlers = function (parentPath, routeGroup, handlers) {
            if (handlers === void 0) { handlers = []; }
            var groupHandlers = routeGroup._handlers;
            for (var i = 0; i < groupHandlers.length; i++) {
                var itHandler = groupHandlers[i];
                var subPath = void 0;
                var activate = void 0;
                if (typeof itHandler.path === 'function') {
                    activate = itHandler.path;
                }
                else {
                    activate = itHandler.activate;
                    subPath = RouteHelper.clearSlashes(itHandler.path);
                }
                var pathExp = void 0;
                if (parentPath === undefined || subPath === undefined) {
                    if (parentPath === undefined && subPath === undefined) {
                        pathExp = DEF_ROUTE;
                    }
                    else if (parentPath === undefined) {
                        pathExp = RouteHelper.stringToPathExp(subPath);
                    }
                    else {
                        pathExp = RouteHelper.stringToPathExp(parentPath);
                    }
                }
                else {
                    var path = parentPath + '/' + subPath;
                    pathExp = RouteHelper.stringToPathExp(path);
                }
                handlers.push({ pathExp: pathExp, activate: activate });
            }
            return handlers;
        };
        /**
         * Obtain the request processors for the given path according to the current handlers in the router.
         * @param  {string} path The url fragment to check.
         * @return {RequestProcessor[]} The obtained request processors.
         */
        Router._obtainRequestProcessors = function (path) {
            var parsedPath = RouteHelper.parsePath(path);
            var requestProcessors = [];
            for (var i = 0; i < this._handlers.length; i++) {
                var handler = this._handlers[i];
                var match = handler.pathExp.test(parsedPath.path);
                if (match) {
                    var request = this._extractRequest(path, handler.pathExp);
                    var requestProcessor = { activate: handler.activate, request: request };
                    requestProcessors.push(requestProcessor);
                }
            }
            return requestProcessors;
        };
        /**
         * Extract a request from the given arguments, using decoded parameters.
         * @param {string} path The url fragment.
         * @param {PathExp} [pathExp] The path expression.
         * @returns {Request} The extracted request.
         */
        Router._extractRequest = function (path, pathExp) {
            var request = RouteHelper.parsePath(path);
            request.params = {};
            var result = pathExp.exec(request.path);
            var args = result.slice(1);
            var keys = pathExp.keys;
            for (var i = 0; i < args.length; i++) {
                if (args[i] !== undefined) {
                    request.params[keys[i].name] = decodeURIComponent(args[i]);
                }
            }
            return request;
        };
        return Router;
    })();
    prouter.Router = Router;
    // This function is used as callback for event listeners of different objects,
    // and we want to maintain its context linked to the Router instance.
    Router.heedCurrent = Router.heedCurrent.bind(Router);
    /**
     * Allows to use a group of routes as middleware.
     */
    var RouteGroup = (function () {
        function RouteGroup() {
            /** @type {GroupHandler[]} The list of handlers for this group. */
            this._handlers = [];
        }
        /**
         * Add the given middleware function as handler for the given path (defaulting to any path).
         * @param {string|Function} path The fragment or the callback.
         * @param {Function} [activate] The activate callback or the group of routes.
         * @return {RouteGroup} The router group.
         */
        RouteGroup.prototype.use = function (path, activate) {
            this._handlers.push({ path: path, activate: activate });
            return this;
        };
        return RouteGroup;
    })();
    prouter.RouteGroup = RouteGroup;
})(prouter || (prouter = {}));
//# sourceMappingURL=prouter.js.map