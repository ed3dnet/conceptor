import {  createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

import { type RouterContext } from "../router.ts";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <Outlet />
      {process.env.NODE_ENV === "development" && <TanStackRouterDevtools />}
    </>
  ),
});
