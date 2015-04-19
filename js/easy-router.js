/**
 * Unobtrusive and ultra-lightweight router library 100% compatible with the Backbone.Router's style for declaring routes,
 * while providing the following advantages:
 * - Unobtrusive, it is designed from the beginning to be integrated with other libraries / frameworks (also vanilla).
 * - Great performance, only native functions are used.
 * - Small footprint, 5kb for minified version.
 * - No dependencies, no jQuery, no Underscore... zero dependencies.
 * - Supports both routes' styles, hash and the pushState of History API.
 * - Proper JSDoc used in the source code.
 * - Works with normal script include and as well in CommonJS style.
 *
 * ¿Want to create a modern hibrid-app or a website using something like React, Web Components, Handlebars, vanilla JS, etc.?
 * ¿Have an existing Backbone project and want to migrate to a more modern framework?
 * Good news, EasyRouter will integrates perfectly with all of those!
 */

/**
 * EasyRouter provides methods for routing client-side pages, and connecting them to actions.
 *
 * During page load, after your application has finished creating all of its routers,
 * be sure to call start() on the router instance to let know him you have already
 * finished the routing setup.
 */

const root = typeof global === 'undefined' ? window : global;
const document = root.document;

// Cached regular expressions for matching named param parts and splatted
// parts of route strings.
const optionalParam = /\((.*?)\)/g;
const namedParam = /(\(\?)?:\w+/g;
const splatParam = /\*\w+/g;
const escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
const trueHash = /#(.*)$/;
const isRoot = /[^\/]$/;

// Cached regex for stripping a leading hash/slash and trailing space.
const routeStripper = /^[#\/]|\s+$/g;
// Cached regex for stripping leading and trailing slashes.
const rootStripper = /^\/+|\/+$/g;
// Cached regex for removing a trailing slash.
const trailingSlash = /\/$/;
// Cached regex for stripping urls of hash.
const pathStripper = /#.*$/;


/**
 * Handles cross-browser history management, based on either
 * [pushState](http://diveintohtml5.info/history.html) and real URLs, or
 * [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
 * and URL fragments.
 * @constructor
 */

class History {

    constructor() {
        // Has the history handling already been started?
        this.started = false;
        this.checkUrl = this.checkUrl.bind(this);
        this.handlers = [];
        this.evtHandlers = {};
        this.location = root.location;
        this.history = root.history;
    }

    /**
     * Are we at the app root?
     * @returns {boolean} if we are in the root.
     */
    atRoot() {
        return this.location.pathname.replace(isRoot, '$&/') === this.root;
    }

    /**
     * Gets the true hash value. Cannot use location.hash directly due to bug
     * in Firefox where location.hash will always be decoded.
     * @returns {string} The hash.
     */
    getHash() {
        const match = this.location.href.match(trueHash);
        return match ? match[1] : '';
    }

    /**
     * Get the cross-browser normalized URL fragment, either from the URL,
     * the hash, or the override.
     * @param {string} fragment The url fragment
     * @param {boolean} forcePushState flag to force the usage of pushSate
     * @returns {string} The fragment.
     */
    getFragment(fragment, forcePushState) {
        if (fragment === undefined || fragment === null) {
            if (this._hasPushState || !this._wantsHashChange || forcePushState) {
                fragment = decodeURI(this.location.pathname + this.location.search);
                const rootUrl = this.root.replace(trailingSlash, '');
                if (!fragment.indexOf(rootUrl)) {
                    fragment = fragment.slice(rootUrl.length);
                }
            } else {
                fragment = this.getHash();
            }
        }
        return fragment.replace(routeStripper, '');
    }

    /**
     * Start the route change handling, returning `true` if the current URL matches
     * an existing route, and `false` otherwise.
     * @param {Object} options Options
     * @returns {boolean} true if the current fragment matched some handler, false otherwise.
     */
    start(options = {}) {

        if (History.started) {
            throw new Error('EasyRouter.history has already been started');
        }

        History.started = true;

        // Figure out the initial configuration. Is pushState desired ... is it available?
        this.opts = options;
        this.opts.root = this.opts.root || '/';
        this.root = this.opts.root;
        this._wantsHashChange = this.opts.hashChange !== false;
        this._wantsPushState = !!this.opts.pushState;
        this._hasPushState = !!(this.opts.pushState && this.history && this.history.pushState);

        // Determine if we need to change the base url, for a pushState link
        // opened by a non-pushState browser.
        this.fragment = this.getFragment();

        // Normalize root to always include a leading and trailing slash.
        this.root = ('/' + this.root + '/').replace(rootStripper, '/');

        // Depending on whether we're using pushState or hashes, and whether
        // 'onhashchange' is supported, determine how we check the URL state.
        if (this._hasPushState) {
            root.addEventListener('popstate', this.checkUrl);
        } else if (this._wantsHashChange && ('onhashchange' in root)) {
            root.addEventListener('hashchange', this.checkUrl);
        }

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
            } else if (this._hasPushState && this.atRoot() && this.location.hash) {
                this.fragment = this.getHash().replace(routeStripper, '');
                this.history.replaceState({}, document.title, this.root + this.fragment);
            }

        }

        if (!this.opts.silent) {
            return this.loadUrl();
        }
    }

    /**
     * Disable EasyRouter.history, perhaps temporarily. Not useful in a real app,
     * but possibly useful for unit testing Routers.
     */
    stop() {
        root.removeEventListener('popstate', this.checkUrl);
        root.removeEventListener('hashchange', this.checkUrl);
        History.started = false;
    }

    /**
     * Add a route to be tested when the fragment changes. Routes added later
     * may override previous routes.
     * @param {string} routeExp The route.
     * @param {Function} callback Method to be executed.
     */
    route(routeExp, callback) {
        this.handlers.unshift({route: routeExp, callback: callback});
    }

    /**
     * Checks the current URL to see if it has changed, and if it has,
     * calls `loadUrl`.
     * @returns {boolean} true if navigated, false otherwise.
     */
    checkUrl() {
        const current = this.getFragment();
        if (current === this.fragment) {
            return false;
        }
        this.loadUrl();
    }

    /**
     * Attempt to load the current URL fragment. If a route succeeds with a
     * match, returns `true`. If no defined routes matches the fragment,
     * returns `false`.
     * @param {string} fragment E.g.: 'user/pepito'
     * @returns {boolean} true if the fragment matched some handler, false otherwise.
     */
    loadUrl(fragment) {
        this.fragment = this.getFragment(fragment);
        const n = this.handlers.length;
        let handler;
        for (let i = 0; i < n; i++) {
            handler = this.handlers[i];
            if (handler.route.test(this.fragment)) {
                handler.callback(this.fragment);
                return true;
            }
        }
        return false;
    }

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
    navigate(fragment, options) {

        if (!History.started) {
            return false;
        }

        if (!options || options === true) {
            options = {trigger: !!options};
        }

        let fragmentAux = this.getFragment(fragment || '');

        let url = this.root + fragmentAux;

        // Strip the hash for matching.
        fragmentAux = fragmentAux.replace(pathStripper, '');

        if (this.fragment === fragmentAux) {
            return false;
        }

        this.fragment = fragmentAux;

        // Don't include a trailing slash on the root.
        if (fragmentAux === '' && url !== '/') {
            url = url.slice(0, -1);
        }

        // If pushState is available, we use it to set the fragment as a real URL.
        if (this._hasPushState) {
            this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);
            // If hash changes haven't been explicitly disabled, update the hash
            // fragment to store history.
        } else if (this._wantsHashChange) {
            this._updateHash(this.location, fragmentAux, options.replace);
            // If you've told us that you explicitly don't want fallback hashchange-
            // based history, then `navigate` becomes a page refresh.
        } else {
            return this.location.assign(url);
        }

        if (options.trigger) {
            return this.loadUrl(fragmentAux);
        }

        return false;
    }

    /**
     * Add event listener.
     * @param {string} evt Name of the event.
     * @param {Function} callback Method.
     * @returns {EasyRouter} this
     */
    on(evt, callback) {
        if (this.evtHandlers[evt] === undefined) {
            this.evtHandlers[evt] = [];
        }
        this.evtHandlers[evt].push(callback);
        return this;
    }

    /**
     * Remove event listener.
     * @param {string} evt Name of the event.
     * @param {Function} callback Method.
     * @returns {EasyRouter} this
     */
    off(evt, callback) {
        if (this.evtHandlers[evt]) {
            const callbacks = this.evtHandlers[evt];
            const n = callbacks.length;
            for (let i = 0; i < n; i++) {
                if (callbacks[i] === callback) {
                    callbacks.splice(i, 1);
                    if (callbacks.length === 0) {
                        delete this.evtHandlers[evt];
                    }
                    break;
                }
            }
        }
        return this;
    }

    /**
     * Events triggering.
     * @param {string} evt Name of the event being triggered.
     * @returns {boolean} if the event was listened or not.
     */
    trigger(evt) {
        const callbacks = this.evtHandlers[evt];
        if (callbacks === undefined) {
            return false;
        }
        const args = Array.prototype.slice.call(arguments, 1);
        let i = 0;
        const callbacksLength = callbacks.length;
        const respArr = [];
        let resp;
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
    }

    /**
     * Update the hash location, either replacing the current entry, or adding
     * a new one to the browser history.
     * @param {string} fragment URL fragment
     * @param {boolean} replace flag
     * @private
     */
    _updateHash(fragment, replace) {
        if (replace) {
            const href = this.location.href.replace(/(javascript:|#).*$/, '');
            this.location.replace(href + '#' + fragment);
        } else {
            // Some browsers require that `hash` contains a leading #.
            this.location.hash = '#' + fragment;
        }
    }
}


class EasyRouter {

    /**
     * Constructor for the router.
     * Routers map faux-URLs to actions, and fire events when routes are
     * matched. Creating a new one sets its `routes` hash, if not set statically.
     * @param {Object} options options.root is a string indicating the site's context, defaults to '/'.
     * @constructor
     */
    constructor(options = {}) {
        this.evtHandlers = {};
        this.opts = options;
        this._bindRoutes();
        if (this.opts.initialize) {
            this.opts.initialize.apply(this, arguments);
        }
    }

    /**
     * Manually bind a single named route to a callback.
     * The route argument may be a routing string or regular expression, each matching capture
     * from the route or regular expression will be passed as an argument to the onCallback.
     * @param {string|RegExp} routeExp The route
     * @param {string|Function} name If string, alias for the entry; if Function, behaves like 'onCallback'.
     * @param {Function} onCallback function to call when the new fragment match a route.
     * @returns {EasyRouter} this
     */
    route(routeExp, name, onCallback) {

        const routeAux = (Object.prototype.toString.call(routeExp) === '[object RegExp]') ? routeExp : EasyRouter._routeToRegExp(routeExp);

        if (Object.prototype.toString.call(name) === '[object Function]') {
            onCallback = name;
            name = '';
        }

        if (!onCallback) {
            onCallback = this.opts[name];
        }

        const self = this;

        EasyRouter.history.route(routeAux, function (fragment) {
            const args = EasyRouter._extractParameters(routeAux, fragment);
            self.execute(onCallback, args);
            self.trigger.apply(self, ['route:' + name].concat(args));
            self.trigger('route', name, args);
            EasyRouter.history.trigger('route', self, name, args);
        });

        return this;
    }

    /**
     * Execute a route handler with the provided parameters.  This is an
     * excellent place to do pre-route setup or post-route cleanup.
     * @param {Function} callback The method to execute.
     * @param {Array} args The parameters to pass to the method.
     */
    execute(callback, args) {
        if (callback) {
            callback.apply(this, args);
        }
    }

    /**
     * Simple proxy to `EasyRouter.history` to save a fragment into the history.
     * @param {string} fragment Route to navigate to.
     * @param {Object} options parameters
     * @returns {EasyRouter} this
     */
    navigate(fragment, options) {
        EasyRouter.history.navigate(fragment, options);
        return this;
    }

    /**
     * Bind all defined routes to `EasyRouter.history`. We have to reverse the
     * order of the routes here to support behavior where the most general
     * routes can be defined at the bottom of the route map.
     * @private
     */
    _bindRoutes() {
        if (!this.opts.routes) {
            return;
        }
        const routes = Object.keys(this.opts.routes);
        const routesN = routes.length - 1;
        for (let i = routesN, route; i >= 0; i--) {
            route = routes[i];
            this.route(route, this.opts.routes[route]);
        }
    }

    /**
     * Convert a route string into a regular expression, suitable for matching
     * against the current location fragment.
     * @param {string} route The route
     * @returns {RegExp} the obtained regex
     * @private
     */
    static _routeToRegExp(route) {
        route = route.replace(escapeRegExp, '\\$&')
            .replace(optionalParam, '(?:$1)?')
            .replace(namedParam, function (match, optional) {
                return optional ? match : '([^/?]+)';
            })
            .replace(splatParam, '([^?]*?)');
        return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    }

    /**
     * Given a route, and a URL fragment that it matches, return the array of
     * extracted decoded parameters. Empty or unmatched parameters will be
     * treated as `null` to normalize cross-browser behavior.
     * @param {RegExp} route The alias
     * @param {string} fragment The url part
     * @returns {Array} the extracted parameters
     * @private
     */
    static _extractParameters(route, fragment) {
        const params = route.exec(fragment).slice(1);
        return params.map(function (param, i) {
            // Don't decode the search params.
            if (i === params.length - 1) {
                return param || null;
            }
            return param ? decodeURIComponent(param) : null;
        });
    }

}


EasyRouter.History = History;

/**
 * Copy event bus listeners.
 */
EasyRouter.prototype.trigger = History.prototype.trigger;
EasyRouter.prototype.on = History.prototype.on;
EasyRouter.prototype.off = History.prototype.off;

/**
 * Create the default EasyRouter.History.
 * @type {History}
 */
EasyRouter.history = new EasyRouter.History();


export {EasyRouter as EasyRouter};
