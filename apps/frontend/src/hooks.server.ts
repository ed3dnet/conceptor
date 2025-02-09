import { loggedFetch } from "@myapp/shared-universal/utils/fetch.js";
import { buildStandardLogger } from "@myapp/shared-universal/utils/logging.js";
import { buildRequestIdGenerator } from "@myapp/shared-universal/utils/request-id-builder.js";
import { isRedirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";

import { loadAppConfigFromSvelteEnv } from "./lib/config/svelte-loader.js";

const APP_CONFIG = loadAppConfigFromSvelteEnv();

const ROOT_LOGGER = buildStandardLogger("frontend", APP_CONFIG.logLevel, {
  useStdout: false,
  prettyPrint: APP_CONFIG.prettyLogs,
});

ROOT_LOGGER.info("Starting frontend...");

const genRandomId = buildRequestIdGenerator("FNT");

export const handle: Handle = sequence(async ({ event, resolve }) => {
  const startTimestamp = Date.now();
  const requestId = event.request.headers.get("x-request-id") ?? genRandomId();

  const logger = ROOT_LOGGER.child({ reqId: requestId });
  const fetch = loggedFetch(logger, global.fetch);

  // @ts-expect-error this is where we set a readonly value
  event.locals.config = APP_CONFIG;
  // @ts-expect-error this is where we set a readonly value
  event.locals.logger = logger;
  // @ts-expect-error this is where we set a readonly value
  event.locals.fetch = fetch;

  // if auth token exists, set `event.locals.serverUserApiClient`
  const authToken = event.cookies.get(APP_CONFIG.interop.authCookieName);
  if (authToken) {
    logger.debug("Found auth token, setting serverUserApiClient");

    const userApiClientHeaders: RequestInit["headers"] = {
      Authorization: `Bearer ${authToken}`,
      "x-correlation-id": requestId,
    };

    // @ts-expect-error this is where we set a readonly value
    event.locals.serverUserApiClient = buildCentralClient({
      baseUrl: APP_CONFIG.urls.apiBaseUrl,
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

    ret.headers.append(
      "Access-Control-Allow-Origin",
      APP_CONFIG.urls.frontendBaseUrl,
    );
    ret.headers.append(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    );
    ret.headers.append("Access-Control-Allow-Credentials", "true");
  } catch (err) {
    if (isRedirect(err)) {
      logger.info({ err }, "Redirecting.");
      throw err;
    }

    const duration = Date.now() - startTimestamp;
    logger.error(
      { fn: handle.name, err, duration },
      "Request threw an unhandled error.",
    );
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
    "Request completed.",
  );

  ret.headers.set("x-request-id", requestId);
  return ret;
});
