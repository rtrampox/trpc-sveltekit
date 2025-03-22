import { getRequestEvent } from '$app/server';
import {
  httpBatchLink,
  HTTPBatchLinkOptions,
  createTRPCClient as internalCreateTRPCClient,
  type HTTPHeaders,
  type TRPCLink
} from '@trpc/client';
import type { AnyTRPCRouter } from '@trpc/server';
import { page } from '$app/state';

type CreateTRPCClientOptions<Router extends AnyTRPCRouter> = (
  | {
      links?: never;

      /**
       * The tRPC api endpoint URL.
       * @default '/trpc'
       */
      url?: `/${string}`;

      /**
       * Additional headers to send with the request. Can be a function that returns headers.
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Headers
       */
      headers?: HTTPHeaders | (() => HTTPHeaders | Promise<HTTPHeaders>);
    }
  | {
      /**
       * A custom list of links to use for the tRPC Client instead of the default one.
       * @see https://trpc.io/docs/links
       */
      links: TRPCLink<Router>[];

      url?: never;
      init?: never;
      headers?: never;
    }
) & {
  /**
   * A function that transforms the data before transferring it.
   * @see https://trpc.io/docs/data-transformers
   */
  transformer?: HTTPBatchLinkOptions<Router['_def']['_config']['$types']>['transformer'];
};

/**
 * Create a tRPC client.
 * @see https://trpc.io/docs/vanilla
 */
export function createTRPCClient<Router extends AnyTRPCRouter>(
  { links, url, transformer, headers }: CreateTRPCClientOptions<Router> = {
    url: '/trpc'
  }
) {
  let appUrl: string;
  let appFetch: Window['fetch'];

  try {
    // try to get the request event if we're on the server
    const event = getRequestEvent();
    appFetch = event.fetch;
    appUrl = event.url.origin;
  } catch {
    // as the getRequestEvent throws on client, we will catch and fallback to defaults.
    appFetch = fetch;
    appUrl = page.url.origin ?? location.origin;
  }

  if (links) return internalCreateTRPCClient<Router>({ links });

  return internalCreateTRPCClient<Router>({
    links: [
      httpBatchLink({
        url: `${appUrl}${url}`,
        fetch: (input, init) => appFetch(input, { credentials: 'same-origin', ...init }),
        transformer: transformer as any,
        headers
      })
    ]
  });
}
