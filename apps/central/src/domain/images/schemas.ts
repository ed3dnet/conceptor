import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { StringEnum, UnionOneOf } from "../../lib/ext/typebox.js";

export const ImageUsage = schemaType(
  "ImageUsage",
  StringEnum(["avatar", "header", "content"]),
);
export type ImageUsage = Static<typeof ImageUsage>;

export const ImageRenditionFormat = schemaType(
  "ImageRenditionFormat",
  StringEnum(["fallback", "image/webp", "image/avif"]),
);
export type ImageRenditionFormat = Static<typeof ImageRenditionFormat>;

export const ImageSet = schemaType(
  "ImageSet",
  Type.Object({
    isPublic: Type.Boolean(),
    renditions: Type.Record(
      ImageRenditionFormat,
      Type.Object({
        bucket: Type.String(),
        objectName: Type.String(),
      }),
    ),
  }),
);
export type ImageSet = Static<typeof ImageSet>;

export const ImageLinkSet = schemaType(
  "ImageLinkSet",
  Type.Object(
    {
      fallback: Type.String(),
      blurhash: Type.Optional(Type.String()),
      renditions: Type.Object({
        "image/webp": Type.Optional(Type.String()),
        "image/avif": Type.Optional(Type.String()),
      }),
    },
    {
      description: "A browser-side set of images, provided by renditions.",
    },
  ),
);
export type ImageLinkSet = Static<typeof ImageLinkSet>;
