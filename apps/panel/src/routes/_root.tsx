import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";

import { useCentral } from "../hooks/useCentral";

export const Route = createRootRoute({
  component: RootComponent,
  loader: () => {
    // Root level loader doesn't need to do anything yet
    return null;
  },
});

function RootComponent() {
  return (
    <div>
      <Outlet />
    </div>
  );
}
