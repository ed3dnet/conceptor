import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { S3_BUCKET_NAME } from "../../_db/schema/index.js";
import { StringEnum } from "../../lib/ext/typebox.js";

export const S3_BUCKET_NAMES = S3_BUCKET_NAME.enumValues;
export const S3_PUBLIC_BUCKET_NAMES: Array<(typeof S3_BUCKET_NAMES)[number]> = [
  "user-public-content",
] as const;

export const S3BucketName = StringEnum(S3_BUCKET_NAME.enumValues);
export type S3BucketName = Static<typeof S3BucketName>;

export const S3BucketConfig = Type.Object({
  [S3_BUCKET_NAMES[0]]: Type.String(),
  [S3_BUCKET_NAMES[1]]: Type.String(),
  [S3_BUCKET_NAMES[2]]: Type.String(),
  [S3_BUCKET_NAMES[3]]: Type.String(),
});
export type S3BucketConfig = Static<typeof S3BucketConfig>;

export const S3PublicBucketName = StringEnum(S3_PUBLIC_BUCKET_NAMES);
export type S3PublicBucketName = Static<typeof S3PublicBucketName>;

export const S3Flavor = StringEnum(["minio", "r2"]);
export type S3Flavor = Static<typeof S3Flavor>;
export const S3FlavorChecker = TypeCompiler.Compile(S3Flavor);

export const S3Config = Type.Object({
  flavor: S3Flavor,
  endpoint: Type.String(),
  port: Type.Optional(Type.Number()),
  ssl: Type.Optional(Type.Boolean()),
  accessKey: Type.String(),
  secretKey: Type.String(),
  buckets: S3BucketConfig,
});
export type S3Config = Static<typeof S3Config>;
