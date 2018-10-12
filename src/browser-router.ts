import { baseRouter } from './router';
import { ProuterSubscriptors, ProuterSubscriptionType, ProuterSubscriptorCallback, ProuterNavigationEvent, ProuterBrowserRouter } from './entity';


export function browserRouter() {

  const baseRouterObj = baseRouter();

  const subscriptors: ProuterSubscriptors = {
    navigation: []
  };

  const processCurrentPath = () => {
    br.processCurrentPath();
  };

  const br: ProuterBrowserRouter = {

    ...baseRouterObj,

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

    push(newPath: string) {
      baseRouterObj.processPath(newPath, opts => {

        if (!opts || !opts.preventNavigation) {

          const oldPath = br.getPath();

          history.pushState(undefined, '', newPath);

          const navigationEvt: ProuterNavigationEvent = {
            oldPath,
            newPath
          };

          subscriptors.navigation.forEach(subscriptor => {
            subscriptor(navigationEvt);
          });
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
