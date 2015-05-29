
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require, exports, module);
  } else {
    root.Router = factory();
  }
}(this, function(require, exports, module) {

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
            var prop = _global.decodeURIComponent(pair[0]);
            query[prop] = _global.decodeURIComponent(pair[1]);
        }
        return query;
    };
    RouteHelper._prepareArguments = function (parameters, keys) {
        var lastIndex = parameters.length - 1;
        var query = parameters[lastIndex];
        if (keys) {
            var objectParam = {};
            for (var i = 0; i < keys.length; i++) {
                objectParam[keys[i]] = parameters[i];
            }
            if (parameters[keys.length]) {
                objectParam['query'] = RouteHelper._parseQuery(parameters[keys.length]);
            }
            parameters = [objectParam];
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
        this._options = JSON.parse(JSON.stringify(_DEF_OPTIONS));
    }
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
    RoutingLevel.prototype.config = function (options) {
        if (options) {
            this._options.keys = options.keys;
            this._options.mode = options.mode ? options.mode : this._options.mode;
            this._options.root = options.root ? '/' + RouteHelper._clearSlashes(options.root) + '/' : this._options.root;
            this._options.root = this._options.root.replace(/\/{2,}/, "/");
            this._options.rerouting = options.rerouting;
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
            var nodeRoutes = facade.check(path, [], lastURL);
            apply(nodeRoutes);
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
        add: function (path, callback) {
            return facade.add(path, callback);
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
    function applyNested(nodeRoutes) {
        return function (param) {
            if (param === false) {
                rollback = true;
                router.navigate(lastURL);
            }
            else if (typeof param === 'string') {
                router.route(param);
            }
            else if (nodeRoutes && nodeRoutes.length) {
                apply(nodeRoutes);
            }
        };
    }
    function apply(nodeRoutes) {
        if (nodeRoutes) {
            var falseToReject;
            for (var i = 0; i < nodeRoutes.length; i += 1) {
                var nodeRoute = nodeRoutes[i];
                if (nodeRoute.rootRerouting) {
                    falseToReject = nodeRoute.callback.apply(null, nodeRoute.params);
                }
                applyNested(nodeRoute.routes)(falseToReject);
            }
        }
    }
    return router;
})(new RoutingLevel());

return Router;

}));

//# sourceMappingURL=prouter.js.map