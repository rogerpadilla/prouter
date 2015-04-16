/**
 * Unobtrusive and ultra-lightweight (5k for minified version) router library 100% compatible
 * with the Backbone.Router providing the following advantages:
 * great performance (only native functions are used) and small footprint with no dependencies.
 * EasyRouter provides methods for routing client-side pages, and connecting them to actions.
 *
 * During page load, after your application has finished creating all of its routers,
 * be sure to call start() on the router instance to let know him you have already
 * finished the routing setup.
 */
(function (global, factory) {
    'use strict';
    // Sourced from jquery.js 
    if (typeof module === 'object' && typeof module.exports === 'object') {
        // For CommonJS and CommonJS-like environments where a proper `window`
        // is present, execute the factory and get EasyRouter.
        // For environments that do not have a `window` with a `location`
        // (such as Node.js), expose a factory as module.exports.
        // This accentuates the need for the creation of a real `window`.
        // e.g. var EasyRouter = require('easyRouter')(window);
        module.exports = global.location ?
            factory(global, true) :
            function (w) {
                if (!w.location) {
                    throw new Error('easyRouter requires a window with a location');
                }
                return factory(w);
            };
    } else {
        // Normal browser.
        global.EasyRouter = factory(global);
    }
}(typeof window !== 'undefined' ? window : this, function (root, noGlobal) {
    'use strict';

    /**
     * Constructor for the router.
     * Routers map faux-URLs to actions, and fire events when routes are
     * matched. Creating a new one sets its `routes` hash, if not set statically.
     * @param {Object} options options.root is a string indicating the site's context, defaults to '/'.
     * @constructor
     */
    var EasyRouter = function (options) {
        options = options || {};
        this.evtHandlers = {};
        if (options.routes) { this.routes = options.routes; }
        this._bindRoutes();
        this.initialize.apply(this, arguments);
    };

    // Cached regular expressions for matching named param parts and splatted
    // parts of route strings.
    var optionalParam = /\((.*?)\)/g;
    var namedParam = /(\(\?)?:\w+/g;
    var splatParam = /\*\w+/g;
    var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;

    /**
     * Initialize is an empty function by default. Override it with your own
     * initialization logic.
     */
    EasyRouter.prototype.initialize = function () {
    };

    /**
     * Events listening.
     * @param {string} evt Name of the event for listen to.
     * @param {Function} callback Method to be executed when event triggers.
     * @returns {EasyRouter} this
     */
    EasyRouter.prototype.on = function (evt, callback) {
        if (this.evtHandlers[evt] === undefined) {
            this.evtHandlers[evt] = [];
        }
        this.evtHandlers[evt].push(callback);
        return this;
    };

    /**
     * Events triggering.
     * @param {string} evt Name of the event being triggered.
     * @returns {boolean} if the event was listened or not.
     */
    EasyRouter.prototype.trigger = function (evt) {
        var callbacks = this.evtHandlers[evt];
        if (callbacks === undefined) {
            return false;
        }
        var args = Array.prototype.slice.call(arguments, 1);
        var i = 0;
        var callbacksLength = callbacks.length;
        var respArr = [];
        var resp;
        for (; i < callbacksLength; i++) {
            resp = callbacks[i].apply(this, args);
            respArr.push(resp);
        }
        for (; i < callbacksLength; i++) {
            if (respArr[i] === false) {
                return false;
            }
        }
        return true;
    };

    /**
     * Manually bind a single named route to a callback.
     * The route argument may be a routing string or regular expression, each matching capture
     * from the route or regular expression will be passed as an argument to the onCallback.
     * @param {string|RegExp} route The route
     * @param {string|Function} name If string, alias for the entry; if Function, behaves like 'onCallback'.
     * @param {Function} onCallback function to call when the new fragment match a route.
     * @returns {EasyRouter} this
     */
    EasyRouter.prototype.route = function (route, name, onCallback) {
        if (!(Object.prototype.toString.call(route) === '[object RegExp]')) {
            route = EasyRouter._routeToRegExp(route);
        }
        if (Object.prototype.toString.call(name) === '[object Function]') {
            onCallback = name;
            name = '';
        }
        if (!onCallback) { onCallback = this[name]; }
        var router = this;
        EasyRouter.history.route(route, function (fragment) {
            var args = EasyRouter._extractParameters(route, fragment);
            router.execute(onCallback, args);
            router.trigger.apply(router, ['route:' + name].concat(args));
            router.trigger('route', name, args);
            EasyRouter.history.trigger('route', router, name, args);
        });
        return this;
    };

    /**
     * Execute a route handler with the provided parameters.  This is an
     * excellent place to do pre-route setup or post-route cleanup.
     * @param {Function} callback The method to execute.
     * @param {Array} args The parameters to pass to the method.
     */
    EasyRouter.prototype.execute = function (callback, args) {
        if (callback) { callback.apply(this, args); }
    };

    /**
     * Simple proxy to `EasyRouter.history` to save a fragment into the history.
     * @param {string} fragment Route to navigate to.
     * @param {Object} options parameters
     * @returns {EasyRouter} this
     */
    EasyRouter.prototype.navigate = function (fragment, options) {
        EasyRouter.history.navigate(fragment, options);
        return this;
    };

    /**
     * Bind all defined routes to `EasyRouter.history`. We have to reverse the
     * order of the routes here to support behavior where the most general
     * routes can be defined at the bottom of the route map.
     * @private
     */
    EasyRouter.prototype._bindRoutes = function () {
        if (!this.routes) { return; }
        var routes = Object.keys(this.routes);
        var route = routes.pop();
        while (route !== undefined) {
            this.route(route, this.routes[route]);
            route = routes.pop();
        }
    };

    /**
     * Convert a route string into a regular expression, suitable for matching
     * against the current location fragment.
     * @param {string} route The route
     * @returns {RegExp} the obtained regex
     * @private
     */
    EasyRouter._routeToRegExp = function (route) {
        route = route.replace(escapeRegExp, '\\$&')
            .replace(optionalParam, '(?:$1)?')
            .replace(namedParam, function (match, optional) {
                return optional ? match : '([^/?]+)';
            })
            .replace(splatParam, '([^?]*?)');
        return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    };

    /**
     * Given a route, and a URL fragment that it matches, return the array of
     * extracted decoded parameters. Empty or unmatched parameters will be
     * treated as `null` to normalize cross-browser behavior.
     * @param {RegExp} route The alias
     * @param {string} fragment The url part
     * @returns {Array} the extracted parameters
     * @private
     */
    EasyRouter._extractParameters = function (route, fragment) {
        var params = route.exec(fragment).slice(1);
        return params.map(function (param, i) {
            // Don't decode the search params.
            if (i === params.length - 1) { return param || null; }
            return param ? decodeURIComponent(param) : null;
        });
    };


    // EasyRouter.history
    // ----------------

    /**
     * Handles cross-browser history management, based on either
     * [pushState](http://diveintohtml5.info/history.html) and real URLs, or
     * [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
     * and URL fragments.
     * @constructor
     */
    var History = function () {
        this.checkUrl = this.checkUrl.bind(this);
        this.handlers = [];
        this.evtHandlers = {};
        // Ensure that `History` can be used outside of the browser.
        if (typeof root !== 'undefined') {
            this.location = root.location;
            this.history = root.history;
        }
    };

    // Cached regex for stripping a leading hash/slash and trailing space.
    var routeStripper = /^[#\/]|\s+$/g;

    // Cached regex for stripping leading and trailing slashes.
    var rootStripper = /^\/+|\/+$/g;

    // Cached regex for removing a trailing slash.
    var trailingSlash = /\/$/;

    // Cached regex for stripping urls of hash.
    var pathStripper = /#.*$/;

    // Has the history handling already been started?
    History.started = false;

    /**
     * Are we at the app root?
     * @returns {boolean}
     */
    History.prototype.atRoot = function () {
        return this.location.pathname.replace(/[^\/]$/, '$&/') === this.root;
    };

    /**
     * Copy event bus listeners.
     */
    History.prototype.trigger = EasyRouter.prototype.trigger;
    History.prototype.on = EasyRouter.prototype.on;

    /**
     * Gets the true hash value. Cannot use location.hash directly due to bug
     * in Firefox where location.hash will always be decoded.
     * @param {Window} window The window object.
     * @returns {string} The hash.
     */
    History.prototype.getHash = function (window) {
        var match = (window || this).location.href.match(/#(.*)$/);
        return match ? match[1] : '';
    };

    /**
     * Get the cross-browser normalized URL fragment, either from the URL,
     * the hash, or the override.
     * @param {string} fragment The url fragment
     * @param {boolean} forcePushState flag to force the usage of pushSate
     * @returns {string} The fragment.
     */
    History.prototype.getFragment = function (fragment, forcePushState) {
        if (fragment === undefined) {
            if (this._hasPushState || !this._wantsHashChange || forcePushState) {
                fragment = decodeURI(this.location.pathname + this.location.search);
                var rootUrl = this.root.replace(trailingSlash, '');
                if (!fragment.indexOf(rootUrl)) { fragment = fragment.slice(rootUrl.length); }
            } else {
                fragment = this.getHash();
            }
        }
        return fragment.replace(routeStripper, '');
    };

    /**
     * Start the route change handling, returning `true` if the current URL matches
     * an existing route, and `false` otherwise.
     * @param {Object} options Options
     * @returns {boolean} true if the current fragment matched some handler, false otherwise.
     */
    History.prototype.start = function (options) {

        if (History.started) { throw new Error("EasyRouter.history has already been started"); }

        History.started = true;

        // Figure out the initial configuration. Is pushState desired ... is it available?
        this.options = options || {};
        this.options.root = options.root || '/';
        this.root = this.options.root;
        this._wantsHashChange = this.options.hashChange !== false;
        this._wantsPushState = !!this.options.pushState;
        this._hasPushState = !!(this.options.pushState && this.history && this.history.pushState);
        var fragment = this.getFragment();

        // Normalize root to always include a leading and trailing slash.
        this.root = ('/' + this.root + '/').replace(rootStripper, '/');

        // Depending on whether we're using pushState or hashes, and whether
        // 'onhashchange' is supported, determine how we check the URL state.
        if (this._hasPushState) {
            root.addEventListener('popstate', this.checkUrl);
        } else if (this._wantsHashChange && ('onhashchange' in root)) {
            root.addEventListener('hashchange', this.checkUrl);
        }

        // Determine if we need to change the base url, for a pushState link
        // opened by a non-pushState browser.
        this.fragment = fragment;
        var loc = this.location;

        // Transition from hashChange to pushState or vice versa if both are
        // requested.
        if (this._wantsHashChange && this._wantsPushState) {

            // If we've started off with a route from a `pushState`-enabled
            // browser, but we're currently in a browser that doesn't support it...
            if (!this._hasPushState && !this.atRoot()) {
                this.fragment = this.getFragment(null, true);
                this.location.replace(this.root + '#' + this.fragment);
                // Return immediately as browser will do redirect to new url
                return true;
                // Or if we've started out with a hash-based route, but we're currently
                // in a browser where it could be `pushState`-based instead...
            } else if (this._hasPushState && this.atRoot() && loc.hash) {
                this.fragment = this.getHash().replace(routeStripper, '');
                this.history.replaceState({}, document.title, this.root + this.fragment);
            }

        }

        if (!this.options.silent) { return this.loadUrl(); }
    };

    /**
     * Disable EasyRouter.history, perhaps temporarily. Not useful in a real app,
     * but possibly useful for unit testing Routers.
     */
    History.prototype.stop = function () {
        root.removeEventListener('popstate', this.checkUrl);
        root.removeEventListener('hashchange', this.checkUrl);
        History.started = false;
    };

    /**
     * Add a route to be tested when the fragment changes. Routes added later
     * may override previous routes.
     * @param {string} route The route.
     * @param {Function} callback Method to be executed.
     */
    History.prototype.route = function (route, callback) {
        this.handlers.unshift({route: route, callback: callback});
    };

    /**
     * Checks the current URL to see if it has changed, and if it has,
     * calls `loadUrl`.
     * @returns {boolean} true if navigated, false otherwise.
     */
    History.prototype.checkUrl = function () {
        var current = this.getFragment();
        if (current === this.fragment) { return false; }
        this.loadUrl();
    };

    /**
     * Attempt to load the current URL fragment. If a route succeeds with a
     * match, returns `true`. If no defined routes matches the fragment,
     * returns `false`.
     * @param {string} fragment E.g.: 'user/pepito'
     * @returns {boolean} true if the fragment matched some handler, false otherwise.
     */
    History.prototype.loadUrl = function (fragment) {
        fragment = this.fragment = this.getFragment(fragment);
        var n = this.handlers.length;
        var handler;
        for (var i = 0; i < n; i++) {
            handler = this.handlers[i];
            if (handler.route.test(fragment)) {
                handler.callback(fragment);
                return true;
            }
        }
        return false;
    };

    /**
     * Save a fragment into the hash history, or replace the URL state if the
     * 'replace' option is passed. You are responsible for properly URL-encoding
     * the fragment in advance.
     *
     * The options object can contain `trigger: true` if you wish to have the
     * route callback be fired (not usually desirable), or `replace: true`, if
     * you wish to modify the current URL without adding an entry to the history.
     * @param {string} fragment Fragment to navigate to
     * @param {Object} options Options object
     * @returns {boolean} true if the fragment matched some handler, false otherwise.
     */
    History.prototype.navigate = function (fragment, options) {

        if (!History.started) { return false; }
        if (!options || options === true) { options = {trigger: !!options}; }

        var url = this.root + (fragment = this.getFragment(fragment || ''));

        // Strip the hash for matching.
        fragment = fragment.replace(pathStripper, '');

        if (this.fragment === fragment) { return false; }

        this.fragment = fragment;

        // Don't include a trailing slash on the root.
        if (fragment === '' && url !== '/') { url = url.slice(0, -1); }

        // If pushState is available, we use it to set the fragment as a real URL.
        if (this._hasPushState) {
            this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);
            // If hash changes haven't been explicitly disabled, update the hash
            // fragment to store history.
        } else if (this._wantsHashChange) {
            this._updateHash(this.location, fragment, options.replace);
            // If you've told us that you explicitly don't want fallback hashchange-
            // based history, then `navigate` becomes a page refresh.
        } else {
            return this.location.assign(url);
        }
        if (options.trigger) { return this.loadUrl(fragment); }
        return false;
    };

    /**
     * Update the hash location, either replacing the current entry, or adding
     * a new one to the browser history.
     * @param {Location} location The Location object
     * @param {string} fragment URL fragment
     * @param {boolean} replace flag
     * @private
     */
    History.prototype._updateHash = function (location, fragment, replace) {
        if (replace) {
            var href = location.href.replace(/(javascript:|#).*$/, '');
            location.replace(href + '#' + fragment);
        } else {
            // Some browsers require that `hash` contains a leading #.
            location.hash = '#' + fragment;
        }
    };

    /**
     * Create the default EasyRouter.history.
     * @type {History}
     */
    EasyRouter.history = new History();


    return EasyRouter;

}));
