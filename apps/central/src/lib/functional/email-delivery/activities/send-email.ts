import { activity } from "../../../../_worker/activity-helpers.js";
import {
  EMAIL_TEMPLATE_REGISTRY,
  type EmailTemplate,
  type EmailTemplateRegistry,
  type TemplateNames,
} from "../template-registry.js";

export interface SendEmailActivityInput<T extends TemplateNames> {
  to: string;
  templateName: T;
  args: EmailTemplateRegistry[T] extends EmailTemplate<infer U> ? U : never;
}

export interface SendEmailActivityOutput {
  messageId: string;
}

export const sendEmailActivity = activity("sendEmail", {
  fn: async (
    _context,
    logger,
    deps,
    // we use the generics to jail what gets sent in, and we can then trust it here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input: SendEmailActivityInput<any>,
  ): Promise<SendEmailActivityOutput> => {
    const { mailTransport, config } = deps;
    logger.debug("entering sendEmailActivity");

    const template =
      EMAIL_TEMPLATE_REGISTRY[
        input.templateName as keyof EmailTemplateRegistry
      ];
    const result = await mailTransport.sendMail({
      from: config.emailDelivery.from,
      replyTo: config.emailDelivery.replyTo,
      to: input.to,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subject: template.subject(input.args as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      text: template.text(input.args as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      html: template.html(input.args as any),
    });

    logger.debug("exiting sendEmailActivity");
    return { messageId: result.messageId };
  },
});
