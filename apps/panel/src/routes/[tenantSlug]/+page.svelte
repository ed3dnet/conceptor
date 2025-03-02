<script lang="ts">
  import { page } from '$app/state';

  // Svelte 5 runes approach
  const data = $derived(page.data);
  const tenant = $derived(data.tenant);
  const user = $derived(data.user);

  // This could be further simplified with destructuring in a single derived call
  // const { tenant, user } = $derived(page.data);
</script>

<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Welcome to {tenant.displayName}</h2>

    {#if user}
      <p>You are logged in as {user.displayName}</p>
    {:else}
      <p>Please log in to continue</p>
    {/if}

    <div class="card-actions justify-end">
      <button class="btn btn-primary">Get Started</button>
    </div>
  </div>
</div>
