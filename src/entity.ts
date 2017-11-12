import * as pathToRegexp from 'path-to-regexp';

export type Send = (content: string) => void;
export type RequestCallback = (req: Request, res: Response, next: () => void) => void;

export interface Path {
  originalUrl: string;
  path: string;
  queryString: string;
  query: StringMap;
}

export interface StringMap {
  [prop: string]: any;
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

export interface Response {
  send: Send;
}

export interface Options {
  send: Send;
}
