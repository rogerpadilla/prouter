import { Response, RequestCallback, Handler, Options } from './entity';
import { routerHelper } from './helper';
import { RouterGroup } from './router-group';

export abstract class Router {

  private listening: boolean;
  private handlers: Handler[] = [];

  constructor(private opts: Options) { }

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

    const response: Response = { send: this.opts.send };

    const requestProcessors = routerHelper.obtainRequestProcessors(path, this.handlers);

    const listening = this.listening;
    let index = 0;

    /** Anonymous function used for processing routing cycle. */
    const next = () => {

      if (index >= requestProcessors.length) {
        return;
      }

      const reqProc = requestProcessors[index];
      reqProc.request.listening = listening;

      index++;

      reqProc.callback(reqProc.request, response, next);
    };

    next();

    return requestProcessors.length;
  }

}
