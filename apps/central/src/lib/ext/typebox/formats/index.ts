import { FormatRegistry } from "@sinclair/typebox";

import { IsDateTime } from "./core/date-time.js";
import { IsDate } from "./core/date.js";
import { IsEmail } from "./core/email.js";
import { IsIPv4 } from "./core/ipv4.js";
import { IsIPv6 } from "./core/ipv6.js";
import { IsTime } from "./core/time.js";
import { IsUrl } from "./core/url.js";
import { IsUuid } from "./core/uuid.js";

function ensureFormat(name: string, format: (value: string) => boolean) {
  if (!FormatRegistry.Has(name)) {
    FormatRegistry.Set(name, format);
  }
}

export function applyFormatsToRegistry() {
  ensureFormat("date-time", IsDateTime);
  ensureFormat("time", IsTime);
  ensureFormat("date", IsDate);
  ensureFormat("email", IsEmail);
  ensureFormat("ipv4", IsIPv4);
  ensureFormat("ipv6", IsIPv6);
  ensureFormat("uuid", IsUuid);
  ensureFormat("url", IsUrl);
}
