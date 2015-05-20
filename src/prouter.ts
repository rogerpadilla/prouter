/**
 * Unobtrusive, forward-thinking and ultra-lightweight client-side router library.
 */

declare var global: any;

const root: any = typeof window !== 'undefined' ? window : global;
const document = root.document;

// Cached regular expressions for matching named param parts and splatted
// parts of route strings.
const optionalParam = /\((.*?)\)/g;
const namedParam = /(\(\?)?:\w+/g;
const splatParam = /\*\w+/g;
const escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;

// Cached regex for stripping a leading hash/slash and trailing space.
const routeStripper = /^[#\/]|\s+$/g;
// Cached regex for stripping leading and trailing slashes.
const rootStripper = /^\/+|\/+$/g;
// Cached regex for stripping urls of hash.
const pathStripper = /#.*$/;

/**
 * Interface for declaring contract of handling requests.
 */
export interface RequestHandler {
    (fragment: string, message?: any): void
}

/**
 * Handles cross-browser history management, based on either
 * [pushState](http://diveintohtml5.info/history.html) and real URLs, or
 * [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
 * and URL fragments.
 * @constructor
 */
export class History {
    // Has the history handling already been started?
    private static _started = false;
    private _location = root.location;
    private _history = root.history;
    private _handlers: any = [];
    private _evtHandlers: any = {};
    private _root: string;
    private _hasPushState: boolean;
    private _wantsHashChange: boolean;
    private _wantsPushState: boolean;
    private _usePushState: boolean;
    private _fragment: string;

    constructor() {
        this._checkUrl = this._checkUrl.bind(this);
    }

    /**
     * Are we at the app root?
     * @returns {boolean} if we are in the root.
     */
    atRoot(): boolean {
        const path = this._location.pathname.replace(/[^\/]$/, '$&/');
        return path === this._root && !this.getSearch();
    }

    /**
     *  Unicode characters in `location.pathname` are percent encoded so they're
     *  decoded for comparison. `%25` should not be decoded since it may be part
     *  of an encoded parameter.
     *  @param {string} fragment The url fragment to decode
     *  @returns {string} the decoded fragment.
     */
    private static _decodeFragment(fragment: string): string {
        return decodeURI(fragment.replace(/%25/g, '%2525'));
    }

    /**
     * Obtain the search.
     * @returns {string} the search.
     */
    getSearch(): string {
        const match = this._location.href.replace(/#.*/, '').match(/\?.+/);
        return match ? match[0] : '';
    }

    /**
     * Gets the true hash value. Cannot use location.hash directly due to bug
     * in Firefox where location.hash will always be decoded.
     * @returns {string} The hash.
     */
    getHash(): string {
        const match = this._location.href.match(/#(.*)$/);
        return match ? match[1] : '';
    }

    /**
     *  Get the pathname and search params, without the root.
     *  @returns {string} The path.
     */
    getPath(): string {
        const path = History._decodeFragment(this._location.pathname + this.getSearch()).slice(this._root.length - 1);
        return path.charAt(0) === '/' ? path.slice(1) : path;
    }

    /**
     * Get the cross-browser normalized URL fragment, either from the URL,
     * the hash, or the override.
     * @param {string} fragment The url fragment
     * @returns {string} The fragment.
     */
    getFragment(fragment?: string): string {
        if (fragment === undefined || fragment === null) {
            if (this._usePushState || !this._wantsHashChange) {
                fragment = this.getPath();
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
    start(options: any = {}): boolean {

        if (History._started) {
            throw new Error('Router.history has already been started');
        }

        History._started = true;

        // Figure out the initial configuration. Is pushState desired ...
        this._root = options.root || '/';
        this._wantsHashChange = options.hashChange !== false;
        this._wantsPushState = !!options.pushState;
        this._hasPushState = !!(this._history && this._history.pushState);
        this._usePushState = this._wantsPushState && this._hasPushState;

        this._fragment = this.getFragment();

        // Normalize root to always include a leading and trailing slash.
        this._root = ('/' + this._root + '/').replace(rootStripper, '/');

        // Transition from hashChange to pushState or vice versa if both are
        // requested.
        if (this._wantsHashChange && this._wantsPushState) {

            const isAtRoot = this.atRoot();

            // If we've started off with a route from a `pushState`-enabled
            // browser, but we're currently in a browser that doesn't support it...
            if (!this._hasPushState && !isAtRoot) {

                const rootAux = this._root.slice(0, -1) || '/';
                this._location.replace(rootAux + '#' + this.getPath());
                // Return immediately as browser will do redirect to new url
                return true;

                // Or if we've started out with a hash-based route, but we're currently
                // in a browser where it could be `pushState`-based instead...
            } else if (this._hasPushState && isAtRoot) {
                this.navigate(this.getHash(), null, { replace: true, trigger: false });
            }
        }

        // Depending on whether we're using pushState or hashes, and whether
        // 'onhashchange' is supported, determine how we check the URL state.
        if (this._usePushState) {
            addEventListener('popstate', this._checkUrl, false);
        } else if (this._wantsHashChange) {
            addEventListener('hashchange', this._checkUrl, false);
        }

        if (!options.silent) {
            return this._loadUrl();
        }

        return false;
    }

    /**
     * Disable Router.history, perhaps temporarily. Not useful in a real app,
     * but possibly useful for unit testing Routers.
     */
    stop() {
        root.removeEventListener('popstate', this._checkUrl, false);
        root.removeEventListener('hashchange', this._checkUrl, false);
        History._started = false;
    }

    /**
     * Add a route to be tested when the fragment changes. Routes added later
     * may override previous routes.
     * @param {RegExp} rRoute The route.
     * @param {Function} callback Method to be executed.
     */
    addHandler(rRoute: RegExp, callback: RequestHandler) {
        this._handlers.unshift({ route: rRoute, callback: callback });
    }

    /**
     * Checks the current URL to see if it has changed, and if it has,
     * calls `loadUrl`.
     * @returns {boolean} true if navigated, false otherwise.
     * @private
     */
    private _checkUrl() {
        const fragment = this.getFragment();
        if (fragment === this._fragment) {
            return false;
        }
        return this._loadUrl();
    }

    /**
     * Attempt to load the current URL fragment. If a route succeeds with a
     * match, returns `true`. If no defined routes matches the fragment,
     * returns `false`.
     * @param {string} fragment E.g.: 'user/pepito'
     * @param {Object} message E.g.: {msg: 'Password changed', type: 'success'}
     * @returns {boolean} true if the fragment matched some handler, false otherwise.
     * @private
     */
    private _loadUrl(fragment?: string, message?: string): boolean {
        this._fragment = this.getFragment(fragment);
        const n = this._handlers.length;
        for (let i = 0; i < n; i++) {
            let handler = this._handlers[i];
            if (handler.route.test(this._fragment)) {
                handler.callback(this._fragment, message);
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
     * @param {Object=} message Options object.
     * @param {Object=} options Options object.
     * @returns {boolean} true if the fragment matched some handler, false otherwise.
     */
    navigate(fragment: string, message?: any, options: any = {}) {

        if (!History._started) {
            return false;
        }

        // Normalize the fragment.
        fragment = this.getFragment(fragment);

        // Don't include a trailing slash on the root.
        let rootAux = this._root;

        if (fragment === '' || fragment.charAt(0) === '?') {
            rootAux = rootAux.slice(0, -1) || '/';
        }

        const url = rootAux + fragment;

        // Strip the hash and decode for matching.
        fragment = History._decodeFragment(fragment.replace(pathStripper, ''));

        if (this._fragment === fragment) {
            return false;
        }

        this._fragment = fragment;

        // If pushState is available, we use it to set the fragment as a real URL.
        if (this._usePushState) {
            this._history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);
            // If hash changes haven't been explicitly disabled, update the hash
            // fragment to store history.
        } else if (this._wantsHashChange) {
            this._updateHash(fragment, options.replace);
            // If you've told us that you explicitly don't want fallback hashchange-
            // based history, then `navigate` becomes a page refresh.
        } else {
            return this._location.assign(url);
        }

        if (options.trigger !== false) {
            return this._loadUrl(fragment, message);
        }

        return false;
    }

    /**
     * Add event listener.
     * @param {string} evt Name of the event.
     * @param {Function} callback Method.
     * @returns {History} this history
     */
    on(evt: string, callback: Function): History {
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
     * @returns {History} this history
     */
    off(evt: string, callback: Function): History {
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
     */
    trigger(evt: string, ...restParams: any[]) {
        const callbacks = this._evtHandlers[evt];
        if (callbacks === undefined) {
            return;
        }
        const callbacksLength = callbacks.length;
        for (let i = 0; i < callbacksLength; i++) {
            callbacks[i].apply(this, restParams);
        }
    }

    /**
     * Update the hash location, either replacing the current entry, or adding
     * a new one to the browser history.
     * @param {string} fragment URL fragment
     * @param {boolean} replace flag
     * @private
     */
    private _updateHash(fragment: string, replace?: boolean) {
        if (replace) {
            const href = this._location.href.replace(/(javascript:|#).*$/, '');
            this._location.replace(href + '#' + fragment);
        } else {
            // Some browsers require that `hash` contains a leading #.
            this._location.hash = '#' + fragment;
        }
    }
}


export class Router {

    static history: History;
    private _evtHandlers = {};
    private _old: any;
    // Copy event bus functionality.
    private trigger = History.prototype.trigger;
    private on = History.prototype.on;
    private off = History.prototype.off;

    /**
     * Constructor for the router.
     * Routers map faux-URLs to actions, and fire events when routes are
     * matched. Creating a new one sets its `routes` hash, if not set statically.
     * @param {Object} options options.root is a string indicating the site's context, defaults to '/'.
     * @constructor
     */
    constructor(options: any = {}) {
        this._bindHandlers(options.map);
    }

    /**
     * Manually bind a single named route to a callback.
     * The route argument may be a routing string or regular expression, each matching capture
     * from the route or regular expression will be passed as an argument to the onCallback.
     * @param {Object} handler The handler entry.
     * @returns {Router} this router
     */
    addHandler(handler: any) {

        const rRoute = Router._routeToRegExp(handler.route);

        Router.history.addHandler(rRoute, (fragment, message?) => {

            const params = Router._extractParameters(rRoute, fragment);

            const paramsAux = params.slice(0);

            const evtRoute: any = {
                new: { fragment: fragment, params: paramsAux, message: message }
            };

            if (this._old) {
                evtRoute.old = { fragment: this._old.fragment, params: this._old.params };
            }

            this.trigger('route:before', evtRoute);
            Router.history.trigger('route:before', this, evtRoute);

            if (evtRoute.canceled) {
                return;
            }

            params.push(evtRoute);

            if (this._old && this._old.handler.deactivate) {
                this._old.handler.deactivate.apply(this._old.handler);
            }

            handler.activate.apply(handler, params);

            this.trigger('route:after', evtRoute);
            Router.history.trigger('route:after', this, evtRoute);

            this._old = { fragment: fragment, params: paramsAux, handler: handler };
        });

        return this;
    }

    /**
     * Simple proxy to `Router.history` to save a fragment into the history.
     * @param {string} fragment Route to navigate to.
     * @param {Object=} message parameters
     * @param {Object=} options parameters
     * @returns {Router} this router
     */
    navigate(fragment: string, message?: any, options?: any): Router {
        Router.history.navigate(fragment, message, options);
        return this;
    }

    /**
     * Bind all defined routes to `Router.history`. We have to reverse the
     * order of the routes here to support behavior where the most general
     * routes can be defined at the bottom of the route map.
     * @param {string} routes list of routes.
     * @private
     */
    private _bindHandlers(routes: any[]) {
        if (!routes) {
            return;
        }
        const routesN = routes.length - 1;
        for (let i = routesN; i >= 0; i--) {
            this.addHandler(routes[i]);
        }
    }

    /**
     * Convert a route string into a regular expression, suitable for matching
     * against the current location fragment.
     * @param {string} route The route
     * @returns {RegExp} the obtained regex
     * @private
     */
    static _routeToRegExp(route: string): RegExp {
        const routeAux = route.replace(escapeRegExp, '\\$&')
            .replace(optionalParam, '(?:$1)?')
            .replace(namedParam, (match, optional) => {
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
     * @returns {string[]} the extracted parameters
     * @private
     */
    static _extractParameters(route: RegExp, fragment: string): string[] {
        const params = route.exec(fragment).slice(1);
        return params.map((param, i) => {
            // Don't decode the search params.
            if (i === params.length - 1) {
                return param;
            }
            return param === undefined ? undefined : decodeURIComponent(param);
        });
    }

}


/**
 * Create the default Router.History.
 * @type {History}
 */
Router.history = new History();
