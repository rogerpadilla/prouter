import { Router } from './router';
import { ProuterProcessPathCallback } from './entity';

export class BrowserRouter extends Router {

  constructor() {
    super();
    this.processCurrentPath = this.processCurrentPath.bind(this);
  }

  listen() {

    this.processCurrentPath();

    addEventListener('popstate', this.processCurrentPath);

    super.listen();
  }

  stop() {
    removeEventListener('popstate', this.processCurrentPath);
  }

  getPath() {
    const path = decodeURI(location.pathname + location.search);
    return path;
  }

  push(path: string, callback?: ProuterProcessPathCallback) {
    this.processPath(path, (opts) => {

      if (!opts || !opts.preventNavigation) {
        history.pushState(undefined, '', path);
      }

      if (callback) {
        callback(opts);
      }
    });
  }

  processCurrentPath() {
    const path = this.getPath();
    this.processPath(path);
  }

}
