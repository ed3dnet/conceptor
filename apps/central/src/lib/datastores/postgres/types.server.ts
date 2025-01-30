import type { drizzle } from "drizzle-orm/node-postgres";

export type Drizzle = Omit<ReturnType<typeof drizzle>, "$client">;

export type DrizzleMutableMethods = "insert" | "update" | "delete";
export type DrizzleRO = Omit<Drizzle, DrizzleMutableMethods>;

export type Executor = Pick<Drizzle, DrizzleMutableMethods | "select">;
export type ExecutorRO = Pick<DrizzleRO, "select">;

export * from "drizzle-orm";
