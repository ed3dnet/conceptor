import { type ExportedActivity } from "../../../../_worker/activity-helpers.js";

import { sendEmailActivity } from "./send-email.js";

export const EMAIL_DELIVERY_ACTIVITIES: Array<ExportedActivity> = [
  sendEmailActivity,
];
