(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports);
        global.prouter = mod.exports;
    }
})(this, function (exports) {
    /**
     * Unobtrusive, forward-thinking and lightweight JavaScript router library.
     */
    'use strict';

    var _global = typeof self === 'object' && self.self === self && self || typeof global === 'object' && global.global === global && global;
    var Resource = (function () {
        function Resource(path, query) {
            this.path = path;
            this.query = query;
            this._full = this.path;
            if (this.query !== undefined && this.query !== null && this.query !== '') {
                this._full += '?' + this.query;
            }
        }
        Object.defineProperty(Resource.prototype, 'full', {
            get: function get() {
                return this._full;
            },
            enumerable: true,
            configurable: true
        });
        return Resource;
    })();
    exports.Resource = Resource;
    var PATH_STRIPPER = new RegExp(['(\\\\.)', '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'].join('|'), 'g');
    var ROUTE_STRIPPER = /^[#\/]|\s+$/g;
    var HASH_STRIPPER = /#.*$/;
    var RouteHelper = (function () {
        function RouteHelper() {}
        RouteHelper._escapeString = function (str) {
            return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1');
        };
        RouteHelper._escapeGroup = function (group) {
            return group.replace(/([=!:$\/()])/g, '\\$1');
        };
        RouteHelper._flags = function (opts) {
            return opts['sensitive'] ? '' : 'i';
        };
        RouteHelper.parseFragment = function (fragment) {
            if (fragment === '') {
                return new Resource(fragment);
            }
            var qsPos = fragment.indexOf('?');
            var path;
            var query;
            fragment = RouteHelper.decodeFragment(fragment).replace(ROUTE_STRIPPER, '');
            if (qsPos >= 0) {
                path = fragment.slice(0, qsPos);
                query = fragment.slice(qsPos + 1);
            } else {
                path = fragment;
            }
            return new Resource(path, query);
        };
        RouteHelper.decodeFragment = function (fragment) {
            fragment = fragment.replace(/%25/g, '%2525');
            return _global.decodeURI(fragment);
        };
        RouteHelper._parse = function (str) {
            var tokens = [];
            var key = 0;
            var index = 0;
            var path = '';
            var res;
            while (res = PATH_STRIPPER.exec(str)) {
                var m = res[0];
                var escaped = res[1];
                var offset = res.index;
                path += str.slice(index, offset);
                index = offset + m.length;
                if (escaped) {
                    path += escaped[1];
                    continue;
                }
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
                    name: name_1 || key++,
                    prefix: prefix || '',
                    delimiter: delimiter,
                    optional: optional,
                    repeat: repeat,
                    pattern: RouteHelper._escapeGroup(pattern)
                });
            }
            if (index < str.length) {
                path += str.substr(index);
            }
            if (path) {
                tokens.push(path);
            }
            return tokens;
        };
        RouteHelper._tokensToRegExp = function (tokens, options) {
            if (options === void 0) {
                options = {};
            }
            var strict = options['strict'];
            var end = options['end'] !== false;
            var route = '';
            var lastToken = tokens[tokens.length - 1];
            var endsWithSlash = typeof lastToken === 'string' && lastToken.length && lastToken.charAt(lastToken.length - 1) === '/';
            for (var i = 0; i < tokens.length; i++) {
                var token = tokens[i];
                if (typeof token === 'string') {
                    route += RouteHelper._escapeString(token);
                } else {
                    var prefix = RouteHelper._escapeString(token.prefix);
                    var capture = token.pattern;
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
            if (!strict) {
                route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
            }
            if (end) {
                route += '$';
            } else {
                route += strict && endsWithSlash ? '' : '(?=\\/|$)';
            }
            return new RegExp('^' + route, RouteHelper._flags(options));
        };
        RouteHelper.stringToRegexp = function (path, keys, options) {
            if (keys === void 0) {
                keys = [];
            }
            var tokens = RouteHelper._parse(path);
            var re = RouteHelper._tokensToRegExp(tokens, options);
            for (var i = 0; i < tokens.length; i++) {
                if (typeof tokens[i] !== 'string') {
                    keys.push(tokens[i]);
                }
            }
            re['keys'] = keys;
            return re;
        };
        return RouteHelper;
    })();
    var History = (function () {
        function History() {
            this._location = _global.location;
            this._history = _global.history;
            this._handlers = [];
            this._eventHandlers = {};
            this._checkUrl = this._checkUrl.bind(this);
        }
        History.prototype.on = function (evt, callback) {
            if (this._eventHandlers[evt] === undefined) {
                this._eventHandlers[evt] = [];
            }
            this._eventHandlers[evt].push(callback);
            return this;
        };
        History.prototype.off = function (evt, callback) {
            if (this._eventHandlers[evt]) {
                var callbacks = this._eventHandlers[evt];
                for (var i = 0; i < callbacks.length; i++) {
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
        };
        History.prototype.trigger = function (evt) {
            var restParams = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                restParams[_i - 1] = arguments[_i];
            }
            var callbacks = this._eventHandlers[evt];
            if (callbacks === undefined || !callbacks.length) {
                return null;
            }
            for (var i = 0; i < callbacks.length; i++) {
                var respIt = callbacks[i].apply(this, restParams);
                if (respIt === false) {
                    return false;
                }
            }
            return true;
        };
        History.prototype.isAtRoot = function () {
            var path = this._location.pathname.replace(/[^\/]$/, '$&/');
            return path === this._root && !this._location.search;
        };
        History.prototype.getCurrentPath = function () {
            var path = RouteHelper.decodeFragment(this._location.pathname).slice(this._root.length - 1);
            if (path.charAt(0) === '/') {
                path = path.slice(1);
            }
            var query = _global.decodeURIComponent(this._location.search.slice(1));
            var full = path;
            if (query) {
                full += '?' + query;
            }
            return new Resource(path, query);
        };
        History.prototype.getCurrentHash = function () {
            var match = this._location.href.match(/#(.*)$/);
            var path = match ? match[1] : '';
            return RouteHelper.parseFragment(path);
        };
        History.prototype.obtainFragment = function (fragment) {
            if (fragment === undefined || fragment === null) {
                if (this._usePushState || !this._wantsHashChange) {
                    return this.getCurrentPath();
                }
                return this.getCurrentHash();
            }
            return RouteHelper.parseFragment(fragment);
        };
        History.prototype.start = function (options) {
            if (options === void 0) {
                options = {};
            }
            if (History._started) {
                throw new Error('Router.history has already been started');
            }
            History._started = true;
            this._root = options.root || '/';
            this._wantsHashChange = options.hashChange !== false;
            this._wantsPushState = !!options.pushState;
            this._hasPushState = !!(this._history && this._history.pushState);
            this._usePushState = this._wantsPushState && this._hasPushState;
            this._fragment = this.obtainFragment();
            this._root = ('/' + this._root + '/').replace(/^\/{2,}|\/{2,}$/g, '/');
            if (this._wantsHashChange && this._wantsPushState) {
                var isAtRoot = this.isAtRoot();
                if (!this._hasPushState && !isAtRoot) {
                    var rootAux = this._root.slice(0, -1) || '/';
                    this._location.replace(rootAux + '#' + this.getCurrentPath().full);
                    return true;
                } else if (this._hasPushState && isAtRoot) {
                    this.navigate(this.getCurrentHash().full, null, { replace: true, trigger: false });
                }
            }
            if (this._usePushState) {
                _global.addEventListener('popstate', this._checkUrl, false);
            } else if (this._wantsHashChange) {
                _global.addEventListener('hashchange', this._checkUrl, false);
            }
            if (!options.silent) {
                return this._loadUrl();
            }
            return false;
        };
        History.prototype.stop = function () {
            _global.removeEventListener('popstate', this._checkUrl, false);
            _global.removeEventListener('hashchange', this._checkUrl, false);
            History._started = false;
        };
        History.prototype._addHandler = function (rRoute, callback) {
            this._handlers.unshift({ route: rRoute, callback: callback });
        };
        History.prototype.navigate = function (fragment, message, options) {
            if (options === void 0) {
                options = {};
            }
            if (!History._started) {
                return false;
            }
            var resource = this.obtainFragment(fragment);
            this._fragment = resource;
            var rootAux = this._root;
            if (resource.path === '') {
                rootAux = rootAux.slice(0, -1) || '/';
            }
            var full = resource.full;
            var url = rootAux + full;
            full = full.replace(HASH_STRIPPER, '');
            if (this._usePushState) {
                this._history[options.replace ? 'replaceState' : 'pushState'](null, null, url);
            } else if (this._wantsHashChange) {
                this._updateHash(full, options.replace);
            } else {
                return this._location.assign(url);
            }
            if (options.trigger !== false) {
                return this._loadUrl(full, message);
            }
            return false;
        };
        History.prototype._checkUrl = function () {
            return this._loadUrl();
        };
        History.prototype._loadUrl = function (fragment, message) {
            this._fragment = this.obtainFragment(fragment);
            var handlersLength = this._handlers.length;
            for (var i = 0; i < handlersLength; i++) {
                var handler = this._handlers[i];
                if (handler.route.test(this._fragment.path)) {
                    handler.callback(this._fragment, message);
                    return true;
                }
            }
            return false;
        };
        History.prototype._updateHash = function (fragment, replace) {
            if (replace) {
                var href = this._location.href.replace(/(javascript:|#).*$/, '');
                this._location.replace(href + '#' + fragment);
            } else {
                this._location.hash = '#' + fragment;
            }
        };
        History._started = false;
        return History;
    })();
    exports.History = History;
    var Router = (function () {
        function Router(options) {
            if (options === void 0) {
                options = {};
            }
            this._eventHandlers = {};
            this.trigger = History.prototype.trigger;
            this.on = History.prototype.on;
            this.off = History.prototype.off;
            this._bindHandlers(options.map);
        }
        Router.prototype.addHandler = function (handler) {
            var _this = this;
            var rRoute = RouteHelper.stringToRegexp(handler.route);
            Router.history._addHandler(rRoute, function (resource, message) {
                var params = Router._extractParameters(rRoute, resource.path);
                var newRouteData = { path: resource.path, query: resource.query, params: params, message: message, handler: handler };
                var next = Router.history.trigger('route:before', _this, newRouteData, _this._oldRouteData);
                if (next === false) {
                    return;
                }
                next = _this.trigger('route:before', newRouteData, _this._oldRouteData);
                if (next === false) {
                    return;
                }
                if (_this._oldRouteData && _this._oldRouteData.handler.deactivate) {
                    next = _this._oldRouteData.handler.deactivate.call(_this._oldRouteData.handler, newRouteData, _this._oldRouteData);
                    if (next === false) {
                        return;
                    }
                }
                handler.activate.call(handler, newRouteData, _this._oldRouteData);
                _this.trigger('route:after', newRouteData, _this._oldRouteData);
                Router.history.trigger('route:after', _this, newRouteData, _this._oldRouteData);
                _this._oldRouteData = newRouteData;
            });
            return this;
        };
        Router._extractParameters = function (route, path) {
            var params = {};
            var result = route.exec(path);
            if (!result) {
                return params;
            }
            var args = result.slice(1);
            var keys = route.keys;
            for (var i = 0; i < args.length; i++) {
                params[keys[i].name] = _global.decodeURIComponent(args[i]);
            }
            return params;
        };
        Router.prototype._bindHandlers = function (handlers) {
            if (!handlers) {
                return;
            }
            for (var i = handlers.length - 1; i >= 0; i--) {
                this.addHandler(handlers[i]);
            }
        };
        return Router;
    })();
    exports.Router = Router;
    Router.history = new History();
});
//# sourceMappingURL=prouter.js.map