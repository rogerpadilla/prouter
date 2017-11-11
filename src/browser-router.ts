import { Options } from './entity';
import { Router } from './router';

export class BrowserRouter extends Router {

  constructor(opts: Options = {
    send: () => {
      throw new Error(`Provide a custom 'send' function if you want to use it from the handler in the browser.`);
    }
  }) {

    super(opts);

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
    history.pushState(undefined, '', path);
    return this.processPath(path);
  }

  processCurrentPath() {
    const path = this.getPath();
    this.processPath(path);
  }

  protected processPath(path: string) {
    return super.processPath(path);
  }

}
