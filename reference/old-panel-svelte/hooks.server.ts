import type { LogLevel } from "@myapp/shared-universal/config/types.js";
import { ApplicationError } from "@myapp/shared-universal/errors/index.js";
import { sha512_256 } from "@myapp/shared-universal/utils/cryptography.js";
import { loggedFetch } from "@myapp/shared-universal/utils/fetch.js";
import { buildStandardLogger } from "@myapp/shared-universal/utils/logging.js";
import { buildRequestIdGenerator } from "@myapp/shared-universal/utils/request-id-builder.js";
import { isRedirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";

import { buildCentralClient } from "../../../packages/central-client/src/client.js";

import { loadAppConfigFromSvelteEnv } from "./lib/config/svelte-loader.js";

import { env } from "$env/dynamic/private";

const appConfig = loadAppConfigFromSvelteEnv();

const overrideLogLevel: LogLevel | null = "debug";
const ROOT_LOGGER = buildStandardLogger("site-panel", overrideLogLevel ?? appConfig.logLevel, {
  useStdout: false,
  prettyPrint: appConfig.prettyLogs,
});

ROOT_LOGGER.info({ csrfOrigin: process.env.ORIGIN ?? "NOT SET!!" }, "Initializing.");

const genRandomId = buildRequestIdGenerator("PNL");

const PANEL_SITE_PSK_HEADER = "X-Panel-PSK";
const panelPSK = sha512_256(sha512_256(appConfig.interop.preSharedKey));

export const handle: Handle = sequence(async ({ event, resolve }) => {
  const startTimestamp = Date.now();
  const requestId = event.request.headers.get("x-request-id") ?? genRandomId();

  const logger = ROOT_LOGGER.child({ reqId: requestId });
  const fetch = loggedFetch(logger, global.fetch);

  const rawHost = event.request.headers.get("host");

  logger.info(
    {
      fn: handle.name,
      request: {
        ip: event.getClientAddress(),
        host: rawHost,
        method: event.request.method,
        url: event.url,
        // headers: isApiRequest ? undefined : [...event.request.headers.keys()],
      },
    },
    "Request started."
  );

  // @ts-expect-error this is where we set a readonly value
  event.locals.config = appConfig;
  // @ts-expect-error this is where we set a readonly value
  event.locals.logger = logger;
  // @ts-expect-error this is where we set a readonly value
  event.locals.fetch = fetch;
  // @ts-expect-error this is where we set a readonly value
  event.locals.globalApiClient = buildCentralClient({
    baseUrl: env.CENTRAL_URLS__API_BASE_URL,
    fetch,

    clientOpts: {
      headers: {
        [PANEL_SITE_PSK_HEADER]: panelPSK,
        "x-correlation-id": requestId,
      },
      duplex: "half",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });

  // if auth token exists, set `event.locals.serverUserApiClient`
  const authToken = event.cookies.get("auth_token");
  if (authToken) {
    logger.debug("Found auth token, setting serverUserApiClient");

    const userApiClientHeaders: RequestInit["headers"] = {
      Authorization: `Bearer ${authToken}`,
      [PANEL_SITE_PSK_HEADER]: panelPSK,
      "x-correlation-id": requestId,
    };

    // @ts-expect-error this is where we set a readonly value
    event.locals.serverUserApiClient = buildCentralClient({
      baseUrl: env.CENTRAL_URLS__API_BASE_URL,
      fetch,

      clientOpts: {
        headers: userApiClientHeaders,
        duplex: "half",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
  }

  let ret: Response;
  try {
    ret = await resolve(event);

    if (ret.status > 499) {
      logger.info({ status: ret.status }, "Request returned a handled error.");
    }

    ret.headers.append("Access-Control-Allow-Origin", appConfig.urls.panelBaseUrl);
    ret.headers.append("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    ret.headers.append("Access-Control-Allow-Credentials", "true");
  } catch (err) {
    if (isRedirect(err)) {
      logger.info({ err }, "Redirecting.");
      throw err;
    }

    const duration = Date.now() - startTimestamp;
    logger.error({ fn: handle.name, err, duration }, "Request threw an unhandled error.");
    throw err;
  }

  const duration = Date.now() - startTimestamp;

  logger.info(
    {
      fn: handle.name,
      response: {
        status: ret.status,
        duration,
      },
    },
    "Request completed."
  );

  ret.headers.set("x-request-id", requestId);
  return ret;
});
