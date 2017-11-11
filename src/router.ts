import { Response, RequestCallback, Handler, Options } from './entity';
import { routerHelper } from './helper';
import { RouterGroup } from './router-group';

export abstract class Router {

  private listening: boolean;
  private handlers: Handler[] = [];

  constructor(private opts: Options) {  }

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

    let count = 0;
    const listening = this.listening;

    /** Anonymous function used for processing routing cycle. */
    const next = () => {

      if (count >= requestProcessors.length) {
        return;
      }

      const reqProc = requestProcessors[count];
      reqProc.request.listening = listening;

      count++;

      reqProc.callback(reqProc.request, response, next);
    };

    next();

    return requestProcessors.length;
  }

}
