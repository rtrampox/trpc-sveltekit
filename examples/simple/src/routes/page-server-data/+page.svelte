<script lang="ts">
  import type { PageServerData } from './$types';

  let { data }: { data: PageServerData } = $props();
</script>

<h6>Data loaded in<br /><code>+page.ts</code></h6>
<p>{data.greeting}</p>
