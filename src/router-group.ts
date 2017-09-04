import { RequestCallback } from './';

export class RouterGroup {

  private _handlers: { path: string, callback: RequestCallback }[] = [];

  get handlers() {
    return this._handlers;
  }

  use(path: string, callback: RequestCallback) {
    this._handlers.push({ path, callback });
    return this;
  }

}
