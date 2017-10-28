import * as pathToRegexp from 'path-to-regexp';

import { Path, PathExp, RequestProcessor, Request, Handler } from './entity';


export class RouterHelper {

  stringToRegexp(str: string) {

    const keys: pathToRegexp.Key[] = [];

    const resp = pathToRegexp(str, keys) as PathExp;
    resp.keys = keys;

    return resp;
  }

  parseQuery(str: string) {

    const searchObj = {};

    if (str === '') {
      return searchObj;
    }

    str = str.slice(1);

    const params = str.split('&');

    for (const param of params) {
      const paramKv = param.split('=');
      searchObj[decodeURIComponent(paramKv[0])] = decodeURIComponent(paramKv[1]);
    }

    return searchObj;
  }

  parsePath(path: string) {

    let url: URL | HTMLAnchorElement;

    if (typeof URL === 'function') {
      url = new URL(path, 'http://example.com');
    } else {
      url = document.createElement('a');
      url.href = 'http://example.com' + path;
    }

    const parsedPath: Path = {
      path: url.pathname,
      queryString: url.search,
      query: this.parseQuery(url.search)
    };

    return parsedPath;
  }

  /**
   * Obtain the request processors for the given path according to the handlers in the router.
   */
  obtainRequestProcessors(path: string, handlers: Handler[]) {

    const parsedPath = this.parsePath(path);

    const request = parsedPath as Request;
    request.params = {};

    const requestProcessors: RequestProcessor[] = [];

    for (const handler of handlers) {

      const result = handler.pathExp.exec(request.path);

      if (result) {

        const args = result.slice(1);
        const keys = handler.pathExp.keys;

        for (let i = 0; i < args.length; i++) {
          request.params[keys[i].name] = decodeURIComponent(args[i]);
        }

        requestProcessors.push({ callback: handler.callback, request });
      }
    }

    return requestProcessors;
  }

}


export const routerHelper = new RouterHelper();
