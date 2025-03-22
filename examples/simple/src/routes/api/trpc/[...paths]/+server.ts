import type { RequestHandler } from '@sveltejs/kit';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { createContext } from '$lib/trpc/context';
import { router } from '$lib/trpc/router';

const handler: RequestHandler = async (event) => {
  return fetchRequestHandler({
    router,
    endpoint: '/api/trpc',
    req: event.request,
    createContext: () => createContext(event)
    // responseMeta
    // onError
  });
};

export { handler as GET, handler as POST };
