import { ProuterProcessPathCallback, BrowserRouterContract, buildBasicRouter } from './';


export function buildBrowserRouter() {

    const baseRouter = buildBasicRouter();

    const processCurrentPath = () => {
        spread.processCurrentPath();
    };

    const spread = {

        listen() {

            processCurrentPath();

            addEventListener('popstate', processCurrentPath);

            baseRouter.listen();
        },

        stop() {
            removeEventListener('popstate', processCurrentPath);
        },

        getPath() {
            const path = decodeURI(location.pathname + location.search);
            return path;
        },

        push(path: string, callback?: ProuterProcessPathCallback) {
            baseRouter.processPath(path, (opts) => {

                if (!opts || !opts.preventNavigation) {
                    history.pushState(undefined, '', path);
                }

                if (callback) {
                    callback(opts);
                }
            });
        },

        processCurrentPath() {
            const path = spread.getPath();
            baseRouter.processPath(path);
        }
    };

    const browserRouter: BrowserRouterContract = { ...baseRouter, ...spread };

    return browserRouter;
}
