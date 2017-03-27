import { Options, RouterHelper, Router } from './';

export class BrowserRouter extends Router {

  private static sent: {};

  constructor(opts: Options = { send: BrowserRouter.defaultSend }) {

    if (!opts.send) {
      opts.send = BrowserRouter.defaultSend;
    }

    super(opts);

    addEventListener('popstate', this.processCurrentPath);
  }

  static defaultSend(target: string, content: string) {

    if (BrowserRouter.sent[target]) {
      throw new Error(`Already sent data to the target '${target}'.`);
    }

    BrowserRouter.sent[target] = true;

    const el = document.querySelector(target);

    if (!el) {
      throw new Error(`No match for the selector ${target}`);
    }

    el.innerHTML = content;
  }

  /**
   * Not useful in a real app; but useful for unit testing.
   */
  stop() {
    removeEventListener('popstate', this.processCurrentPath);
  }

  getPath() {
    const path = decodeURI(location.pathname + location.search);
    return RouterHelper.trimSlashes(path);
  }

  push(path: string) {
    history.pushState(null, '', path);
    this.processPath(path);
  }

  protected processPath(path: string) {
    BrowserRouter.sent = {};
    super.processPath(path);
  }

  private processCurrentPath() {
    const path = this.getPath();
    this.processPath(path);
  }

}
