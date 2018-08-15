import { ProuterRequestCallback, ProuterHandler, ProuterProcessPathCallback, ProuterResponse, ProuterNextMiddleware } from './entity';
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
      reqProc.request.listening = listening;

      index++;

      reqProc.callback(reqProc.request, response, next);
    };

    next();
  }

}
