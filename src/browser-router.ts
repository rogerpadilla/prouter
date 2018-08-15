import { Router } from './router';

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

  push(path: string) {
    return this.processPath(path).then(() => {
      history.pushState(undefined, '', path);
    });
  }

  processCurrentPath() {
    const path = this.getPath();
    return this.processPath(path);
  }

}
