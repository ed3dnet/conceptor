import { error, type Cookies, type RequestHandler } from "@sveltejs/kit";

function extractApiBaseParams(locals: App.Locals, cookies: Cookies) {
  const cookieName = locals.config.interop.sessionCookieName;

  const authToken = cookies.get(cookieName);
  if (!authToken) {
    throw error(401, "Unauthorized");
  }

  const apiBaseUrl = locals.config.urls.apiBaseUrl;

  return { authToken, cookieName, apiBaseUrl };
}

export const GET: RequestHandler = async ({ params, locals, request, cookies }) => {
  const { authToken, apiBaseUrl, cookieName } = extractApiBaseParams(locals, cookies);

  const response = await locals.fetch(`${apiBaseUrl}/${params.path}`, {
    headers: {
      Cookie: `${cookieName}=${authToken}`,
      "X-Via": "panel",
      Accept: request.headers.get("Accept") || "application/json",
    },
    duplex: "half",
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
    },
  });
};

export const POST: RequestHandler = async ({ params, locals, request, cookies }) => {
  const { authToken, apiBaseUrl, cookieName } = extractApiBaseParams(locals, cookies);

  const response = await locals.fetch(`${apiBaseUrl}/${params.path}`, {
    method: "POST",
    headers: {
      Cookie: `${cookieName}=${authToken}`,
      "X-Via": "panel",
      "Content-Type": request.headers.get("Content-Type") || "application/json",
      Accept: request.headers.get("Accept") || "application/json",
    },
    body: request.body,
    duplex: "half",
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
    },
  });
};

export const PUT: RequestHandler = async ({ params, locals, request, cookies }) => {
  const { authToken, apiBaseUrl, cookieName } = extractApiBaseParams(locals, cookies);

  const response = await locals.fetch(`${apiBaseUrl}/${params.path}`, {
    method: "PUT",
    headers: {
      Cookie: `${cookieName}=${authToken}`,
      "X-Via": "panel",
      "Content-Type": request.headers.get("Content-Type") || "application/json",
      Accept: request.headers.get("Accept") || "application/json",
    },
    body: request.body,
    duplex: "half",
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
    },
  });
};

export const DELETE: RequestHandler = async ({ params, locals, request, cookies }) => {
  const { authToken, apiBaseUrl, cookieName } = extractApiBaseParams(locals, cookies);

  const response = await locals.fetch(`${apiBaseUrl}/${params.path}`, {
    method: "DELETE",
    headers: {
      Cookie: `${cookieName}=${authToken}`,
      "X-Via": "panel",
      Accept: request.headers.get("Accept") || "application/json",
    },
    duplex: "half",
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
    },
  });
};

export const PATCH: RequestHandler = async ({ params, locals, request, cookies }) => {
  const { authToken, apiBaseUrl, cookieName } = extractApiBaseParams(locals, cookies);

  const response = await locals.fetch(`${apiBaseUrl}/${params.path}`, {
    method: "PATCH",
    headers: {
      Cookie: `${cookieName}=${authToken}`,
      "X-Via": "panel",
      "Content-Type": request.headers.get("Content-Type") || "application/json",
      Accept: request.headers.get("Accept") || "application/json",
    },
    body: request.body,
    duplex: "half",
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
    },
  });
};
