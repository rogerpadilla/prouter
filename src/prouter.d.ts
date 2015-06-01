/**
 * Unobtrusive, forward-thinking and lightweight JavaScript router library.
 */
declare module prouter {
    /**
     * Contracts for static type checking.
     */
    interface Options {
        mode?: string;
        root?: string;
        silent?: boolean;
    }
    interface Path {
        path: string;
        query: Object;
        queryString: string;
    }
    interface PathExp extends RegExp {
        keys?: PathExpToken[];
    }
    interface PathExpToken {
        name: string;
        prefix: string;
        delimiter: string;
        optional: boolean;
        repeat: boolean;
        pattern: string;
    }
    interface Handler {
        pathExp: PathExp;
        activate: Function;
    }
    interface GroupHandler {
        path: any;
        activate: Function;
    }
    interface RequestParams {
        [index: string]: string;
    }
    interface Request extends Path {
        params?: RequestParams;
        oldPath?: string;
    }
    interface RequestProcessor {
        request: Request;
        activate: Function;
    }
    /**
     * Core component for the routing system.
     */
    class Router {
        /** @type {Options} Default options for initializing the router. */
        private static _DEF_OPTIONS;
        /** @type {Options} Options used when initializing the routing system. */
        private static _options;
        /** @type {string} Current loaded path. */
        private static _loadedPath;
        /** @type {Handler[]} Handlers for the routing system. */
        private static _handlers;
        /**
         * Start the routing system, returning `true` if the current URL was loaded,
         * and `false` otherwise.
         * @param {Object} [options] Options
         * @return {boolean} true if the current fragment matched some handler, false otherwise.
         */
        static listen(options: Options): boolean;
        /**
         * Disable the route-change-handling and resets the Router's state, perhaps temporarily.
         * Not useful in a real app; but useful for unit testing.
         * @return {Router} the router.
         */
        static stop(): Router;
        /**
         * Retrieve the current path without the root prefix.
         * @return {string} the current path.
         */
        static getCurrent(): string;
        /**
         * Add the given middleware as a handler for the given path (defaulting to any path).
         * @param {string|Function|RouteGroup} path the fragment or the callback.
         * @param {Function|RouteGroup} [activate] the activate callback or the group of routes.
         * @return {Router} the router.
         */
        static use(path: any, activate?: any): Router;
        /**
         * Change the current path and load it.
         * @param {string} path The fragment to navigate to
         * @returns {boolean} true if the path matched some handler, false otherwise.
         */
        static navigate(path: string): boolean;
        /**
         * Load the current path if already not loaded.
         * @return {boolean} true if loaded, false otherwise.
         */
        private static _loadCurrent();
        /**
         * Attempt to load the given URL fragment. If a route succeeds with a
         * match, returns `true`; if no defined routes matches the fragment,
         * returns `false`.
         * @param {string} path E.g.: 'user/pepito'
         * @returns {boolean} true if the fragment matched some handler, false otherwise.
         */
        private static _load(path);
        /**
         * Extract the handlers from the given arguments.
         * @param  {string} parentPath The parent path of the group of routes.
         * @param  {RouteGroup} routeGroup The group of routes.
         * @param  {Handler[]=[]} [handlers] The holder for extracted handlers.
         * @return {Handler[]} The extracted handlers.
         */
        private static _extractHandlers(parentPath, routeGroup, handlers?);
        /**
         * Obtain the request processors for the given path according to the current handlers in the router.
         * @param  {string} path The url fragment to check.
         * @return {RequestProcessor[]} The obtained request processors.
         */
        private static _obtainRequestProcessors(path);
        /**
         * Extract a request from the given arguments, using decoded parameters.
         * @param {string} path The url fragment.
         * @param {PathExp} [pathExp] The path expression.
         * @returns {Request} The extracted request.
         */
        private static _extractRequest(path, pathExp?);
    }
    /**
     * Allows to use a group of routes as middleware.
     */
    class RouteGroup {
        /** @type {GroupHandler[]} The list of handlers for this group. */
        _handlers: GroupHandler[];
        /**
         * Add the given middleware function as handler for the given path (defaulting to any path).
         * @param {string|Function} path The fragment or the callback.
         * @param {Function} [activate] The activate callback or the group of routes.
         * @return {RouteGroup} The router group.
         */
        use(path: any, activate?: Function): RouteGroup;
    }
}
