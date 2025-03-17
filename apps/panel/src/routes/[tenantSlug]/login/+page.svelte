<script lang="ts">
  import { page } from '$app/state';
  import { apiClient } from '$lib/api-client.client';
	import type { AuthConnectorPublic, RedirectResponse } from "@myapp/central-client";

  // Using Svelte 5 runes
  const { data } = $props();
  const tenant = $derived(page.data.tenant);
  const { authConnectors, redirectTo } = $derived(data);

  // Function to handle login button click
  async function handleLogin(connector: AuthConnectorPublic) {
    try {
      // Make API call to get redirect URL
      const response = await apiClient.GET(`/{tenantIdOrSlug}/auth/{authConnectorId}/login`, {
        params: {
          path: {
            tenantIdOrSlug: tenant.slug,
            authConnectorId: connector.authConnectorId
          },
          query: {
            redirectUri: redirectTo
          }
        }
      });

      const idpRedirect: RedirectResponse | undefined = response.data;
      if (!idpRedirect) {
        console.error('Failed to get redirect URL', response.error);
        alert('Login failed. Please try again.');
        return;
      }

      window.location.href = idpRedirect.redirectTo;
    } catch (error) {
      console.error('Error initiating login:', error);
      alert('Login failed. Please try again.');
    }
  }
</script>

<div class="card w-96 mx-auto bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Log in to {tenant.displayName}</h2>

    {#if authConnectors.length === 0}
      <div class="alert alert-warning">
        No authentication methods available for this tenant.
      </div>
    {:else}
      <div class="flex flex-col gap-2 mt-4">
        {#each authConnectors as connector}
          <button
            class="btn btn-primary"
            onclick={() => handleLogin(connector)}
          >
            Login with {connector.name}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
