import * as pathToRegexp from 'path-to-regexp';

export interface ProuterRequestCallback {
  // tslint:disable-next-line:no-any
  (req: ProuterRequest, resp: ProuterResponse, next: ProuterNextMiddleware): any;
}

export interface ProuterPath {
  originalUrl: string;
  path: string;
  queryString: string;
  query: ProuterStringMap;
}

export interface ProuterStringMap {
  // tslint:disable-next-line:no-any
  [prop: string]: any;
}

export interface ProuterPathExp extends RegExp {
  keys: pathToRegexp.Key[];
}

export interface ProuterHandler {
  path: string;
  pathExp: ProuterPathExp;
  callback: ProuterRequestCallback;
}

export interface ProuterRequest extends ProuterPath {
  listening?: boolean;
  params: ProuterStringMap;
}

export interface ProuterResponse {
  end: ProuterProcessPathCallback;
}

export interface ProuterRequestProcessor {
  request: ProuterRequest;
  callback: ProuterRequestCallback;
}

export interface ProuterOptsProcessPathCallback {
  preventNavigation?: boolean;
}

export interface ProuterProcessPathCallback {
  (opts?: ProuterOptsProcessPathCallback): void;
}

export interface ProuterNextMiddleware {
  (): void;
}


// Dont delete this dummy, TS do not create the definition of the file if only interface
export const prouterSomethingToMakeTsToExportThisFile = 1;
