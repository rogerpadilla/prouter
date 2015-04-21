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
        this._started = false;
        this._checkUrl = this._checkUrl.bind(this);
        this._handlers = [];
        this._evtHandlers = {};
        this._location = root.location;
        this._history = root.history;
    }

    /**
     * Are we at the app root?
     * @returns {boolean} if we are in the root.
     */
    atRoot() {
        return this._location.pathname.replace(isRoot, '$&/') === this._root;
    }

    /**
     * Gets the true hash value. Cannot use location.hash directly due to bug
     * in Firefox where location.hash will always be decoded.
     * @returns {string} The hash.
     */
    getHash() {
        const match = this._location.href.match(trueHash);
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
        let fragmentAux = fragment;
        if (fragmentAux === undefined || fragmentAux === null) {
            if (this._hasPushState || !this._wantsHashChange || forcePushState) {
                fragmentAux = root.decodeURI(this._location.pathname + this._location.search);
                const rootUrl = this._root.replace(trailingSlash, '');
                if (fragmentAux.lastIndexOf(rootUrl, 0) === 0) {
                    fragmentAux = fragmentAux.slice(rootUrl.length);
                }
            } else {
                fragmentAux = this.getHash();
            }
        } else {
            fragmentAux = root.decodeURI(fragmentAux);
        }
        return fragmentAux.replace(routeStripper, '');
    }

    /**
     * Start the route change handling, returning `true` if the current URL matches
     * an existing route, and `false` otherwise.
     * @param {Object} options Options
     * @returns {boolean} true if the current fragment matched some handler, false otherwise.
     */
    start(options = {}) {

        if (History._started) {
            throw new Error('Router.history has already been started');
        }

        History._started = true;

        // Figure out the initial configuration. Is pushState desired ... is it available?
        this._opts = options;
        this._opts.root = this._opts.root || '/';
        this._root = this._opts.root;
        this._wantsHashChange = this._opts.hashChange !== false;
        this._wantsPushState = !!this._opts.pushState;
        this._hasPushState = !!(this._opts.pushState && this._history && this._history.pushState);
        const fragment = this.getFragment();

        // Normalize root to always include a leading and trailing slash.
        this._root = ('/' + this._root + '/').replace(rootStripper, '/');

        // Depending on whether we're using pushState or hashes, and whether
        // 'onhashchange' is supported, determine how we check the URL state.
        if (this._hasPushState) {
            root.addEventListener('popstate', this.checkUrl);
        } else if (this._wantsHashChange && ('onhashchange' in root)) {
            root.addEventListener('hashchange', this.checkUrl);
        }

        // Determine if we need to change the base url, for a pushState link
        // opened by a non-pushState browser.
        this._fragment = fragment;

        // Transition from hashChange to pushState or vice versa if both are
        // requested.
        if (this._wantsHashChange && this._wantsPushState) {

            // If we've started off with a route from a `pushState`-enabled
            // browser, but we're currently in a browser that doesn't support it...
            if (!this._hasPushState && !this.atRoot()) {
                this._fragment = this.getFragment(null, true);
                this._location.replace(this._root + '#' + this._fragment);
                // Return immediately as browser will do redirect to new url
                return true;
                // Or if we've started out with a hash-based route, but we're currently
                // in a browser where it could be `pushState`-based instead...
            } else if (this._hasPushState && this.atRoot() && this._location.hash) {
                this._fragment = this.getHash().replace(routeStripper, '');
                this._history.replaceState({}, document.title, this._root + this._fragment);
            }

        }

        if (!this._opts.silent) {
            return this._loadUrl();
        }
    }

    /**
     * Disable Router.history, perhaps temporarily. Not useful in a real app,
     * but possibly useful for unit testing Routers.
     */
    stop() {
        root.removeEventListener('popstate', this._checkUrl);
        root.removeEventListener('hashchange', this._checkUrl);
        History._started = false;
    }

    /**
     * Add a route to be tested when the fragment changes. Routes added later
     * may override previous routes.
     * @param {string} routeExp The route.
     * @param {Function} callback Method to be executed.
     */
    route(routeExp, callback) {
        this._handlers.unshift({route: routeExp, callback: callback});
    }

    /**
     * Checks the current URL to see if it has changed, and if it has,
     * calls `loadUrl`.
     * @returns {boolean} true if navigated, false otherwise.
     * @private
     */
    _checkUrl() {
        const fragment = this.getFragment();
        if (fragment === this._fragment) {
            return false;
        }
        this._loadUrl();
    }

    /**
     * Attempt to load the current URL fragment. If a route succeeds with a
     * match, returns `true`. If no defined routes matches the fragment,
     * returns `false`.
     * @param {string} fragment E.g.: 'user/pepito'
     * @param {Object} args E.g.: {message: 'Password changed'}
     * @returns {boolean} true if the fragment matched some handler, false otherwise.
     * @private
     */
    _loadUrl(fragment, args) {
        this._fragment = this.getFragment(fragment);
        const n = this._handlers.length;
        let handler;
        for (let i = 0; i < n; i++) {
            handler = this._handlers[i];
            if (handler.route.test(this._fragment)) {
                handler.callback(this._fragment, args);
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
    navigate(fragment, options = {trigger: false}) {

        if (!History._started) {
            return false;
        }

        const optionsAux = options === true ? {trigger: true} : options;

        let fragmentAux = this.getFragment(fragment || '');

        let url = this._root + fragmentAux;

        // Strip the hash for matching.
        fragmentAux = fragmentAux.replace(pathStripper, '');

        if (this._fragment === fragmentAux) {
            return false;
        }

        this._fragment = fragmentAux;

        // Don't include a trailing slash on the root.
        if (fragmentAux === '' && url !== '/') {
            url = url.slice(0, -1);
        }

        // If pushState is available, we use it to set the fragment as a real URL.
        if (this._hasPushState) {
            this._history[optionsAux.replace ? 'replaceState' : 'pushState']({}, document.title, url);
            // If hash changes haven't been explicitly disabled, update the hash
            // fragment to store history.
        } else if (this._wantsHashChange) {
            this._updateHash(fragmentAux, optionsAux.replace);
            // If you've told us that you explicitly don't want fallback hashchange-
            // based history, then `navigate` becomes a page refresh.
        } else {
            return this._location.assign(url);
        }

        if (optionsAux.trigger) {
            return this._loadUrl(fragmentAux, optionsAux.args);
        }

        return false;
    }

    /**
     * Add event listener.
     * @param {string} evt Name of the event.
     * @param {Function} callback Method.
     * @returns {History} this history
     */
    on(evt, callback) {
        if (this._evtHandlers[evt] === undefined) {
            this._evtHandlers[evt] = [];
        }
        this._evtHandlers[evt].push(callback);
        return this;
    }

    /**
     * Remove event listener.
     * @param {string} evt Name of the event.
     * @param {Function} callback Method.
     * @returns {Router} this
     */
    off(evt, callback) {
        if (this._evtHandlers[evt]) {
            const callbacks = this._evtHandlers[evt];
            const n = callbacks.length;
            for (let i = 0; i < n; i++) {
                if (callbacks[i] === callback) {
                    callbacks.splice(i, 1);
                    if (callbacks.length === 0) {
                        delete this._evtHandlers[evt];
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
     * @private
     */
    _trigger(evt) {
        const callbacks = this._evtHandlers[evt];
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
            const href = this._location.href.replace(/(javascript:|#).*$/, '');
            this._location.replace(href + '#' + fragment);
        } else {
            // Some browsers require that `hash` contains a leading #.
            this._location.hash = '#' + fragment;
        }
    }
}


class Router {

    /**
     * Constructor for the router.
     * Routers map faux-URLs to actions, and fire events when routes are
     * matched. Creating a new one sets its `routes` hash, if not set statically.
     * @param {Object} options options.root is a string indicating the site's context, defaults to '/'.
     * @constructor
     */
    constructor(options = {}) {
        this._evtHandlers = {};
        this._opts = options;
        this._bindRoutes();
    }

    /**
     * Manually bind a single named route to a callback.
     * The route argument may be a routing string or regular expression, each matching capture
     * from the route or regular expression will be passed as an argument to the onCallback.
     * @param {string} routeExp The route.
     * @param {Object} ctrl Controller, E.g.: {on: onCallback(){...}, off: offCallback(){...}} object within functions to call.
     * @returns {Router} this
     */
    route(routeExp, ctrl) {

        const routeAux = Router._routeToRegExp(routeExp);
        const self = this;

        Router.history.route(routeAux, function (fragment, args) {

            const params = Router._extractParameters(routeAux, fragment);

            if (args) {
                params.push(args);
            }

            const evtRoute = {new: {fragment: fragment, params: params}};

            if (self._oldCtrl) {
                evtRoute.old = {fragment: self._oldCtrl.fragment, params: self._oldCtrl.params};
            }

            self._trigger('route', evtRoute);
            Router.history._trigger('route', self, evtRoute);

            if (self._oldCtrl && self._oldCtrl.off) {
                self._oldCtrl.off.apply(self._oldCtrl);
            }

            ctrl.on.apply(ctrl, params);

            self._oldCtrl = {off: ctrl.off, fragment: fragment, params: params};
        });

        return this;
    }

    /**
     * Simple proxy to `Router.history` to save a fragment into the history.
     * @param {string} fragment Route to navigate to.
     * @param {Object} options parameters
     * @returns {Router} this
     */
    navigate(fragment, options) {
        Router.history.navigate(fragment, options);
        return this;
    }

    /**
     * Bind all defined routes to `Router.history`. We have to reverse the
     * order of the routes here to support behavior where the most general
     * routes can be defined at the bottom of the route map.
     * @private
     */
    _bindRoutes() {
        if (!this._opts.routes) {
            return;
        }
        const routes = Object.keys(this._opts.routes);
        const routesN = routes.length - 1;
        for (let i = routesN, route; i >= 0; i--) {
            route = routes[i];
            this.route(route, this._opts.routes[route]);
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
        const routeAux = route.replace(escapeRegExp, '\\$&')
            .replace(optionalParam, '(?:$1)?')
            .replace(namedParam, function (match, optional) {
                return optional ? match : '([^/?]+)';
            })
            .replace(splatParam, '([^?]*?)');
        return new RegExp('^' + routeAux + '(?:\\?([\\s\\S]*))?$');
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
        const paramsLength = params.length;
        const args = [];
        for (let i = 0, param; i < paramsLength; i++) {
            param = params[i];
            // Don't decode the search params.
            if (i === params.length - 1) {
                args.push(param || null);
            } else {
                args.push(param ? root.decodeURIComponent(param) : null);
            }
        }
        return args;
    }

}


Router.History = History;

/**
 * Copy event bus listeners.
 */
Router.prototype._trigger = History.prototype._trigger;
Router.prototype.on = History.prototype.on;
Router.prototype.off = History.prototype.off;

/**
 * Create the default Router.History.
 * @type {History}
 */
Router.history = new Router.History();


export {Router};
