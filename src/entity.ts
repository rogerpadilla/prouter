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

// Dont delete this dummy class, TS do not create the definition of the file if only interface
export class DummyClassToMakeTsExportThisFile {

}