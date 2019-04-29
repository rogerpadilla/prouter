export interface ProuterRequestCallback {
  // tslint:disable-next-line:no-any
  (req: ProuterRequest, resp: ProuterResponse, next: ProuterNextMiddleware): any;
}

export interface ProuterPath {
  readonly originalUrl: string;
  readonly path: string;
  readonly queryString: string;
  readonly query: ProuterStringMap;
}

export interface ProuterStringMap {
  // tslint:disable-next-line:no-any
  [prop: string]: any;
}

export interface ProuterPathKey {
  readonly name: string | number;
  readonly prefix: string;
  readonly delimiter: string;
  readonly optional: boolean;
  readonly repeat: boolean;
  readonly pattern: string;
  readonly partial: boolean;
}

export interface ProuterPathExp extends RegExp {
  keys: ProuterPathKey[];
}

export interface ProuterHandler {
  readonly path: string;
  readonly callback: ProuterRequestCallback;
}

export interface ProuterParsedHandler extends ProuterHandler {
  readonly pathExp: ProuterPathExp;
}

export interface ProuterRequest extends ProuterPath {
  params: ProuterStringMap;
  listening?: boolean;
}

export interface ProuterProcessPathOptions {
  preventNavigation?: boolean;
}

export interface ProuterResponse extends ProuterProcessPathOptions {
  end(): void;
}

export interface ProuterRequestProcessor {
  readonly request: ProuterRequest;
  readonly callback: ProuterRequestCallback;
}

export interface ProuterProcessPathCallback {
  (opts?: ProuterProcessPathOptions): void;
}

export interface ProuterNextMiddleware {
  (): void;
}

export interface ProuterGroup {
  readonly handlers: ProuterHandler[];
  use(path: string, callback: ProuterRequestCallback): ProuterGroup;
}

export interface ProuterRouter {
  use(path: string, callback: ProuterRequestCallback | ProuterGroup): ProuterRouter;
  listen(): void;
  processPath(path: string, processPathCallback?: ProuterProcessPathCallback): void;
}

export interface ProuterBrowserOptions {
  readonly ignoreHashChange?: boolean;
}

export interface ProuterBrowserRouter extends ProuterRouter {
  processCurrentPath(): void;
  getPath(): string;
  push(path: string): void;
  stop(): void;
  on(type: ProuterSubscriptionType, callback: ProuterSubscriptorCallback): void;
  off(type: ProuterSubscriptionType, callback: ProuterSubscriptorCallback): void;
}

export interface ProuterNavigationEvent {
  readonly oldPath: string;
  readonly newPath: string;
}

export interface ProuterSubscriptorCallback {
  (evt: ProuterNavigationEvent): void;
}

export interface ProuterSubscriptors {
  navigation: ProuterSubscriptorCallback[];
}

export type ProuterSubscriptionType = keyof ProuterSubscriptors;

// Dont delete this dummy, TS do not create the definition of the file if only interfaces
export const prouterSomethingToMakeTsToExportThisFile = 1;
