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
 * - Written in [ESNext](https://babeljs.io/) for the future and transpiled to ES5 with UMD format for right now.
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
declare module easyRouter {
    /**
     * Interface for declaring contract of handling requests.
     */
    interface RequestHandler {
        (fragment: string, message?: any): void;
    }
    /**
     * Handles cross-browser history management, based on either
     * [pushState](http://diveintohtml5.info/history.html) and real URLs, or
     * [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
     * and URL fragments.
     * @constructor
     */
    class History {
        private static _started;
        private _location;
        private _history;
        private _handlers;
        private _evtHandlers;
        private _root;
        private _hasPushState;
        private _wantsHashChange;
        private _wantsPushState;
        private _fragment;
        constructor();
        /**
         * Are we at the app root?
         * @returns {boolean} if we are in the root.
         */
        atRoot(): boolean;
        /**
         * Gets the true hash value. Cannot use location.hash directly due to bug
         * in Firefox where location.hash will always be decoded.
         * @returns {string} The hash.
         */
        getHash(): string;
        /**
         * Get the cross-browser normalized URL fragment, either from the URL,
         * the hash, or the override.
         * @param {string} fragment The url fragment
         * @param {boolean} forcePushState flag to force the usage of pushSate
         * @returns {string} The fragment.
         */
        getFragment(fragment?: string, forcePushState?: boolean): string;
        /**
         * Start the route change handling, returning `true` if the current URL matches
         * an existing route, and `false` otherwise.
         * @param {Object} options Options
         * @returns {boolean} true if the current fragment matched some handler, false otherwise.
         */
        start(options?: any): boolean;
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
        addHandler(rRoute: RegExp, callback: RequestHandler): void;
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
        navigate(fragment: string, message?: any, options?: any): any;
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
}
