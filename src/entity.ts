import * as pathToRegexp from 'path-to-regexp';

export type Send = (content: string, target?: string) => void;
export type RequestCallback = (req: Request, res: Response, next: () => void) => void;

export interface Path {
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
  session: {
    userId: number
  };
}

export interface RequestProcessor {
  request: Request;
  callback: RequestCallback;
}

export interface Response {
  send: Send;
}

export interface Options {
  defaultTarget: string;
}

export class Person {
  
}