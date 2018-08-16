import { ProuterRequestCallback, ProuterHandler, ProuterProcessPathCallback, ProuterResponse, ProuterNextMiddleware, RouterContract, RouterGroupContract } from './entity';
import { routerHelper } from './helper';

export function buildBasicRouter() {

  let listening = false;
  const handlers: ProuterHandler[] = [];

  const router: RouterContract = {

    // use(path: string, callback: ProuterRequestCallback | RouterGroupContract): RouterContract;

    use(path: string, callback: ProuterRequestCallback | RouterGroupContract): RouterContract {

      if (typeof callback === 'function') {
        const pathExp = routerHelper.stringToRegexp(path);
        handlers.push({ path, pathExp, callback });
      } else {
        for (const handler of callback.handlers) {
          const itPath = path + handler.path;
          const pathExp = routerHelper.stringToRegexp(itPath);
          handlers.push({ path: itPath, pathExp, callback: handler.callback });
        }
      }

      return router;
    },

    listen() {

      if (listening) {
        throw new Error('Already listening.');
      }

      listening = true;
    },

    processPath(path: string, processPathCallback?: ProuterProcessPathCallback) {

      const requestProcessors = routerHelper.obtainRequestProcessors(path, handlers);

      if (requestProcessors.length === 0) {
        return;
      }

      const listeningSnapshop = listening;
      let wasProcessPathCallbackCalled: boolean;
      let index = 0;

      const response: ProuterResponse = {
        end(opts) {
          if (processPathCallback && !wasProcessPathCallbackCalled) {
            wasProcessPathCallbackCalled = true;
            processPathCallback(opts);
          }
        }
      };

      /** Call the middlewares for the given path. */
      const next: ProuterNextMiddleware = () => {

        // If next was called and the last processor was already executed then automatically stop.
        if (index === requestProcessors.length) {
          response.end();
          return;
        }

        const reqProc = requestProcessors[index];
        reqProc.request.listening = listeningSnapshop;

        index++;

        reqProc.callback(reqProc.request, response, next);
      };

      next();
    }
  };

  return router;
}
