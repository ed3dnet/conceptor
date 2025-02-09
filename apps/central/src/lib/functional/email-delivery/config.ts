import { type Static, Type } from "@sinclair/typebox";

export const EmailDeliveryConfig = Type.Object({
  from: Type.String(),
  replyTo: Type.String(),
  smtp: Type.Object({
    host: Type.String(),
    port: Type.Number(),
    tls: Type.Boolean(),
    auth: Type.Object({
      user: Type.String(),
      pass: Type.String(),
    }),
  }),
});

export type EmailDeliveryConfig = Static<typeof EmailDeliveryConfig>;
