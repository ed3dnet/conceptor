<script>
  import { page } from '$app/state';

  // Using Svelte 5 runes
  const status = $derived(page.status);
  const errorMessage = $derived(page.error?.message || 'An error occurred');
</script>

<div class="flex items-center justify-center min-h-screen">
  <div class="card w-96 bg-error text-error-content">
    <div class="card-body">
      <h2 class="card-title">Error {status}</h2>
      <p>{errorMessage}</p>
      <div class="card-actions justify-end">
        <a href="/" class="btn">Go Home</a>
      </div>
    </div>
  </div>
</div>
