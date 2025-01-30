import { Context } from "@temporalio/activity";
import {
  type ActivityInterfaceFor,
  type ActivityOptions,
} from "@temporalio/workflow";
import { type AwilixContainer, asValue } from "awilix";
import { type Logger } from "pino";

import { type AppActivityCradle } from "../_deps/activity.js";

import { getWorkerDIContainer, getWorkerLogger } from "./worker-context.js";

export type ActivityProxy<
  K extends string,
  TArgs = void,
  TOutput = never,
> = ActivityInterfaceFor<{
  [key in K]: (t: TArgs) => Promise<TOutput>;
}>;

export type ActivityFn<TArgs, TOutput> = (
  context: Context,
  logger: Logger,
  deps: AppActivityCradle,
  args: TArgs,
) => Promise<TOutput>;

export type StandardActivity<
  K extends string,
  TArgs = void,
  TOutput = never,
> = {
  name: K;
  tags: string[];
  activity: (t: TArgs) => Promise<TOutput>;
  workerActivityEntry: [K, (t: TArgs) => Promise<TOutput>];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExportedActivity = StandardActivity<any, any, any>;

export const DEFAULT_ACTIVITY_OPTIONS: ActivityOptions = {
  startToCloseTimeout: "1 minute",
};

export function activity<K extends string, TArgs = void, TOutput = never>(
  name: K,
  {
    tags,
    fn,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tags?: StandardActivity<any, any, any>["tags"];
    fn: ActivityFn<TArgs, TOutput>;
  },
): StandardActivity<K, TArgs, TOutput> {
  const wrappedFn = activityWrapper<TArgs, TOutput>(fn);

  return {
    name,
    tags: tags ?? ["default"],
    activity: wrappedFn,
    workerActivityEntry: [name, wrappedFn],
  };
}

export function activityWrapper<TArgs = never, TOutput = never>(
  fn: ActivityFn<TArgs, TOutput>,
): (t: TArgs) => Promise<TOutput> {
  return async (t: TArgs) => {
    // for now thos scope equals SingletonCradle, though we will
    // override the logger with a new one that adds details for a
    // given activity run. however, in the future this may be
    // extended to add new types for temporal-specific activities;
    // these types will need to be added to the TemporalActivityCradle
    // and then maintained/checked for the worker context.
    let scope: AwilixContainer<AppActivityCradle> | null = null;

    const context = Context.current();
    const logger = getWorkerLogger().child({
      activityId: context.info.activityId,
      activityType: context.info.activityType,
      workflowType: context.info.workflowType,
    });

    try {
      scope = getWorkerDIContainer().createScope<AppActivityCradle>();
      scope.register({
        logger: asValue(logger),
      });

      const ret = await fn(context, logger, scope.cradle, t);
      return ret;
    } catch (err) {
      logger.error(err);
      throw err;
    } finally {
      scope?.dispose();
    }
  };
}
