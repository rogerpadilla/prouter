import {
  ProuterSubscriptors,
  ProuterSubscriptionType,
  ProuterSubscriptorCallback,
  ProuterNavigationEvent,
  ProuterBrowserRouter,
  ProuterBrowserOptions,
  ProuterParsedHandler,
  ProuterRequestCallback,
  ProuterGroup,
  ProuterRouter,
  ProuterProcessPathCallback,
  ProuterResponse,
  ProuterProcessPathOptions,
  ProuterNextMiddleware
} from './entity';
import { routerHelper } from './helper';

export function browserRouter(options: ProuterBrowserOptions = {}) {
  const handlers: ProuterParsedHandler[] = [];
  let listening = false;
  let previousPath = routerHelper.getPath();
  const subscriptors: ProuterSubscriptors = {
    navigation: []
  };

  const onPopState = () => {
    const newPath = routerHelper.getPath();
    /* 'popstate' event is also triggered for 'hash' changes (in the URL),
     * ignore them if the 'processHashChange' option is not provided and if the
     * path didn't changed. */
    if (!options.processHashChange && newPath === previousPath) {
      return;
    }
    br.processCurrentPath();
    triggerOnNavigation({ oldPath: previousPath, newPath });
    previousPath = newPath;
  };

  const triggerOnNavigation = (navigationEvt: ProuterNavigationEvent) => {
    subscriptors.navigation.forEach((subscriptor) => {
      subscriptor(navigationEvt);
    });
  };

  const br: ProuterBrowserRouter = {
    listen() {
      if (listening) {
        throw new Error('Already listening.');
      }
      br.processCurrentPath();
      addEventListener('popstate', onPopState);
      listening = true;
    },

    stop() {
      removeEventListener('popstate', onPopState);
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
        end() {
          if (processPathCallback && !wasProcessPathCallbackCalled) {
            wasProcessPathCallbackCalled = true;
            const opts: ProuterProcessPathOptions = { preventNavigation: response.preventNavigation };
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
    },

    getPath: routerHelper.getPath,

    push(newPath: string) {
      br.processPath(newPath, (opts) => {
        if (!opts || !opts.preventNavigation) {
          const oldPath = br.getPath();
          history.pushState(undefined, '', newPath);
          triggerOnNavigation({ oldPath, newPath });
        }
      });
    },

    processCurrentPath() {
      const path = br.getPath();
      br.processPath(path);
    },

    on(type: ProuterSubscriptionType, callback: ProuterSubscriptorCallback) {
      subscriptors[type].push(callback);
    },

    off(type: ProuterSubscriptionType, callback: ProuterSubscriptorCallback) {
      subscriptors[type] = subscriptors[type].filter((cb) => {
        return cb !== callback;
      });
    }
  };

  return br;
}
