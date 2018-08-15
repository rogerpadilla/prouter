import { ProuterRequestCallback } from './entity';

export class RouterGroup {

  private _handlers: { path: string, callback: ProuterRequestCallback }[] = [];

  get handlers() {
    return this._handlers;
  }

  use(path: string, callback: ProuterRequestCallback) {
    this._handlers.push({ path, callback });
    return this;
  }

}
