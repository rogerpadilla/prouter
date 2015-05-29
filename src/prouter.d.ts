declare module prouter {
    /**
     * Contract for entry handler.
     */
    interface Route {
        path: RegExp;
        callback: Function;
        keys: string[];
        alias: string;
        facade?: RoutingLevel;
    }
    /**
     * Contract for entry handler.
     */
    interface NodeRoute {
        alias: string;
        callback: Function;
        params: Object[];
        routes: NodeRoute[];
        rootRerouting: boolean;
    }
    /**
     * Contract for entry handler.
     */
    interface Options {
        mode?: string;
        keys?: boolean;
        root?: string;
        rerouting?: boolean;
    }
    /**
     * Contract for object param.
     */
    interface ObjectParam {
        [index: string]: any;
    }
    class RoutingLevel {
        _options: Options;
        _routes: Route[];
        constructor(_options?: Options);
        config(options: Options): RoutingLevel;
        add(path: any, callback?: Function): RoutingLevel;
        remove(alias: any): RoutingLevel;
        check(fragment: string, nodeRoutes: NodeRoute[], lastURL: string): NodeRoute[];
        drop(): RoutingLevel;
        to(alias: string): RoutingLevel;
    }
    class Router {
        private static _firstLevel;
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
