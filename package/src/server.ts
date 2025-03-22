import type { Handle, RequestEvent } from '@sveltejs/kit';
import type { AnyTRPCRouter, TRPCProcedureType, TRPCError, inferRouterContext } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { ResponseMetaFn } from '@trpc/server/http';
import { serialize, type CookieSerializeOptions } from 'cookie';
import type { ValidRoute } from './ValidRoute';

/**
 * Create a SvelteKit handle function for tRPC requests.
 *
 * If you want to use it in conjunction with other SvelteKit handles,
 * consider [the sequence helper function](https://kit.svelte.dev/docs/modules#sveltejs-kit-hooks).
 * @see https://kit.svelte.dev/docs/hooks
 *
 * @deprecated Use `fetchRequestHandler` from `@trpc/server/adapters/fetch` instead. See the example below.
 * ```ts
 *   // src/routes/api/trpc/[...paths]/+server.ts
 *
 *   import type { RequestHandler } from '@sveltejs/kit';
 *   import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
 *
 *   import { appRouter, createTRPCContext } from '$lib/trpc';
 *
 *   const handler: RequestHandler = async ({ request, event }) => {
 *     return fetchRequestHandler({
 *       router: appRouter,
 *       endpoint: '/api/trpc',
 *       req: request,
 *       createContext: ({ resHeaders }) => createTRPCContext({ event, resHeaders }),
 *       // responseMeta
 *       // onError
 *     });
 *   };
 * ```
 */
export function createTRPCHandle<Router extends AnyTRPCRouter, URL extends string>({
  router,
  url = '/trpc',
  createContext,
  responseMeta,
  onError
}: {
  /**
   * The tRPC router to use.
   * @see https://trpc.io/docs/router
   */
  router: Router;

  /**
   * The tRPC api endpoint URL.
   * @default '/trpc'
   */
  url?: ValidRoute<URL>;

  /**
   * A function that returns the tRPC context.
   * @see https://trpc.io/docs/context
   */
  createContext?: (
    event: RequestEvent
  ) => inferRouterContext<Router> | Promise<inferRouterContext<Router>>;

  /**
   * A function that returns the response meta.
   * @see https://trpc.io/docs/caching#using-responsemeta-to-cache-responses
   */
  responseMeta?: ResponseMetaFn<Router>;

  /**
   * A function that is called when an error occurs.
   * @see https://trpc.io/docs/error-handling#handling-errors
   */
  onError?: (opts: {
    ctx?: inferRouterContext<Router>;
    error: TRPCError;
    path: string;
    input: unknown;
    req: RequestInit;
    type: TRPCProcedureType;
  }) => void;
}): Handle {
  return async ({ event, resolve }) => {
    if (event.url.pathname.startsWith(url + '/')) {
      const request = event.request as Request & {
        headers: Record<string, string | string[]>;
      };

      // Using the default `event.setHeaders` and `event.cookies` will not work
      // as the event is not resolved by SvelteKit. Instead, we "proxy" the access
      // to the headers.
      const originalSetHeaders = event.setHeaders;
      const originalSetCookies = event.cookies.set;
      const originalDeleteCookies = event.cookies.delete;

      const headersProxy: Record<string, string> = {};
      const cookiesProxy: Record<string, { value: string; options: CookieSerializeOptions }> = {};

      // Same as the one provided from sveltekit
      const defaultCookiesOptions: CookieSerializeOptions = {
        httpOnly: true,
        sameSite: 'lax',
        secure: event.url.hostname === 'localhost' && event.url.protocol === 'http:' ? false : true
      };

      event.setHeaders = (headers) => {
        for (const [key, value] of Object.entries(headers)) {
          headersProxy[key] = value;
        }
        // Still call the original `event.setHeaders` function, as it may be used in SvelteKit internals.
        originalSetHeaders(headers);
      };

      event.cookies.set = (name, value, options) => {
        cookiesProxy[name] = { value, options: { ...defaultCookiesOptions, ...options } };
        originalSetCookies(name, value, options);
      };

      event.cookies.delete = (name, options) => {
        cookiesProxy[name] = { value: '', options: { ...options, maxAge: 0 } };
        originalDeleteCookies(name, options);
      };

      const httpResponse = await fetchRequestHandler({
        router,
        req: request,
        endpoint: event.url.pathname.substring(url.length + 1),
        createContext: async () => createContext?.(event),
        responseMeta,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: onError as any
      });

      const { status, headers, body } = httpResponse;

      const finalHeaders = new Headers();

      for (const [key, value] of Object.entries(headers)) {
        finalHeaders.set(key, value);
      }
      for (const [key, value] of Object.entries(headersProxy)) {
        finalHeaders.set(key, value);
      }

      if (Object.keys(cookiesProxy).length > 0) {
        for (const [name, { value, options }] of Object.entries(cookiesProxy)) {
          const serializedCookie = serialize(name, value, options);
          finalHeaders.append('Set-Cookie', serializedCookie);
        }
      }

      return new Response(body, { status, headers: finalHeaders });
    }

    return resolve(event);
  };
}
