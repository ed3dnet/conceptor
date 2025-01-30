import { type Static, Type } from "@sinclair/typebox";

export type Sensitive<T> = {
  v: 1;
  s: string;
  k: number;
  iv: string;
  d: string;
  h: string;
};
