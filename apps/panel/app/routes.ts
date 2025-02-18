import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  route("/:tenantIdOrSlug", "routes/tenant/layout.tsx", [
    index("routes/tenant/home.tsx"),
  ]),
  // Fallback route for when no tenant is specified
  route("/", "routes/home.tsx"),
] satisfies RouteConfig;
