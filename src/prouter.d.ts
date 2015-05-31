declare module prouter {
    interface PathExp extends RegExp {
        keys?: PathExpToken[];
    }
    /**
     * Contract for entry handler.
     */
    interface Route {
        path: PathExp;
        callback: Function;
        alias: string;
        facade?: RoutingLevel;
    }
    /**
     * Contract for entry handler.
     */
    interface NodeRoute {
        alias: string;
        callback: Function;
        params: Request;
        routes: NodeRoute[];
        rootRerouting: boolean;
    }
    /**
     * Contract for entry handler.
     */
    interface Options {
        mode?: string;
        root?: string;
        rerouting?: boolean;
    }
    interface ParsedPath {
        path: string;
        query: Object;
        queryString: string;
    }
    /**
     * Contract for object param.
     */
    interface Request extends ParsedPath {
        params?: Object;
    }
    interface PathExpToken {
        name: string;
        prefix: string;
        delimiter: string;
        optional: boolean;
        repeat: boolean;
        pattern: string;
    }
    class RoutingLevel {
        _routes: Route[];
        _options: Options;
        constructor(_options?: Options);
        config(options: Options): RoutingLevel;
        add(path: any, callback?: Function): RoutingLevel;
        remove(alias: any): RoutingLevel;
        check(fragment: string, nodeRoutes: NodeRoute[], lastURL: string): NodeRoute[];
        drop(): RoutingLevel;
        to(alias: string): RoutingLevel;
    }
    class Router {
        private static facade;
        private static _eventHandlers;
        private static _lastURL;
        private static _listening;
        static drop(): RoutingLevel;
        static _listen(): void;
        static check(path: string): RoutingLevel;
        static navigate(path: string): RoutingLevel;
        static route(path: string): boolean;
        static config(options: Options): RoutingLevel;
        static to(alias: string): RoutingLevel;
        static add(path: any, callback?: Function): RoutingLevel;
        static remove(alias: string): RoutingLevel;
        static getCurrent(): string;
        /**
         * Add event listener.
         * @param {string} evt Name of the event.
         * @param {Function} callback Method.
         * @returns {History} this history
         */
        static on(evt: string, callback: Function): Router;
        /**
         * Remove event listener.
         * @param {string} evt Name of the event.
         * @param {Function} callback Method.
         * @returns {History} this history
         */
        static off(evt?: string, callback?: Function): Router;
        /**
         * Events triggering.
         * @param {string} evt Name of the event being triggered.
         * @return {boolean} null if not suscriptors, false if the event was cancelled for some suscriptor, true otherwise.
         */
        static trigger(evt: string, ...restParams: any[]): boolean;
        private static _applyNested(nodeRoutes);
        private static _apply(nodeRoutes);
    }
}
