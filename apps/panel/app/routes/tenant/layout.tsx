import { useParams } from "react-router";
import { Outlet } from "react-router";

export default function TenantLayout() {
  const { tenantIdOrSlug } = useParams();

  return (
    <div>
      <header className="p-4 border-b">
        <h1>Tenant: {tenantIdOrSlug}</h1>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
