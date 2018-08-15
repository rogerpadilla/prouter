import { ProuterRequestCallback, ProuterHandler, ProuterProcessPathCallback, ProuterOptsProcessPathCallback } from './entity';
import { routerHelper } from './helper';
import { RouterGroup } from './router-group';

export abstract class Router {

  private listening = false;
  private handlers: ProuterHandler[] = [];

  use(path: string, callback: ProuterRequestCallback | RouterGroup) {

    if (callback instanceof RouterGroup) {
      for (const handler of callback.handlers) {
        const itPath = path + handler.path;
        const pathExp = routerHelper.stringToRegexp(itPath);
        this.handlers.push({ path: itPath, pathExp, callback: handler.callback });
      }
    } else {
      const pathExp = routerHelper.stringToRegexp(path);
      this.handlers.push({ path, pathExp, callback });
    }

    return this;
  }

  listen() {

    if (this.listening) {
      throw new Error('Already listening.');
    }

    this.listening = true;
  }

  protected processPath(path: string, processPathCallback?: ProuterProcessPathCallback) {

    const requestProcessors = routerHelper.obtainRequestProcessors(path, this.handlers);

    if (requestProcessors.length === 0) {
      return;
    }

    const listening = this.listening;
    let isProcessPathCallbackCalled: boolean;
    let index = 0;

    const processPathCallbackWrapper: ProuterProcessPathCallback = (opts) => {
      if (!isProcessPathCallbackCalled && processPathCallback) {
        isProcessPathCallbackCalled = true;
        processPathCallback(opts);
      }
    };


    /** Call the middlewares for the given path. */
    const next: ProuterProcessPathCallback = (opts: ProuterOptsProcessPathCallback = {}) => {

      // If next was called and this is the last processor or 'endMode' was passed then call processPathCallbackWrapper and stop here
      if (index === requestProcessors.length || opts.endMode) {
        processPathCallbackWrapper(opts);
        return;
      }

      const reqProc = requestProcessors[index];
      reqProc.request.listening = listening;

      index++;

      reqProc.callback(reqProc.request, next);
    };

    next();
  }

}
