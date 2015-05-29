
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
    var _DEF_OPTIONS = { mode: 'hash', keys: true, root: '/', rerouting: true };
    // Caches for common regexp.
    var _OPTIONAL_PARAM = /\((.*?)\)/g;
    var _NAMED_PARAM = /(\(\?)?:\w+/g;
    var _SPLAT_PARAM = /\*\w+/g;
    var _ESCAPE_REG_EXP = /[\-{}\[\]+?.,\\\^$|#\s]/g;
    var RouteHelper = (function () {
        function RouteHelper() {
        }
        RouteHelper._extractKeys = function (path) {
            var keys = path.match(/:([^\/]+)/g);
            if (keys) {
                var resp = [];
                for (var i = 0; i < keys.length; i++) {
                    resp[i] = keys[i].replace(/[:\(\)]/g, '');
                }
                return resp;
            }
            return null;
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
            var resp = [];
            if (params) {
                var n = params.length - 1;
                for (var i = 0; i < n; i++) {
                    resp.push(params[i] || null);
                }
                resp.push(params[n] ? _global.decodeURIComponent(params[n]) : null);
            }
            return resp;
        };
        RouteHelper._parseQuery = function (qstr) {
            var query = {};
            var params = qstr.split('&');
            for (var i = 0; i < params.length; i++) {
                var pair = params[i].split('=');
                var prop = _global.decodeURIComponent(pair[0]);
                query[prop] = _global.decodeURIComponent(pair[1]);
            }
            return query;
        };
        RouteHelper._prepareArguments = function (parameters, keys) {
            var lastIndex = parameters.length - 1;
            var query = parameters[lastIndex];
            if (keys && keys.length) {
                var objectParam = {};
                for (var i = 0; i < keys.length; i++) {
                    objectParam[keys[i]] = parameters[i];
                }
                if (parameters[keys.length]) {
                    objectParam['query'] = RouteHelper._parseQuery(parameters[keys.length]);
                }
                parameters = [objectParam];
            }
            else if (query && query.indexOf('=') >= 0) {
                parameters[lastIndex] = RouteHelper._parseQuery(query);
            }
            return parameters;
        };
        return RouteHelper;
    })();
    var RoutingLevel = (function () {
        function RoutingLevel(_options) {
            if (_options === void 0) { _options = {}; }
            this._options = _options;
            this._routes = [];
            this.config(this._options);
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
            var keys;
            var re;
            // If default route.
            if (typeof path === 'function') {
                callback = path;
                re = /.*/;
            }
            else {
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
                    var params = RouteHelper._extractParameters(route.path, fragment);
                    var keys = this._options.keys ? route.keys : null;
                    params = RouteHelper._prepareArguments(params, keys);
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
            return Router._firstLevel.drop();
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
            var nodeRoutes = Router._firstLevel.check(path, [], Router._lastURL);
            Router._apply(nodeRoutes);
            return Router._firstLevel;
        };
        Router.navigate = function (path) {
            var mode = Router._firstLevel._options.mode;
            switch (mode) {
                case 'history':
                    _global.history.pushState(null, null, Router._firstLevel._options.root + RouteHelper._clearSlashes(path));
                    break;
                case 'hash':
                    _global.location.href = _global.location.href.replace(/#(.*)$/, '') + '#' + path;
                    break;
                case 'node':
                    Router._lastURL = path;
                    break;
            }
            return Router._firstLevel;
        };
        Router.route = function (path) {
            var current = Router.getCurrent();
            var next = Router.trigger('route:before', path, current);
            if (next === false) {
                return false;
            }
            if (Router._firstLevel._options.mode === 'node') {
                Router.check(path);
            }
            Router.navigate(path);
            Router.trigger('route:after', path, current);
            return true;
        };
        Router.config = function (options) {
            return Router._firstLevel.config(options);
        };
        Router.to = function (alias) {
            return Router._firstLevel.to(alias);
        };
        Router.add = function (path, callback) {
            return Router._firstLevel.add(path, callback);
        };
        Router.remove = function (alias) {
            return Router._firstLevel.remove(alias);
        };
        Router.getCurrent = function () {
            var mode = Router._firstLevel._options.mode;
            var root = Router._firstLevel._options.root;
            var fragment = Router._lastURL;
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
                    falseToReject = nodeRoute.callback.apply(null, nodeRoute.params);
                }
                Router._applyNested(nodeRoute.routes)(falseToReject);
            }
        };
        Router._firstLevel = new RoutingLevel();
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