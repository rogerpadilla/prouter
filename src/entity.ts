export interface ProuterRequestCallback {
  // tslint:disable-next-line:no-any
  (req: ProuterRequest, resp: ProuterResponse, next: ProuterNextMiddleware): any;
}

export interface ProuterPath {
  readonly originalUrl: string;
  path: string;
  queryString: string;
  query: ProuterStringMap;
}

export interface ProuterStringMap {
  // tslint:disable-next-line:no-any
  [prop: string]: any;
}

export interface ProuterPathKey {
  name: string | number;
  prefix: string;
  delimiter: string;
  optional: boolean;
  repeat: boolean;
  pattern: string;
  partial: boolean;
}

export interface ProuterPathExp extends RegExp {
  keys: ProuterPathKey[];
}

export interface ProuterHandler {
  path: string;
  callback: ProuterRequestCallback;
}

export interface ProuterParsedHandler extends ProuterHandler {
  pathExp: ProuterPathExp;
}

export interface ProuterRequest extends ProuterPath {
  listening?: boolean;
  params: ProuterStringMap;
}

export interface ProuterProcessPathOptions {
  preventNavigation?: boolean;
}

export interface ProuterResponse extends ProuterProcessPathOptions {
  end(): void;
}

export interface ProuterRequestProcessor {
  request: ProuterRequest;
  callback: ProuterRequestCallback;
}

export interface ProuterProcessPathCallback {
  (opts?: ProuterProcessPathOptions): void;
}

export interface ProuterNextMiddleware {
  (): void;
}

export interface ProuterGroup {
  handlers: ProuterHandler[];
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
