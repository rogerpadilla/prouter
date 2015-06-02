/**
 * Unobtrusive, forward-thinking and lightweight JavaScript router library.
 */
declare module prouter {
    /**
     * Contracts for static type checking.
     */
    interface Options {
        usePushState?: boolean;
        hashChange?: boolean;
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
        /** @type {string} Root path. */
        private static _root;
        /** @type {Handler[]} Handlers for the routing system. */
        private static _handlers;
        /** @type {string} Last loaded path. */
        private static _loadedPath;
        /** @type {boolean} Is hashChange desired? */
        private static _wantsHashChange;
        /** @type {boolean} Is pushState desired and supportted in the current browser? */
        private static _usePushState;
        /**
         * Start the routing system, returning `true` if the current URL was loaded for some handler,
         * and `false` otherwise.
         * @param {Object = {}} [options] The initialization options for the Router.
         * @return {boolean} true if the current fragment matched some handler, false otherwise.
         */
        static listen(options?: Options): boolean;
        /**
         * Disable the route-change-handling and resets the Router's state, perhaps temporarily.
         * Not useful in a real app; but useful for unit testing.
         * @return {Router} The router.
         */
        static stop(): Router;
        /**
         * Retrieve the current path without the root prefix.
         * @return {string} The current path.
         */
        static getCurrent(): string;
        /**
         * Add the given middleware as a handler for the given path (defaulting to any path).
         * @param {string|Function|RouteGroup} path The fragment or the callback.
         * @param {Function|RouteGroup} [activate] The activate callback or the group of routes.
         * @return {Router} The router.
         */
        static use(path: any, activate?: any): Router;
        /**
         * Change the current path and load it.
         * @param {string} path The fragment to navigate to.
         * @returns {boolean} true if the path matched some handler, false otherwise.
         */
        static navigate(path: string): boolean;
        /**
         * Load the current path only if it has not been already heeded.
         * @return {boolean} true if loaded, false otherwise.
         */
        static heedCurrent(): boolean;
        /**
         * Attempt to loads the handlers matching the given URL fragment.
         * @param {string} path The url fragment, e.g.: 'users/pinocho'
         * @returns {boolean} true if the fragment matched some handler, false otherwise.
         */
        static load(path: string): boolean;
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
