/**
 * Unobtrusive, forward-thinking and lightweight JavaScript router library.
 */

declare const window: any;
declare const global: any;

const root: any = typeof window !== 'undefined' ? window : global;

/**
 * Contract for event handler.
 */
export interface NavigationParams {
    [index: string]: string;
}

/**
 * Contract for navigation data.
 */
export interface NavigationData {
    fragment: string;
    params: NavigationParams;
    queryString: string;
    message?: any;
    handler?: RouteHandler;
}

/**
 * Contract for route-entry's callback.
 */
export interface RouteCallback {
    (fragment: string, newRouteData: NavigationData, oldRouteData?: NavigationData): void;
}

/**
 * Contract of route handler.
 */
export interface RouteHandler {
    route: string;
    activate: RouteCallback;
    deactivate?: RouteCallback;
}

/**
 * Contract for navigation options.
 */
export interface NavigationOptions {
    trigger?: boolean;
    replace?: boolean;
}

/**
 * Contract for History.start options parameters.
 */
export interface HistoryOptions {
    root?: string;
    hashChange?: boolean;
    pushState?: boolean;
    silent?: boolean;
}

/**
 * Contract for Router.constructor options.
 */
export interface RouterOptions {
    map?: RouteHandler[];
}

/**
 * Contract for entry handler.
 */
export interface Route {
    route: RegExp;
    callback: Function;
}

/**
 * Contract for entry handler.
 */
export interface Path {
    fragment: string;
    queryString: string;
}

/**
 * Contract for event handler.
 */
export interface EventHandler {
    [index: string]: Function[];
}




/**
 * The main path matching regexp utility.
 * @type {RegExp} path regexp.
 */
const PATH_STRIPPER = new RegExp([
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
const ROUTE_STRIPPER = /^[#\/]|\s+$/g;
// Cached regex for stripping leading and trailing slashes.
const ROOT_STRIPPER = /^\/{2,}|\/{2,}$/g;
// Cached regex for stripping urls of hash.
const HASH_STRIPPER = /#.*$/;


class RouteHelper {

    /**
     * Escape a regular expression string.
     * @param  {String} str
     * @return {String}
     */
    private static _escapeString(str: string): string {
        return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1');
    }

    /**
     * Escape the capturing group by escaping special characters and meaning.
     * @param  {String} group
     * @return {String} escaped group.
     */
    private static _escapeGroup(group: string): string {
        return group.replace(/([=!:$\/()])/g, '\\$1');
    }

    /**
     * Get the flags for a regexp from the options.
     * @param  {Object} options
     * @return {String} flags.
     */
    private static _flags(options: Object): string {
        return options['sensitive'] ? '' : 'i';
    }


    static removeQueryString(path: string): string {
        const qsPos = path.lastIndexOf('?');
        if (qsPos >= 0) {
            path = path.slice(0, qsPos);
        }
        return path;
    }

    static splitPath(path: string): Path {
        let fragment = path.replace(/#.*/, '');
        let queryString = '';
        const qsPos = fragment.indexOf('?');
        if (qsPos >= 0) {
            queryString = fragment.slice(qsPos + 1);
            fragment = fragment.slice(qsPos);
        }
        return {fragment, queryString};
    }

    /**
     *  Unicode characters in `location.pathname` are percent encoded so they're
     *  decoded for comparison. `%25` should not be decoded since it may be part
     *  of an encoded parameter.
     *  @param {string} fragment The url fragment to decode
     *  @returns {string} the decoded fragment.
     */
    static decodeFragment(fragment: string): string {
        return root.decodeURI(fragment.replace(/%25/g, '%2525'));
    }

    /**
     * Parse a string for the raw tokens.
     * @param  {String} str
     * @return {Array} tokens.
     */
    private static _parse(str: string): Object[] {

        const tokens: Object[] = [];
        let key = 0;
        let index = 0;
        let path = '';
        let res: RegExpExecArray;

        while ((res = PATH_STRIPPER.exec(str))) {

            const m = res[0];
            const escaped = res[1];
            const offset = res.index;

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

            const prefix = res[2];
            const name = res[3];
            const capture = res[4];
            const group = res[5];
            const suffix = res[6];
            const asterisk = res[7];

            const repeat = suffix === '+' || suffix === '*';
            const optional = suffix === '?' || suffix === '*';
            const delimiter = prefix || '/';
            const pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?');

            tokens.push({
                name: name || key++,
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
    }

    /**
     * Expose a function for taking tokens and returning a RegExp.
     * @param  {Array}  tokens
     * @param  {Object} options
     * @return {RegExp} the regexp.
     */
    private static _tokensToRegExp(tokens: Object[], options: Object = {}): RegExp {

        const strict = options['strict'];
        const end = options['end'] !== false;
        let route = '';
        const lastToken = tokens[tokens.length - 1];
        const endsWithSlash = typeof lastToken === 'string' && lastToken.length && lastToken.charAt(lastToken.length - 1) === '/';

        // Iterate over the tokens and create our regexp string.
        for (let i = 0; i < tokens.length; i++) {

            const token: any = tokens[i];

            if (typeof token === 'string') {
                route += RouteHelper._escapeString(token);
            } else {

                const prefix = RouteHelper._escapeString(token.prefix);
                let capture = token.pattern;

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

        // In non-strict mode we allow a slash at the end of match. If the path to
        // match already ends with a slash, we remove it for consistency. The slash
        // is valid at the end of a path match, not in the middle. This is important
        // in non-ending mode, where "/test/" shouldn't match "/test//route".
        if (!strict) {
            route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
        }

        if (end) {
            route += '$';
        } else {
            // In non-ending mode, we need the capturing groups to match as much as
            // possible by using a positive lookahead to the end or next path segment.
            route += strict && endsWithSlash ? '' : '(?=\\/|$)';
        }

        return new RegExp('^' + route, RouteHelper._flags(options));
    }

    /**
     * Create a path regexp from string input.
     * @param  {String} path
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp} the regexp
     */
    static stringToRegexp(path: string, keys: Object[] = [], options?: Object): RegExp {

        const tokens = RouteHelper._parse(path);
        const re = RouteHelper._tokensToRegExp(tokens, options);

        // Attach keys back to the regexp.
        for (let i = 0; i < tokens.length; i++) {
            if (typeof tokens[i] !== 'string') {
                keys.push(tokens[i]);
            }
        }

        re['keys'] = keys;

        return re;
    }
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
    private _handlers: Route[] = [];
    private _eventHandlers: EventHandler = {};
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
     * Add event listener.
     * @param {string} evt Name of the event.
     * @param {Function} callback Method.
     * @returns {History} this history
     */
    on(evt: string, callback: Function): History {
        if (this._eventHandlers[evt] === undefined) {
            this._eventHandlers[evt] = [];
        }
        this._eventHandlers[evt].push(callback);
        return this;
    }

    /**
     * Remove event listener.
     * @param {string} evt Name of the event.
     * @param {Function} callback Method.
     * @returns {History} this history
     */
    off(evt: string, callback: Function): History {
        if (this._eventHandlers[evt]) {
            const callbacks = this._eventHandlers[evt];
            for (let i = 0; i < callbacks.length; i++) {
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
    }

    /**
     * Events triggering.
     * @param {string} evt Name of the event being triggered.
     * @return {boolean} null if not suscriptors, false if the event was cancelled for some suscriptor, true otherwise.
     */
    trigger(evt: string, ...restParams: any[]): boolean {
        const callbacks = this._eventHandlers[evt];
        if (callbacks === undefined || !callbacks.length) {
            return null;
        }
        for (let i = 0; i < callbacks.length; i++) {
            let respIt = callbacks[i].apply(this, restParams);
            // check if some listener cancelled the event.
            if (respIt === false) {
                return false;
            }
        }
        return true;
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
        const path = RouteHelper.decodeFragment(this._location.pathname + this.getSearch()).slice(this._root.length - 1);
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
                return this.getPath();
            }
            return this.getHash();
        }
        return fragment = RouteHelper.decodeFragment(fragment).replace(ROUTE_STRIPPER, '');
    }

    /**
     * Start the route change handling, returning `true` if the current URL matches
     * an existing route, and `false` otherwise.
     * @param {Object} options Options
     * @returns {boolean} true if the current fragment matched some handler, false otherwise.
     */
    start(options: HistoryOptions = {}): boolean {

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
        this._root = ('/' + this._root + '/').replace(ROOT_STRIPPER, '/');

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
    _addHandler(rRoute: RegExp, callback: RouteCallback) {
        this._handlers.unshift({ route: rRoute, callback: callback });
    }

    /**
     * Save a fragment into the hash history, or replace the URL state if the
     * 'replace' option is passed. You are responsible for properly URL-encoding
     * the fragment in advance.
     * The options object can contain `trigger: true` if you wish to have the
     * route callback be fired (not usually desirable), or `replace: true`, if
     * you wish to modify the current URL without adding an entry to the history.
     * @param {string} fragment Fragment to navigate to
     * @param {Object=} message Options object.
     * @param {Object=} options Options object.
     * @returns {boolean} true if the fragment matched some handler, false otherwise.
     */
    navigate(fragment: string, message?: any, options: NavigationOptions = {}): boolean {

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
        fragment = fragment.replace(HASH_STRIPPER, '');

        this._fragment = fragment;

        // If pushState is available, we use it to set the fragment as a real URL.
        if (this._usePushState) {
            this._history[options.replace ? 'replaceState' : 'pushState'](null, null, url);
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
     * Checks the current URL to see if it has changed, and if it has,
     * calls `loadUrl`.
     * @returns {boolean} true if navigated, false otherwise.
     * @private
     */
    private _checkUrl(): boolean {
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
    private _loadUrl(fragment?: string, message?: any): boolean {
        this._fragment = this.getFragment(fragment);
        fragment = RouteHelper.removeQueryString(this._fragment);
        const handlersLength = this._handlers.length;
        for (let i = 0; i < handlersLength; i++) {
            const handler = this._handlers[i];
            if (handler.route.test(fragment)) {
                handler.callback(this._fragment, message);
                return true;
            }
        }
        return false;
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

    // The history object.
    static history: History;
    // The previous route data.
    private _oldRouteData: NavigationData;
    // Copy event bus functionality.
    /* tslint:disable:no-unused-variable */
    private _eventHandlers: EventHandler = {};
    /* tslint:enable:no-unused-variable */
    trigger = History.prototype.trigger;
    on = History.prototype.on;
    off = History.prototype.off;

    /**
     * Constructor for the router.
     * Routers map faux-URLs to actions, and fire events when routes are
     * matched. Creating a new one sets its `routes` hash, if not set statically.
     * @param {Object} options options.root is a string indicating the site's context, defaults to '/'.
     * @constructor
     */
    constructor(options: RouterOptions = {}) {
        this._bindHandlers(options.map);
    }

    /**
     * Manually bind a single named route to a callback.
     * The route argument may be a routing string or regular expression, each matching capture
     * from the route or regular expression will be passed as an argument to the onCallback.
     * @param {Object} handler The handler entry.
     * @returns {Router} this router
     */
    addHandler(handler: RouteHandler) {

        const rRoute = RouteHelper.stringToRegexp(handler.route);

        Router.history._addHandler(rRoute, (fragment, message) => {

            const args: NavigationData = Router._extractParameters(rRoute, fragment);

            const newRouteData: NavigationData = { fragment, params: args.params, queryString: args.queryString, message, handler };

            let next = Router.history.trigger('route:before', this, newRouteData, this._oldRouteData);

            if (next === false) {
                return;
            }

            next = this.trigger('route:before', newRouteData, this._oldRouteData);

            if (next === false) {
                return;
            }

            if (this._oldRouteData && this._oldRouteData.handler.deactivate) {
                next = this._oldRouteData.handler.deactivate.call(this._oldRouteData.handler, newRouteData, this._oldRouteData);
                if (next === false) {
                    return;
                }
            }

            handler.activate.call(handler, newRouteData, this._oldRouteData);

            this.trigger('route:after', newRouteData, this._oldRouteData);
            Router.history.trigger('route:after', this, newRouteData, this._oldRouteData);

            this._oldRouteData = newRouteData;
        });

        return this;
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
    private static _extractParameters(route: RegExp, fragment: string): NavigationData {
        const qsPos = fragment.indexOf('?');
        let queryString = '';
        if (qsPos >= 0) {
            queryString = fragment.slice(qsPos + 1);
            fragment = fragment.slice(0, qsPos);
        }
        const obj: NavigationData = {
            params: {},
            queryString,
            fragment
        };
        const args = route.exec(fragment).slice(1);
        const keys = (<any>route).keys;
        for (let i = 0; i < args.length; i++) {
            obj.params[keys[i].name] = root.decodeURIComponent(args[i]);
        }
        return obj;
    }

    /**
     * Bind all defined routes to `Router.history`. We have to reverse the
     * order of the routes here to support behavior where the most general
     * routes can be defined at the bottom of the route map.
     * @param {string} routes list of routes.
     * @private
     */
    private _bindHandlers(routes: RouteHandler[]) {
        if (!routes) {
            return;
        }
        const routesN = routes.length - 1;
        for (let i = routesN; i >= 0; i--) {
            this.addHandler(routes[i]);
        }
    }
}


/**
 * Create the default Router.History.
 * @type {History}
 */
Router.history = new History();
