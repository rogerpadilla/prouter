import { ProuterRequestCallback, ProuterGroup } from './entity';


export function buildRouterGroup() {

  const handlers: { path: string, callback: ProuterRequestCallback }[] = [];

  const groupObj: ProuterGroup = {

    handlers,

    use(path: string, callback: ProuterRequestCallback) {
      handlers.push({ path, callback });
      return groupObj;
    }

  };

  return groupObj;

}
