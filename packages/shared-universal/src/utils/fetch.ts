/* eslint-disable no-restricted-globals */
import { writeFile } from "node:fs/promises";

import { type Logger } from "pino";
import { ulid } from "ulidx";

export type FetchFn = typeof fetch;
export type FetchResponse = Awaited<ReturnType<typeof fetch>>;

export type DownloadRemoteFileToDiskInput = {
  fetch: typeof fetch;
  sourceUrl: string;
  destinationPath: string;
};

export type DownloadRemoteFileToDiskResult = {
  contentType: string | null;
  filePath: string;
  size: number;
};

export function loggedFetch(
  logger: Logger,
  baseFetch: typeof fetch,
  extraOptions: RequestInit = {},
): typeof fetch {
  logger = logger.child({ context: "fetch" });
  return async (url: Request | string | URL, options?: RequestInit) => {
    const spanId = ulid();
    // Determine the URL string
    let urlObj: URL;
    if (typeof url === "string") {
      urlObj = new URL(url);
    } else if (url instanceof URL) {
      urlObj = url;
    } else {
      urlObj = new URL(url.url);
    }

    // Strip query string
    logger = logger.child({
      spanId,
      remote: {
        method: options?.method ?? "GET",
        url: urlObj.origin + urlObj.pathname,
      },
    });

    // Log before the request
    logger.debug("Starting fetch request.");

    const startTime = Date.now();

    try {
      const response = await baseFetch(url, {
        ...extraOptions,
        ...options,
        ...{
          headers: {
            ...extraOptions.headers,
            ...options?.headers,
            "x-span-id": spanId,
          },
        },
      });

      // Log after the request with timings
      const duration = Date.now() - startTime;
      logger.debug(
        { duration, status: response.status },
        "Fetch request completed.",
      );

      return response;
    } catch (err) {
      logger.error({ err }, "Fetch request failed.");
      throw err;
    }
  };
}

export async function downloadRemoteFileToDisk({
  fetch,
  sourceUrl,
  destinationPath,
}: DownloadRemoteFileToDiskInput) {
  // Fetch the file from the source URL
  const response = await fetch(sourceUrl);

  // Check if the response is OK
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error("Response body is empty");
  }

  const buffer = await response.arrayBuffer();
  await writeFile(destinationPath, new Uint8Array(buffer));

  const contentType = response.headers.get("content-type");
  const size = buffer.byteLength;

  return {
    contentType: contentType || null,
    filePath: destinationPath,
    size,
  };
}
