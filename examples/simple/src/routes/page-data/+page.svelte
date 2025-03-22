<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<h6>Data loaded in<br /><code>+page.ts</code></h6>
<p>{data.greeting}</p>
