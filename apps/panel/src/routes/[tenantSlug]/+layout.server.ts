import { error, isRedirect, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals, url }) => {
  const logger = locals.logger.child({ fn: load.name, path: url.pathname });
  const { tenantSlug } = params;

  try {
    // Get tenant information
    const tenantResponse = await locals.globalApiClient.GET(`/{tenantIdOrSlug}`, {
      params: {
        path: {
          tenantIdOrSlug: tenantSlug
        }
      }
    });

    const tenant = tenantResponse.data;

    if (!tenant) {
      error(404, `Tenant ${tenantSlug} not found`);
    }

    // Check if user is authenticated by making whoami request
    let user = null;

    if (locals.serverUserApiClient) {
      const meResponse = await locals.serverUserApiClient.GET(`/{tenantIdOrSlug}/me`, {
        params: {
          path: {
            tenantIdOrSlug: tenantSlug
          }
        }
      });

      if (meResponse.data) {
        user = meResponse.data;
      }
    }

    // If this is not the login page and user is not authenticated, redirect to login
    const isLoginPage = url.pathname.includes('/login');
    if (!user && !isLoginPage) {
      throw redirect(302, `/${tenantSlug}/login?redirectTo=${encodeURIComponent(url.pathname)}`);
    }

    // Pass tenant info and user to all routes
    return {
      tenant,
      user
    };
  } catch (err) {
    if (isRedirect(err)) {
      throw err;
    }

    const { status, message } = err as { status?: number; message?: string };

    logger.error({ err }, 'Error in tenant layout load:');

    // For 401 errors, redirect to login
    if (status === 401) {
      redirect(302, `/${tenantSlug}/login?redirectTo=${encodeURIComponent(url.pathname)}`);
    }

    // Return other errors
    return {
      status: status || 500,
      error: message || 'Unknown error'
    };
  }
};
