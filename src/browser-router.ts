import { Options } from './';
import { Router } from './router';
import { RouterHelper } from './helper';

export class BrowserRouter extends Router {

  private sent = {};

  constructor(private opts: Options) {

    super();

    this.send = this.send.bind(this);
    this.processCurrentPath = this.processCurrentPath.bind(this);
  }

  send(content: string, target = this.opts.defaultTarget) {

    if (this.sent[target]) {
      throw new Error(`Already sent data to the target '${target}'.`);
    }

    this.sent[target] = true;

    const el = document.querySelector(target);

    if (!el) {
      throw new Error(`No match for the target '${target}'`);
    }

    el.innerHTML = content;
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
    return RouterHelper.trimSlashes(path);
  }

  push(path: string) {
    history.pushState(undefined, '', path);
    this.processPath(path);
  }

  processCurrentPath() {
    const path = this.getPath();
    this.processPath(path);
  }

  protected processPath(path: string) {
    this.sent = {};
    super.processPath(path);
  }

}
