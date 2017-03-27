import * as pathToRegexp from 'path-to-regexp';
import { Path, RequestProcessor, Handler } from './';
export declare class RouterHelper {
    private static LEADING_SLASHES_STRIPPER;
    static stringToRegexp(str: string): pathToRegexp.PathRegExp;
    static parseSearch(str: string): {};
    static parsePath(path: string): Path;
    static trimSlashes(str: string): string;
    /**
     * Obtain the request processors for the given path according to the handlers in the router.
     */
    static obtainRequestProcessors(path: string, handlers: Handler[]): RequestProcessor[];
    private static populateRequest(request, pathExp);
}
