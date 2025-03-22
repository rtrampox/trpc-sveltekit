import {
  CreateTRPCClientOptions,
  WebSocketLinkOptions,
  createTRPCClient,
  createWSClient,
  wsLink
} from '@trpc/client';
import { AnyTRPCRouter } from '@trpc/server';

export function createTRPCWebSocketClient<Router extends AnyTRPCRouter>({
  transformer
}: {
  transformer: WebSocketLinkOptions<Router>['transformer'];
}): ReturnType<typeof createTRPCClient<Router>> {
  if (typeof location === 'undefined') return;

  const uri = `${location.protocol === 'http:' ? 'ws:' : 'wss:'}//${location.host}/trpc`;

  const wsClient = createWSClient({
    url: uri
  });

  return createTRPCClient<Router>({
    links: [wsLink({ client: wsClient, transformer: transformer as any })]
  } as CreateTRPCClientOptions<Router>);
}
