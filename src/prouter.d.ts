/**
 * Interface for declaring contract of handling requests.
 */
export interface RouteCallback {
    (fragment: string, message?: any, evt?: RouteEvent): void;
}
export interface RouteHandler {
    route: string;
    activate: Function;
    deactivate?: Function;
}
export interface NavigationOptions {
    trigger?: boolean;
    replace?: boolean;
}
export interface NavigationData {
    fragment: string;
    params: any[];
    handler?: RouteHandler;
}
export interface RouteEvent {
    new: NavigationData;
    old?: NavigationData;
    canceled?: boolean;
}
export interface HistoryStartOptions {
    root?: string;
    hashChange?: boolean;
    pushState?: boolean;
    silent?: boolean;
}
export interface EntryHandler {
    route: RegExp;
    callback: Function;
}
export interface EventHandler {
    [index: string]: Function[];
}
export interface RouterOptions {
    map?: RouteHandler[];
}
/**
 * Handles cross-browser history management, based on either
 * [pushState](http://diveintohtml5.info/history.html) and real URLs, or
 * [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
 * and URL fragments.
 * @constructor
 */
export declare class History {
    private static _started;
    private _location;
    private _history;
    private _handlers;
    private _evtHandlers;
    private _root;
    private _hasPushState;
    private _wantsHashChange;
    private _wantsPushState;
    private _usePushState;
    private _fragment;
    constructor();
    /**
     * Are we at the app root?
     * @returns {boolean} if we are in the root.
     */
    atRoot(): boolean;
    /**
     *  Unicode characters in `location.pathname` are percent encoded so they're
     *  decoded for comparison. `%25` should not be decoded since it may be part
     *  of an encoded parameter.
     *  @param {string} fragment The url fragment to decode
     *  @returns {string} the decoded fragment.
     */
    private static _decodeFragment(fragment);
    /**
     * Obtain the search.
     * @returns {string} the search.
     */
    getSearch(): string;
    /**
     * Gets the true hash value. Cannot use location.hash directly due to bug
     * in Firefox where location.hash will always be decoded.
     * @returns {string} The hash.
     */
    getHash(): string;
    /**
     *  Get the pathname and search params, without the root.
     *  @returns {string} The path.
     */
    getPath(): string;
    /**
     * Get the cross-browser normalized URL fragment, either from the URL,
     * the hash, or the override.
     * @param {string} fragment The url fragment
     * @returns {string} The fragment.
     */
    getFragment(fragment?: string): string;
    /**
     * Start the route change handling, returning `true` if the current URL matches
     * an existing route, and `false` otherwise.
     * @param {Object} options Options
     * @returns {boolean} true if the current fragment matched some handler, false otherwise.
     */
    start(options?: HistoryStartOptions): boolean;
    /**
     * Disable Router.history, perhaps temporarily. Not useful in a real app,
     * but possibly useful for unit testing Routers.
     */
    stop(): void;
    /**
     * Add a route to be tested when the fragment changes. Routes added later
     * may override previous routes.
     * @param {RegExp} rRoute The route.
     * @param {Function} callback Method to be executed.
     */
    addHandler(rRoute: RegExp, callback: RouteCallback): void;
    /**
     * Checks the current URL to see if it has changed, and if it has,
     * calls `loadUrl`.
     * @returns {boolean} true if navigated, false otherwise.
     * @private
     */
    private _checkUrl();
    /**
     * Attempt to load the current URL fragment. If a route succeeds with a
     * match, returns `true`. If no defined routes matches the fragment,
     * returns `false`.
     * @param {string} fragment E.g.: 'user/pepito'
     * @param {Object} message E.g.: {msg: 'Password changed', type: 'success'}
     * @returns {boolean} true if the fragment matched some handler, false otherwise.
     * @private
     */
    private _loadUrl(fragment?, message?);
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
    navigate(fragment: string, message?: any, options?: NavigationOptions): boolean;
    /**
     * Add event listener.
     * @param {string} evt Name of the event.
     * @param {Function} callback Method.
     * @returns {History} this history
     */
    on(evt: string, callback: Function): History;
    /**
     * Remove event listener.
     * @param {string} evt Name of the event.
     * @param {Function} callback Method.
     * @returns {History} this history
     */
    off(evt: string, callback: Function): History;
    /**
     * Events triggering.
     * @param {string} evt Name of the event being triggered.
     */
    trigger(evt: string, ...restParams: any[]): void;
    /**
     * Update the hash location, either replacing the current entry, or adding
     * a new one to the browser history.
     * @param {string} fragment URL fragment
     * @param {boolean} replace flag
     * @private
     */
    private _updateHash(fragment, replace?);
}
export declare class Router {
    static history: History;
    private _evtHandlers;
    private _old;
    private trigger;
    private on;
    private off;
    /**
     * Constructor for the router.
     * Routers map faux-URLs to actions, and fire events when routes are
     * matched. Creating a new one sets its `routes` hash, if not set statically.
     * @param {Object} options options.root is a string indicating the site's context, defaults to '/'.
     * @constructor
     */
    constructor(options?: RouterOptions);
    /**
     * Manually bind a single named route to a callback.
     * The route argument may be a routing string or regular expression, each matching capture
     * from the route or regular expression will be passed as an argument to the onCallback.
     * @param {Object} handler The handler entry.
     * @returns {Router} this router
     */
    addHandler(handler: RouteHandler): Router;
    /**
     * Simple proxy to `Router.history` to save a fragment into the history.
     * @param {string} fragment Route to navigate to.
     * @param {Object=} message parameters
     * @param {Object=} options parameters
     * @returns {Router} this router
     */
    navigate(fragment: string, message?: any, options?: NavigationOptions): Router;
    /**
     * Bind all defined routes to `Router.history`. We have to reverse the
     * order of the routes here to support behavior where the most general
     * routes can be defined at the bottom of the route map.
     * @param {string} routes list of routes.
     * @private
     */
    private _bindHandlers(routes);
    /**
     * Convert a route string into a regular expression, suitable for matching
     * against the current location fragment.
     * @param {string} route The route
     * @returns {RegExp} the obtained regex
     * @private
     */
    static _routeToRegExp(route: string): RegExp;
    /**
     * Given a route, and a URL fragment that it matches, return the array of
     * extracted decoded parameters. Empty or unmatched parameters will be
     * treated as `null` to normalize cross-browser behavior.
     * @param {RegExp} route The alias
     * @param {string} fragment The url part
     * @returns {string[]} the extracted parameters
     * @private
     */
    static _extractParameters(route: RegExp, fragment: string): string[];
}
