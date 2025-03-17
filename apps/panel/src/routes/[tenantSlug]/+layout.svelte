<script lang="ts">
  import { setContext } from 'svelte';
  import { page } from '$app/state';
  import { apiClient, apiClientStore } from '$lib/api-client.client';

  // Get children from props using Svelte 5 runes
  let { children } = $props();

  // Using Svelte 5 runes
  const tenant = $derived(page.data.tenant);
  const user = $derived(page.data.user);

  // Make the API client available to all children via context
  setContext('apiClient', apiClient);
  setContext('apiClientStore', apiClientStore);
</script>

<svelte:head>
  <title>{tenant.displayName} - Conceptor</title>
</svelte:head>

<div class="app">
  {#if user}
    <header class="bg-base-200 shadow">
      <div class="container mx-auto px-4 py-2 flex justify-between items-center">
        <h1 class="text-xl font-bold">{tenant.displayName}</h1>
        <div class="flex items-center gap-4">
          <span>{user.displayName}</span>
          <div class="avatar">
            {#if user.avatarUrl}
              <div class="w-10 rounded-full">
                <img src={user.avatarUrl} alt="User avatar" />
              </div>
            {:else}
              <div class="w-10 rounded-full bg-primary text-primary-content grid place-items-center">
                {user.displayName.charAt(0)}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </header>
  {/if}

  <main class="container mx-auto p-4">
    {@render children()}
  </main>
</div>
