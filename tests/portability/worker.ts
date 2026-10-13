import { createLocalApp } from '../../src/core/app/local-app';
export default { fetch: (request: Request, environment: any) => createLocalApp(environment).fetch(request, environment) };
