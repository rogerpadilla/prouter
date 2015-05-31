
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require, exports, module);
  } else {
    root.prouter = factory();
  }
}(this, function(require, exports, module) {

var prouter;
(function (prouter) {
    // Establish the root object, `window` (`self`) in the browser, or `global` on the server.
    // We use `self` instead of `window` for `WebWorker` support.
    var _global = (typeof self === 'object' && self.self === self && self) ||
        (typeof global === 'object' && global.global === global && global);
    var _MODES = ['node', 'hash', 'history'];
    var _DEF_OPTIONS = { mode: 'hash', root: '/', rerouting: true };
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
    // Cached regex for stripping a leading hash/slash and trailing space.
    var ROUTE_STRIPPER = /^[#\/]|\s+$/g;
    // Cached regex for stripping urls of hash.
    var HASH_STRIPPER = /#.*$/;
    var RouteHelper = (function () {
        function RouteHelper() {
        }
        /**
         * Escape a regular expression string.
         * @param  {String} str the string to scape
         * @return {String} the escaped string
         */
        RouteHelper._escapeString = function (str) {
            return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1');
        };
        /**
         * Escape the capturing group by escaping special characters and meaning.
         * @param  {String} group the group to escape
         * @return {String} escaped group.
         */
        RouteHelper._escapeGroup = function (group) {
            return group.replace(/([=!:$\/()])/g, '\\$1');
        };
        RouteHelper._clearSlashes = function (path) {
            return path.replace(/\/$/, '').replace(/^\//, '');
        };
        /**
         * Get the flags for a regexp from the options.
         * @param  {Object} opts the options object for building the flags.
         * @return {String} flags.
         */
        RouteHelper._flags = function (opts) {
            return opts['sensitive'] ? '' : 'i';
        };
        /**
         * Parse a string for the raw tokens.
         * @param  {String} str
         * @return {Array} tokens.
         */
        RouteHelper._parse = function (str) {
            var tokens = [];
            var key = 0;
            var index = 0;
            var path = '';
            var res;
            while ((res = PATH_STRIPPER.exec(str))) {
                var m = res[0];
                var escaped = res[1];
                var offset = res.index;
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
            if (index < str.length) {
                path += str.substr(index);
            }
            // If the path exists, push it onto the end.
            if (path) {
                tokens.push(path);
            }
            return tokens;
        };
        /**
         * Expose a function for taking tokens and returning a RegExp.
         * @param  {Array}  tokens
         * @param  {Object} options
         * @return {RegExp} the regexp.
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
                    route += RouteHelper._escapeString(token);
                }
                else {
                    var prefix = RouteHelper._escapeString(token.prefix);
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
        RouteHelper.parseSearchString = function (search) {
            var searchParams = {};
            if (search.charAt(0) === '?') {
                search = search.slice(1);
            }
            var paramsArr = search.split('&');
            for (var i = 0; i < paramsArr.length; i++) {
                var pair = paramsArr[i].split('=');
                searchParams[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            }
            return searchParams;
        };
        RouteHelper.parsePath = function (path) {
            path = RouteHelper._clearSlashes(path);
            var parser;
            if (typeof _global.URL === 'function') {
                parser = new _global.URL(path, 'http://example.com');
            }
            else {
                parser = document.createElement('a');
                parser.href = 'http://example.com/' + path;
            }
            return {
                path: parser.pathname,
                query: RouteHelper.parseSearchString(parser.search),
                queryString: parser.search
            };
        };
        /**
         * Given a route, and a path that it matches, return the object of
         * extracted decoded parameters.
         * @param {string} path The uri's path part.
         * @param {PathExp} route The alias
         * @returns {NavigationParams} the extracted parameters
         * @private
         */
        RouteHelper.extractRequest = function (path, pathExp) {
            var request = RouteHelper.parsePath(path);
            request.params = {};
            var result = pathExp.exec(request.path);
            if (!result) {
                return request;
            }
            var args = result.slice(1);
            var keys = pathExp.keys;
            for (var i = 0; i < args.length; i++) {
                request.params[keys[i].name] = _global.decodeURIComponent(args[i]);
            }
            return request;
        };
        /**
         * Create a path regexp from string input.
         * @param  {String} path
         * @param  {Object} options
         * @return {RegExp} the regexp
         */
        RouteHelper.stringToPathExp = function (path, options) {
            var tokens = RouteHelper._parse(path);
            var pathExp = RouteHelper._tokensToPathExp(tokens, options);
            var keys = [];
            // Attach keys back to the regexp.
            for (var i = 0; i < tokens.length; i++) {
                if (typeof tokens[i] !== 'string') {
                    keys.push(tokens[i]);
                }
            }
            pathExp.keys = keys;
            return pathExp;
        };
        return RouteHelper;
    })();
    var RoutingLevel = (function () {
        function RoutingLevel(_options) {
            if (_options === void 0) { _options = {}; }
            this._routes = [];
            this._options = {};
            this.config(_options);
        }
        RoutingLevel.prototype.config = function (options) {
            for (var prop in _DEF_OPTIONS) {
                if (options[prop] !== undefined) {
                    this._options[prop] = options[prop];
                }
                else if (this._options[prop] === undefined) {
                    this._options[prop] = _DEF_OPTIONS[prop];
                }
            }
            return this;
        };
        RoutingLevel.prototype.add = function (path, callback) {
            var re;
            // If default route.
            if (typeof path === 'function') {
                callback = path;
                re = /.*/;
            }
            else {
                re = RouteHelper.stringToPathExp(path);
            }
            this._routes.push({
                path: re,
                callback: callback,
                alias: path
            });
            return this;
        };
        RoutingLevel.prototype.remove = function (alias) {
            for (var i = this._routes.length - 1; i >= 0; i--) {
                var r = this._routes[i];
                if (alias === r.alias || alias === r.callback || alias === r.path) {
                    this._routes.splice(i, 1);
                }
            }
            return this;
        };
        RoutingLevel.prototype.check = function (fragment, nodeRoutes, lastURL) {
            for (var i = 0; i < this._routes.length; i++) {
                var route = this._routes[i];
                var match = fragment.match(route.path);
                if (match) {
                    var params = RouteHelper.extractRequest(fragment, route.path);
                    var shouldReroute = (fragment.slice(0, match[0].length) !== lastURL.slice(0, match[0].length));
                    var nodeRoute = {
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
        };
        RoutingLevel.prototype.drop = function () {
            this._routes = [];
            this.config(_DEF_OPTIONS);
            return this;
        };
        RoutingLevel.prototype.to = function (alias) {
            var subrouter;
            for (var i = 0; i < this._routes.length; i++) {
                var route = this._routes[i];
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
        };
        return RoutingLevel;
    })();
    prouter.RoutingLevel = RoutingLevel;
    var Router = (function () {
        function Router() {
        }
        Router.drop = function () {
            Router._lastURL = '';
            Router.off();
            return Router.facade.drop();
        };
        Router._listen = function () {
            if (Router._listening) {
                throw new Error('Prouter already listening');
            }
            _global.addEventListener('hashchange', function () {
                var current = Router.getCurrent();
                Router.check(current);
            }, false);
            _global.addEventListener('popstate', function (evt) {
                if (evt.state !== null && evt.state !== undefined) {
                    var current = Router.getCurrent();
                    Router.check(current);
                }
            }, false);
            Router._listening = true;
        };
        Router.check = function (path) {
            var nodeRoutes = Router.facade.check(path, [], Router._lastURL);
            Router._apply(nodeRoutes);
            return Router.facade;
        };
        Router.navigate = function (path) {
            var mode = Router.facade._options.mode;
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
        };
        Router.route = function (path) {
            var current = Router.getCurrent();
            var next = Router.trigger('route:before', path, current);
            console.log('route current', current);
            if (next === false) {
                return false;
            }
            Router.check(path);
            Router.navigate(path);
            Router.trigger('route:after', path, current);
            console.log('route path', path);
            return true;
        };
        Router.config = function (options) {
            return Router.facade.config(options);
        };
        Router.to = function (alias) {
            return Router.facade.to(alias);
        };
        Router.add = function (path, callback) {
            return Router.facade.add(path, callback);
        };
        Router.remove = function (alias) {
            return Router.facade.remove(alias);
        };
        Router.getCurrent = function () {
            var mode = Router.facade._options.mode;
            var root = Router.facade._options.root;
            var fragment;
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
            else {
                fragment = Router._lastURL;
            }
            return fragment;
        };
        /**
         * Add event listener.
         * @param {string} evt Name of the event.
         * @param {Function} callback Method.
         * @returns {History} this history
         */
        Router.on = function (evt, callback) {
            if (Router._eventHandlers[evt] === undefined) {
                Router._eventHandlers[evt] = [];
            }
            Router._eventHandlers[evt].push(callback);
            return Router;
        };
        /**
         * Remove event listener.
         * @param {string} evt Name of the event.
         * @param {Function} callback Method.
         * @returns {History} this history
         */
        Router.off = function (evt, callback) {
            if (evt === undefined) {
                Router._eventHandlers = {};
            }
            else if (Router._eventHandlers[evt]) {
                if (callback) {
                    var callbacks = Router._eventHandlers[evt];
                    for (var i = 0; i < callbacks.length; i++) {
                        if (callbacks[i] === callback) {
                            callbacks.splice(i, 1);
                        }
                    }
                    if (callbacks.length === 0) {
                        delete Router._eventHandlers[evt];
                    }
                }
                else {
                    delete Router._eventHandlers[evt];
                }
            }
            return Router;
        };
        /**
         * Events triggering.
         * @param {string} evt Name of the event being triggered.
         * @return {boolean} null if not suscriptors, false if the event was cancelled for some suscriptor, true otherwise.
         */
        Router.trigger = function (evt) {
            var restParams = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                restParams[_i - 1] = arguments[_i];
            }
            var callbacks = Router._eventHandlers[evt];
            if (!callbacks || !callbacks.length) {
                return null;
            }
            for (var i = 0; i < callbacks.length; i++) {
                var respIt = callbacks[i].apply(null, restParams);
                // check if some listener cancelled the event.
                if (respIt === false) {
                    return false;
                }
            }
            return true;
        };
        Router._applyNested = function (nodeRoutes) {
            return function (param) {
                if (typeof param === 'string') {
                    Router.route(param);
                }
                else if (nodeRoutes && nodeRoutes.length) {
                    Router._apply(nodeRoutes);
                }
            };
        };
        Router._apply = function (nodeRoutes) {
            var falseToReject;
            for (var i = 0; i < nodeRoutes.length; i++) {
                var nodeRoute = nodeRoutes[i];
                if (nodeRoute.rootRerouting) {
                    falseToReject = nodeRoute.callback.call(null, nodeRoute.params);
                }
                Router._applyNested(nodeRoute.routes)(falseToReject);
            }
        };
        Router.facade = new RoutingLevel();
        Router._eventHandlers = {};
        Router._lastURL = '';
        Router._listening = false;
        return Router;
    })();
    prouter.Router = Router;
    Router._listen();
})(prouter || (prouter = {}));

return prouter;

}));

//# sourceMappingURL=prouter.js.map