import { type TenantPublic, type UserPrivate } from "@myapp/central-client";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/$tenantIdOrSlug/_layout")({
  beforeLoad: async ({ params, context }) => {
    const { central } = context;
    const { tenantIdOrSlug } = params;

    let tenant: TenantPublic | null = null;
    let me: UserPrivate | null = null;

    const tenantAwaiter = central.GET("/{tenantIdOrSlug}", {
      params: {
        path: {
          tenantIdOrSlug,
        }
      },
    });

    const meAwaiter = central.GET("/{tenantIdOrSlug}/me", {
      params: {
        path: {
          tenantIdOrSlug,
        }
      },
    });

    const [tenantRequest, meRequest] = await Promise.all([
      tenantAwaiter,
      meAwaiter
    ]);

    tenant = tenantRequest.data ?? null;

    if (meRequest.response.ok && meRequest.data) {
      me = meRequest.data;
    }

    return { tenant, me };
  },
  loader: async ({ context }) => {
    const { me, tenant } = context;

    if (!tenant) {
      return { noTenant: true };
    } else {
      return { me, tenant };
    }
  },
  component: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const loaderData = Route.useLoaderData();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const params = Route.useParams();

    if (loaderData.noTenant) {
      return <div>No tenant found for '{params.tenantIdOrSlug}'</div>;
    } else {
      if (loaderData.me) {
        return <>
          <div><pre>{JSON.stringify(loaderData.tenant, null, 2)}</pre></div>
          <Outlet />
        </>;
      } else {
        return <>
          <div><pre>{JSON.stringify(loaderData.tenant, null, 2)}</pre></div>
          <div>Unauthenticated.</div>
        </>;
      }
    }
  }
});
