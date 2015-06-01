declare module prouter {
    interface Options {
        mode?: string;
        root?: string;
    }
    interface PathExp extends RegExp {
        keys?: PathExpToken[];
    }
    interface Path {
        path: string;
        query: Object;
        queryString: string;
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
    interface Param {
        [index: string]: string;
    }
    interface Request extends Path {
        params?: Param;
        old?: string;
    }
    interface RequestEvent {
        activate: Function;
        request: Request;
    }
    class Router {
        private static _handlers;
        private static _options;
        private static _listening;
        static listen(options: Options): Router;
        static config(options: Options): Router;
        static stop(): Router;
        static getCurrent(): string;
        static navigate(path: string): void;
        static use(path: any, activate?: any): Router;
        private static _loadCurrent();
        private static _load(path);
        private static _obtainHandlers(parentPath, routeGroup, handlers?);
        /**
         * Given a route, and a path that it matches, return the object of
         * extracted decoded parameters.
         * @param {string} path The uri's path part.
         * @param {PathExp} route The alias
         * @returns {NavigationParams} the extracted parameters
         * @private
         */
        private static _obtainRequest(path, pathExp);
        private static _obtainRequestProcessors(path);
    }
    class RouteGroup {
        _handlers: GroupHandler[];
        use(path: any, activate?: Function): void;
    }
}
