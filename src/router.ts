import { RequestCallback, Handler } from './entity';
import { routerHelper } from './helper';
import { RouterGroup } from './router-group';

export abstract class Router {

  private listening = false;
  private handlers: Handler[] = [];

  use(path: string, callback: RequestCallback | RouterGroup) {

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

  protected processPath(path: string) {

    const requestProcessors = routerHelper.obtainRequestProcessors(path, this.handlers);

    const listening = this.listening;

    return new Promise((resolve, reject) => {

      /** Call the middlewares for the given path. */
      const next = (index = 0) => {

        if (index >= requestProcessors.length) {
          resolve();
          return;
        }

        const reqProc = requestProcessors[index];
        reqProc.request.listening = listening;

        const resp = reqProc.callback(reqProc.request);

        const nextIndex = index + 1;

        if (resp instanceof Promise) {
          resp.then(() => {
            next(nextIndex);
          }).catch(promErr => {
            reject(promErr);
          });
        } else {
          next(nextIndex);
        }
      };

      next();
    });
  }

}
