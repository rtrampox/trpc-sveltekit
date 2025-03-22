import type { Router } from '$lib/trpc/router';
import { createTRPCClient } from 'trpc-sveltekit';

let browserClient: ReturnType<typeof createTRPCClient<Router>>;

export function trpc() {
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser && browserClient) return browserClient;
  const client = createTRPCClient<Router>();
  if (isBrowser) browserClient = client;
  return client;
}
