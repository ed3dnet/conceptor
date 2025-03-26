import { groupByTags } from "@myapp/shared-universal/utils/data-structures.js";

import { EMAIL_DELIVERY_ACTIVITIES } from "../../lib/functional/email-delivery/activities/index.js";
import { IMAGE_ACTIVITIES } from "../../lib/functional/images/activities/index.js";
import { type ExportedActivity } from "../activity-helpers.js";

import { doDailyTriggerActivity } from "./daily-trigger.activity.js";
import { doHourlyTriggerActivity } from "./hourly-trigger.activity.js";
import { doPingActivity } from "./ping.activity.js";

// TODO:  figure out how to break these out by queue type
//        it is relatively difficult to encode into the type system
//        that a given workflow is only allowed to enqueue some activities
//        and not others in its queue. it also might not be worth it.
export const ALL_ACTIVITIES: Array<ExportedActivity> = [
  doPingActivity,
  doHourlyTriggerActivity,
  doDailyTriggerActivity,

  // core queue activities
  ...EMAIL_DELIVERY_ACTIVITIES,
  // media queue activities
  ...IMAGE_ACTIVITIES,
  // atproto queue activities
];

// TODO: set up workers that can run activities by tag
export const ACTIVITIES_BY_TAGS = groupByTags(ALL_ACTIVITIES);
