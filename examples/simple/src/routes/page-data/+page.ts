import { trpc } from '$lib/trpc/client';
import type { PageLoad } from './$types';

// 👇 this method will be invoked on BOTH the server and the client, as needed ⚠️
export const load: PageLoad = async () => ({
  greeting: await trpc().greeting.query()
});
