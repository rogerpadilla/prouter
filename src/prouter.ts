/**
 * Unobtrusive, forward-thinking and lightweight JavaScript router library.
 */

declare const window: any;
declare const global: any;

const _global: any = typeof global === 'undefined' ? window : global;

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
    path: string;
    params: NavigationParams;
    query: string;
    message?: any;
    handler?: Handler;
}

/**
 * Contract for route-entry's callback.
 */
export interface HandlerCallback {
    (newRouteData: NavigationData, oldRouteData?: NavigationData): void;
}

/**
 * Contract of route handler.
 */
export interface Handler {
    route: string;
    activate: HandlerCallback;
    deactivate?: HandlerCallback;
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
    map?: Handler[];
}

/**
 * Contract for route-entry's callback.
 */
interface RouteCallback {
    (resource: Resource, newRouteData: NavigationData, oldRouteData?: NavigationData): void;
}

/**
 * Contract for entry handler.
 */
interface Route {
    route: RegExp;
    callback: RouteCallback;
}

/**
 * Contract for entry handler.
 */
export class Resource {
    private _full: string;
    constructor(public path: string, public query?: string) {
        this._full = this.path;
        if (this.query !== undefined && this.query !== null && this.query !== '') {
            this._full += '?' + this.query;
        }
    }
    get full(): string {
        return this._full;
    }
}

/**
 * Contract for event handler.
 */
interface EventHandler {
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

// Cached regex for stripping urls of hash.
const HASH_STRIPPER = /#.*$/;


class RouteHelper {

    /**
     * Escape a regular expression string.
     * @param  {String} str the string to scape
     * @return {String} the escaped string
     */
    private static _escapeString(str: string): string {
        return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1');
    }

    /**
     * Escape the capturing group by escaping special characters and meaning.
     * @param  {String} group the group to escape
     * @return {String} escaped group.
     */
    private static _escapeGroup(group: string): string {
        return group.replace(/([=!:$\/()])/g, '\\$1');
    }

    /**
     * Get the flags for a regexp from the options.
     * @param  {Object} opts the options object for building the flags.
     * @return {String} flags.
     */
    private static _flags(opts: Object): string {
        return opts['sensitive'] ? '' : 'i';
    }

    /**
     * Parse the given uri.
     * @param  {string} uri the url to parse
     * @return {Resource} parsed uri
     */
    static parseFragment(fragment: string): Resource {

        if (fragment === '') {
            return new Resource(fragment);
        }

        const qsPos = fragment.indexOf('?');

        let path: string;
        let query: string;

        fragment = RouteHelper.decodeFragment(fragment).replace(ROUTE_STRIPPER, '');

        if (qsPos >= 0) {
            path = fragment.slice(0, qsPos);
            query = fragment.slice(qsPos + 1);
        } else {
            path = fragment;
        }

        return new Resource(path, query);
    }

    /**
     *  Unicode characters in `location.pathname` are percent encoded so they're
     *  decoded for comparison. `%25` should not be decoded since it may be part
     *  of an encoded parameter.
     *  @param {string} fragment The url fragment to decode
     *  @returns {string} the decoded fragment.
     */
    static decodeFragment(fragment: string): string {
        fragment = fragment.replace(/%25/g, '%2525');
        return _global.decodeURI(fragment);
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
    private _location = _global.location;
    private _history = _global.history;
    private _handlers: Route[] = [];
    private _eventHandlers: EventHandler = {};
    private _root: string;
    private _hasPushState: boolean;
    private _wantsHashChange: boolean;
    private _wantsPushState: boolean;
    private _usePushState: boolean;
    private _fragment: Resource;

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
            const respIt = callbacks[i].apply(this, restParams);
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
    isAtRoot(): boolean {
        const path = this._location.pathname.replace(/[^\/]$/, '$&/');
        return path === this._root && !this._location.search;
    }

    /**
     *  Get the pathname and search params, without the root.
     *  @returns {Resource} The path.
     */
    getCurrentPath(): Resource {

        let path = RouteHelper.decodeFragment(this._location.pathname).slice(this._root.length - 1);

        if (path.charAt(0) === '/') {
            path = path.slice(1);
        }

        const query = _global.decodeURIComponent(this._location.search.slice(1));

        let full = path;

        if (query) {
            full += '?' + query;
        }

        return new Resource(path, query);
    }

    /**
     * Gets the true hash value. Cannot use location.hash directly due to bug
     * in Firefox where location.hash will always be decoded.
     * @returns {Resource} The hash.
     */
    getCurrentHash(): Resource {
        const match = this._location.href.match(/#(.*)$/);
        const path = match ? match[1] : '';
        return RouteHelper.parseFragment(path);
    }

    /**
     * Get the cross-browser normalized URL fragment, either from the URL,
     * the hash, or the override.
     * @param {string} fragment The url fragment
     * @returns {Resource} The fragment.
     */
    obtainFragment(fragment?: string): Resource {

        if (fragment === undefined || fragment === null) {
            if (this._usePushState || !this._wantsHashChange) {
                return this.getCurrentPath();
            }
            return this.getCurrentHash();
        }

        return RouteHelper.parseFragment(fragment);
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

        this._fragment = this.obtainFragment();

        // Normalize root to always include a leading and trailing slash.
        this._root = ('/' + this._root + '/').replace(/^\/{2,}|\/{2,}$/g, '/');

        // Transition from hashChange to pushState or vice versa if both are
        // requested.
        if (this._wantsHashChange && this._wantsPushState) {

            const isAtRoot = this.isAtRoot();

            // If we've started off with a route from a `pushState`-enabled
            // browser, but we're currently in a browser that doesn't support it...
            if (!this._hasPushState && !isAtRoot) {

                const rootAux = this._root.slice(0, -1) || '/';
                this._location.replace(rootAux + '#' + this.getCurrentPath().full);
                // Return immediately as browser will do redirect to new url
                return true;

                // Or if we've started out with a hash-based route, but we're currently
                // in a browser where it could be `pushState`-based instead...
            } else if (this._hasPushState && isAtRoot) {
                this.navigate(this.getCurrentHash().full, null, { replace: true, trigger: false });
            }
        }

        // Depending on whether we're using pushState or hashes, and whether
        // 'onhashchange' is supported, determine how we check the URL state.
        if (this._usePushState) {
            _global.addEventListener('popstate', this._checkUrl, false);
        } else if (this._wantsHashChange) {
            _global.addEventListener('hashchange', this._checkUrl, false);
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
        _global.removeEventListener('popstate', this._checkUrl, false);
        _global.removeEventListener('hashchange', this._checkUrl, false);
        History._started = false;
    }

    /**
     * Add a route to be tested when the fragment changes. Routes added later
     * may override previous routes.
     * @param {RegExp} rRoute The route.
     * @param {RouteCallback} callback Method to be executed.
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
     * @param {any=} message The message.
     * @param {NavigationOptions=} options Options object.
     * @returns {boolean} true if the fragment matched some handler, false otherwise.
     */
    navigate(fragment: string, message?: any, options: NavigationOptions = {}): boolean {

        if (!History._started) {
            return false;
        }

        // Normalize the fragment.
        const resource = this.obtainFragment(fragment);

        this._fragment = resource;

        // Don't include a trailing slash on the root.
        let rootAux = this._root;

        if (resource.path === '') {
            rootAux = rootAux.slice(0, -1) || '/';
        }

        let full = resource.full;

        const url = rootAux + full;

        // Strip the hash.
        full = full.replace(HASH_STRIPPER, '');

        // If pushState is available, we use it to set the fragment as a real URL.
        if (this._usePushState) {
            this._history[options.replace ? 'replaceState' : 'pushState'](null, null, url);
            // If hash changes haven't been explicitly disabled, update the hash
            // fragment to store history.
        } else if (this._wantsHashChange) {
            this._updateHash(full, options.replace);
            // If you've told us that you explicitly don't want fallback hashchange-
            // based history, then `navigate` becomes a page refresh.
        } else {
            return this._location.assign(url);
        }

        if (options.trigger !== false) {
            return this._loadUrl(full, message);
        }

        return false;
    }

    /**
     * Delegates to `_loadUrl`.
     * @returns {boolean} true if loaded, false otherwise.
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
     * @param {any} message E.g.: {msg: 'Password changed', type: 'success'}
     * @returns {boolean} true if the fragment matched some handler, false otherwise.
     * @private
     */
    private _loadUrl(fragment?: string, message?: any): boolean {
        this._fragment = this.obtainFragment(fragment);
        const handlersLength = this._handlers.length;
        for (let i = 0; i < handlersLength; i++) {
            const handler = this._handlers[i];
            if (handler.route.test(this._fragment.path)) {
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
     * @param {RouterOptions} options options.root is a string indicating the site's context, defaults to '/'.
     * @constructor
     */
    constructor(options: RouterOptions = {}) {
        this._bindHandlers(options.map);
    }

    /**
     * Manually bind a single route to a callback.
     * @param {Handler} handler The handler entry.
     * @returns {Router} this router
     */
    addHandler(handler: Handler): Router {

        const rRoute = RouteHelper.stringToRegexp(handler.route);

        Router.history._addHandler(rRoute, (resource, message) => {

            const params = Router._extractParameters(rRoute, resource.path);

            const newRouteData: NavigationData = { path: resource.path, query: resource.query, params, message, handler };

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
     * Given a route, and a path that it matches, return the object of
     * extracted decoded parameters.
     * @param {RegExp} route The alias
     * @param {string} path The uri's path part.
     * @returns {NavigationParams} the extracted parameters
     * @private
     */
    private static _extractParameters(route: RegExp, path: string): NavigationParams {
        const params: NavigationParams = {};
        const result = route.exec(path);
        if (!result) {
            return params;
        }
        const args = result.slice(1);
        const keys = (<any>route).keys;
        for (let i = 0; i < args.length; i++) {
            params[keys[i].name] = _global.decodeURIComponent(args[i]);
        }
        return params;
    }

    /**
     * Bind all defined routes to `Router.history`. We have to reverse the
     * order of the routes here to support behavior where the most general
     * routes can be defined at the bottom of the route map.
     * @param {RouteHandler[]} handlers list of handlers.
     * @private
     */
    private _bindHandlers(handlers: Handler[]) {
        if (!handlers) {
            return;
        }
        for (let i = handlers.length - 1; i >= 0; i--) {
            this.addHandler(handlers[i]);
        }
    }
}


/**
 * Create the default Router.History.
 * @type {History}
 */
Router.history = new History();
