import { Options, Router } from './';
export declare class BrowserRouter extends Router {
    private static sent;
    constructor(opts?: Options);
    static defaultSend(target: string, content: string): void;
    /**
     * Not useful in a real app; but useful for unit testing.
     */
    stop(): void;
    getPath(): string;
    push(path: string): void;
    protected processPath(path: string): void;
    private processCurrentPath();
}
