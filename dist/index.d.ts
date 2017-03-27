export * from './helper';
export * from './router';
export * from './browser-router';
export interface Path {
    pathname: string;
    searchObj: any;
    search: string;
}
export interface PathExp extends RegExp {
    keys: PathExpToken[];
}
export interface PathExpToken {
    name: string | number;
    prefix: string;
    delimiter: string;
    optional: boolean;
    repeat: boolean;
    pattern: string;
}
export interface Handler {
    pathExp: PathExp;
    callback: RequestCallback;
}
export interface Request extends Path {
    params?: any;
}
export interface RequestProcessor {
    request: Request;
    callback: RequestCallback;
}
export interface Params {
    [attr: string]: any;
}
export declare type Send = (target: string, content: string) => void;
export interface Response {
    send: Send;
}
export declare type RequestCallback = (req: Request, res: Response, next: () => void) => void;
export interface Options {
    send: Send;
}
