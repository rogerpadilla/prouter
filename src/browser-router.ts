import { ProuterProcessPathCallback, ProuterBrowserRouter, baseRouter } from './';


export function browserRouter() {

    const baseRouterObj = baseRouter();

    const processCurrentPath = () => {
        spread.processCurrentPath();
    };

    const spread = {

        listen() {

            processCurrentPath();

            addEventListener('popstate', processCurrentPath);

            baseRouterObj.listen();
        },

        stop() {
            removeEventListener('popstate', processCurrentPath);
        },

        getPath() {
            const path = decodeURI(location.pathname + location.search);
            return path;
        },

        push(path: string, callback?: ProuterProcessPathCallback) {
            baseRouterObj.processPath(path, (opts) => {

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
            baseRouterObj.processPath(path);
        }
    };

    const browserRouterObj: ProuterBrowserRouter = { ...baseRouterObj, ...spread };

    return browserRouterObj;
}
