import { Handler, RequestCallback, Response, Options } from './interfaces';
import { RouterHelper } from './helper';

export abstract class Router {

  private handlers: Handler[] = [];
  private res: Response;

  constructor(private opts: Options) {
    this.res = { send: this.opts.send };
  }

  use(path: string, callback: RequestCallback) {
    const pathExp = RouterHelper.stringToRegexp(path);
    this.handlers.push({ pathExp, callback });
    return this;
  }

  protected processPath(path: string) {

    const reqProcessors = RouterHelper.obtainRequestProcessors(path, this.handlers);

    let count = 0;

    /** Anonymous function used for processing routing cycle. */
    const next = () => {

      if (count >= reqProcessors.length) {
        return;
      }

      const reqProc = reqProcessors[count];

      count++;

      reqProc.callback(reqProc.request, this.res, next);
    };

    next();
  }

}
