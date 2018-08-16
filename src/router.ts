import {
  ProuterRequestCallback, ProuterParsedHandler, ProuterProcessPathCallback, ProuterResponse,
  ProuterNextMiddleware, ProuterRouter, ProuterGroup
} from './entity';
import { routerHelper } from './helper';

export function baseRouter() {

  let listening = false;
  const handlers: ProuterParsedHandler[] = [];

  const baseRouterObj: ProuterRouter = {

    listen() {

      if (listening) {
        throw new Error('Already listening.');
      }

      listening = true;
    },

    use(path: string, callback: ProuterRequestCallback | ProuterGroup): ProuterRouter {

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

      return this;
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

  return baseRouterObj;
}
