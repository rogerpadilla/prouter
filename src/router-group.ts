import { ProuterRequestCallback, ProuterGroup } from './entity';


export function buildRouterGroup() {

  const groupObj: ProuterGroup = {

    handlers: [],

    use(path: string, callback: ProuterRequestCallback) {
      groupObj.handlers.push({ path, callback });
      return groupObj;
    }

  };

  return groupObj;

}
