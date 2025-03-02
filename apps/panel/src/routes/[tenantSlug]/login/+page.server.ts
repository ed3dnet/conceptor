import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals }) => {
  const { tenantSlug } = params;
  const redirectTo = url.searchParams.get('redirectTo') || `/${tenantSlug}`;

  // Fetch auth connectors for this tenant
  const connectorsResponse = await locals.globalApiClient.GET(`/{tenantIdOrSlug}/auth/connectors`, {
    params: {
      path: {
        tenantIdOrSlug: tenantSlug
      }
    }
  });

  const authConnectors = connectorsResponse.data?.authConnectors || [];

  if (authConnectors.length === 0) {
    throw new Error('No auth connectors found for this tenant.');
  }

  return {
    authConnectors,
    redirectTo
  };
};
