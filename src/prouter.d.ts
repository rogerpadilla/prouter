declare module prouter {
    interface PathExp extends RegExp {
        keys?: PathExpToken[];
    }
    /**
     * Contract for entry handler.
     */
    interface Handler {
        path: PathExp;
        activate: Function;
    }
    /**
     * Contract for entry handler.
     */
    interface NodeRoute {
        activate: Function;
        request: Request;
    }
    /**
     * Contract for entry handler.
     */
    interface Options {
        mode?: string;
        root?: string;
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
        old?: string;
    }
    interface PathExpToken {
        name: string;
        prefix: string;
        delimiter: string;
        optional: boolean;
        repeat: boolean;
        pattern: string;
    }
    class Router {
        private static _handlers;
        private static _options;
        private static _listening;
        static listen(options: Options): Router;
        static config(options: Options): Router;
        static reset(): Router;
        static use(path: any, activate?: any): Router;
        static getCurrent(): string;
        static navigate(path: string): Router;
        private static _loadCurrent();
        private static _load(path);
        private static _obtainNodeRoutes(fragment);
    }
}
