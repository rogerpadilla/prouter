import { baseRouter } from './router';
import {
  ProuterSubscriptors,
  ProuterSubscriptionType,
  ProuterSubscriptorCallback,
  ProuterNavigationEvent,
  ProuterBrowserRouter,
  ProuterBrowserOptions
} from './entity';
import { routerHelper } from './helper';

export function browserRouter(options: ProuterBrowserOptions = {}) {
  const baseRouterObj = baseRouter();

  const subscriptors: ProuterSubscriptors = {
    navigation: []
  };

  let previousPath = routerHelper.getPath();

  const onPopState = () => {
    const newPath = routerHelper.getPath();
    /* 'popstate' event is also triggered for 'hash' changes (in the URL),
     * ignore them if the 'ignoreHashChange' option is provided and if the
     * path didn't changed. */
    if (options.ignoreHashChange && newPath === previousPath) {
      return;
    }
    br.processCurrentPath();
    triggerOnNavigation({ oldPath: previousPath, newPath });
    previousPath = newPath;
  };

  const triggerOnNavigation = (navigationEvt: ProuterNavigationEvent) => {
    subscriptors.navigation.forEach(subscriptor => {
      subscriptor(navigationEvt);
    });
  };

  const br: ProuterBrowserRouter = {
    ...baseRouterObj,

    listen() {
      br.processCurrentPath();
      addEventListener('popstate', onPopState);
      baseRouterObj.listen();
    },

    stop() {
      removeEventListener('popstate', onPopState);
    },

    getPath: routerHelper.getPath,

    push(newPath: string) {
      baseRouterObj.processPath(newPath, opts => {
        if (!opts || !opts.preventNavigation) {
          const oldPath = br.getPath();
          history.pushState(undefined, '', newPath);
          triggerOnNavigation({ oldPath, newPath });
        }
      });
    },

    processCurrentPath() {
      const path = br.getPath();
      baseRouterObj.processPath(path);
    },

    on(type: ProuterSubscriptionType, callback: ProuterSubscriptorCallback) {
      subscriptors[type].push(callback);
    },

    off(type: ProuterSubscriptionType, callback: ProuterSubscriptorCallback) {
      subscriptors[type] = subscriptors[type].filter(cb => {
        return cb !== callback;
      });
    }
  };

  return br;
}
