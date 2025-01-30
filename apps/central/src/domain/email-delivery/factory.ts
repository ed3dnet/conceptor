import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { type Logger } from "pino";

import { type EmailDeliveryConfig } from "./config.js";

export function createMailTransport(
  logger: Logger,
  config: EmailDeliveryConfig,
): Mail {
  const transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.tls,
    auth: {
      user: config.smtp.auth.user,
      pass: config.smtp.auth.pass,
    },
  });

  // Log transport creation but not credentials
  logger.info(
    {
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.tls,
    },
    "Created mail transport",
  );

  return new Proxy(transport, {
    get(target, prop) {
      if (prop === "sendMail") {
        return async (options: Mail.Options) => {
          const realOptions: Mail.Options = {
            from: options.from ?? config.from,
            replyTo: options.replyTo ?? config.replyTo,
            ...options,
          };

          try {
            const result = await target.sendMail(realOptions);

            logger.info(
              {
                to: options.to,
                from: options.from,
                subject: options.subject,
                messageId: result.messageId,
              },
              "Email sent.",
            );

            return result;
          } catch (err) {
            logger.error(
              {
                to: options.to,
                from: options.from,
                subject: options.subject,
                err,
              },
              "Error sending email",
            );
            throw err;
          }
        };
      }
      return target[prop as keyof typeof target];
    },
  });
}
