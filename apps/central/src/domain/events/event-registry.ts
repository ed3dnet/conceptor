import {
  type TLiteral,
  Type,
  type Static,
  type TObject,
} from "@sinclair/typebox";
import { TypeCompiler, type TypeCheck } from "@sinclair/typebox/compiler";
import { type Mutable } from "utility-types";

import { ALL_EVENTS } from "./event-list.js";

export const AnyEvent = Type.Union(ALL_EVENTS as Mutable<typeof ALL_EVENTS>);
export type AnyEvent = Static<typeof AnyEvent>;

const eventPairs = AnyEvent.anyOf.map((schema) => {
  return [
    schema.properties.__type.const,
    {
      schema,
      checker: TypeCompiler.Compile(schema),
    },
  ] as const;
});

type ExtractDiscriminator<T extends TObject> =
  T["properties"]["__type"] extends { const: infer D }
    ? D extends string
      ? D
      : never
    : never;

type EventRegistryType = {
  [K in ExtractDiscriminator<(typeof AnyEvent)["anyOf"][number]>]: {
    schema: Extract<
      (typeof AnyEvent)["anyOf"][number],
      { properties: { __type: { const: K } } }
    >;
    checker: TypeCheck<
      Extract<
        (typeof AnyEvent)["anyOf"][number],
        { properties: { __type: { const: K } } }
      >
    >;
  };
};

export const EVENT_REGISTRY = Object.fromEntries(eventPairs);

export type EventHandler<
  K extends keyof EventRegistryType,
  T extends AnyEvent & { __type: K },
> = (payload: T) => Promise<void>;

export type EventListenersRegistry = {
  [K in keyof EventRegistryType]?: Array<{
    name: string;
    handler: EventHandler<
      K,
      Static<(typeof EVENT_REGISTRY)[K]["schema"]> & {
        __type: K;
      }
    >;
  }>;
};
