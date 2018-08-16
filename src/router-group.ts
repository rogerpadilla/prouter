import { ProuterRequestCallback, RouterGroupContract } from './entity';


export function buildRouterGroup() {

  const handlers: { path: string, callback: ProuterRequestCallback }[] = [];

  const group: RouterGroupContract = {

    handlers,

    use(path: string, callback: ProuterRequestCallback) {
      handlers.push({ path, callback });
      return group;
    }

  };

  return group;

}
