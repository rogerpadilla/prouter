import { Response, RequestCallback } from './';
import { Handler } from './entity';
import { RouterHelper } from './helper';
import { RouterGroup } from './router-group';

export abstract class Router {

  private listening: boolean;
  private handlers: Handler[] = [];

  abstract send(content: string, target?: string): void;

  use(path: string, callback: RequestCallback | RouterGroup) {

    if (callback instanceof RouterGroup) {
      for (const handler of callback.handlers) {
        const itPath = path + '/' + handler.path;
        const pathExp = RouterHelper.stringToRegexp(itPath);
        this.handlers.push({ path: itPath, pathExp, callback: handler.callback });
      }
    } else {
      const pathExp = RouterHelper.stringToRegexp(path);
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

    const response: Response = { send: this.send };

    const requestProcessors = RouterHelper.obtainRequestProcessors(path, this.handlers);

    let count = 0;

    /** Anonymous function used for processing routing cycle. */
    const next = () => {

      if (count >= requestProcessors.length) {
        return;
      }

      const reqProc = requestProcessors[count];
      reqProc.request.listening = this.listening;

      count++;

      reqProc.callback(reqProc.request, response, next);
    };

    next();
  }

}
