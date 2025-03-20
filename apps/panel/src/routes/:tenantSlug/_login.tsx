import type { schemas } from "@myapp/central-client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { centralApiClient } from "../../api/central-client.ts";
import { useErrorHandler } from "../../hooks/use-error-handler.ts";

type TenantPublic = schemas["TenantPublic"];
type AuthConnectorPublic = schemas["AuthConnectorPublic"];

interface LoginPageProps {
  tenantSlug: string;
  tenant: TenantPublic;
}

export default function LoginPage({ tenantSlug, tenant }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { handleError } = useErrorHandler();

  // Fetch available auth connectors for this tenant
  const connectorsQuery = useQuery({
    queryKey: ["authConnectors", tenantSlug],
    queryFn: async () => {
      const response = await centralApiClient.GET(
        `/{tenantIdOrSlug}/auth/connectors`,
        {
          params: {
            path: {
              tenantIdOrSlug: tenantSlug,
            },
          },
        },
      );

      if (response.error) {
        throw new Error("Failed to fetch authentication connectors");
      }

      return response.data;
    },
  });

  // Handle connector selection
  const handleConnectorClick = async (connector: AuthConnectorPublic) => {
    setIsLoading(true);

    try {
      // Get the current URL to use as the redirect URL after authentication
      const currentUrl = window.location.href;

      // Initiate the login flow
      const response = await centralApiClient.GET(
        `/{tenantIdOrSlug}/auth/{authConnectorId}/login`,
        {
          params: {
            path: {
              tenantIdOrSlug: tenantSlug,
              authConnectorId: connector.authConnectorId,
            },
            query: {
              redirectUri: currentUrl,
            },
          },
        },
      );

      if (response.error) {
        throw new Error("Failed to initiate login flow");
      }

      // Redirect to the authentication provider
      window.location.href = response.data.redirectTo;
    } catch (error) {
      handleError(error, "Unable to start login process. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-center">
            Login to {tenant.displayName}
          </h2>

          {connectorsQuery.isPending ? (
            <div className="flex justify-center py-4">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : connectorsQuery.isError ? (
            <div className="alert alert-error">
              Failed to load authentication options
            </div>
          ) : (
            <div className="py-4">
              {connectorsQuery.data.authConnectors.length === 0 ? (
                <div className="alert alert-warning">
                  No authentication methods available
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {connectorsQuery.data.authConnectors.map((connector) => (
                    <button
                      key={connector.authConnectorId}
                      className="btn btn-primary"
                      onClick={() => handleConnectorClick(connector)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : null}
                      Login with {connector.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
