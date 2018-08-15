import * as pathToRegexp from 'path-to-regexp';

export interface RequestCallback {
  // tslint:disable-next-line:no-any
  (req: Request): any;
}

export interface Path {
  originalUrl: string;
  path: string;
  queryString: string;
  query: StringMap;
}

export interface StringMap {
  [prop: string]: number | boolean | string;
}

export interface PathExp extends RegExp {
  keys: pathToRegexp.Key[];
}

export interface Handler {
  path: string;
  pathExp: PathExp;
  callback: RequestCallback;
}

export interface Request extends Path {
  listening?: boolean;
  params: StringMap;
}

export interface RequestProcessor {
  request: Request;
  callback: RequestCallback;
}


// Dont delete this dummy, TS do not create the definition of the file if only interface
export const prouterSomethingToMakeTsToExportThisFile = 1;
