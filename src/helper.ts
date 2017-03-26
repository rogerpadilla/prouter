import * as pathToRegexp from 'path-to-regexp';

import { Path, PathExp, RequestProcessor, Request, Handler } from './interfaces';


export class RouterHelper {

  private static LEADING_SLASHES_STRIPPER = /^\/+|\/+$/;

  static stringToRegexp(str: string) {
    return pathToRegexp(str);
  }

  static parseSearch(str: string) {

    const searchObj = {};

    if (str === '') {
      return searchObj;
    }

    if (str.charAt(0) === '?') {
      str = str.slice(1);
    }

    const params = str.split('&');

    for (const param of params) {
      const paramKv = param.split('=');
      searchObj[decodeURIComponent(paramKv[0])] = decodeURIComponent(paramKv[1]);
    }

    return searchObj;
  }

  static parsePath(path: string) {

    let url: URL | HTMLAnchorElement;

    if (typeof URL === 'function') {
      url = new URL(path, 'http://example.com');
    } else {
      url = document.createElement('a');
      url.href = 'http://example.com/' + path;
    }

    const parsedPath: Path = {
      pathname: RouterHelper.trimSlashes(url.pathname),
      search: url.search,
      searchObj: RouterHelper.parseSearch(url.search)
    };

    return parsedPath;
  }

  static trimSlashes(str: string) {
    return str.replace(RouterHelper.LEADING_SLASHES_STRIPPER, '');
  }

  /**
   * Obtain the request processors for the given path according to the handlers in the router.
   */
  static obtainRequestProcessors(path: string, handlers: Handler[]) {

    const parsedPath = RouterHelper.parsePath(path);

    const request: Request = RouterHelper.parsePath(path);
    request.params = {};

    const requestProcessors: RequestProcessor[] = [];

    for (const handler of handlers) {

      const hasProcessor = handler.pathExp.test(parsedPath.pathname);

      if (hasProcessor) {
        RouterHelper.populateRequest(request, handler.pathExp);
        requestProcessors.push({ callback: handler.callback, request });
      }
    }

    return requestProcessors;
  }

  private static populateRequest(request: Request, pathExp: PathExp) {

    const result = pathExp.exec(request.pathname);
    const args = result ? result.slice(1) : [];
    const keys = pathExp.keys;

    for (let i = 0; i < args.length; i++) {
      if (args[i] !== undefined) {
        request.params[keys[i].name] = decodeURIComponent(args[i]);
      }
    }

    return request;
  }

}
