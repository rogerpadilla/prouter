import { RequestCallback, Options } from './';
export declare abstract class Router {
    private opts;
    private handlers;
    private res;
    constructor(opts: Options);
    use(path: string, callback: RequestCallback): this;
    protected processPath(path: string): void;
}
