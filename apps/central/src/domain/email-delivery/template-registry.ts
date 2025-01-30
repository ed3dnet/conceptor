import {
  magicLinkTemplate,
  type MagicLinkTemplate,
} from "./templates/magic-link.js";
import {
  type VerifyEmailTemplate,
  verifyEmailTemplate,
} from "./templates/verify-email.js";

export type EmailTemplate<T extends Record<string, unknown>> = {
  subject: (args: T) => string;
  text: (args: T) => string;
  html: (args: T) => string;
};

export type ResetPasswordTemplateArgs = {
  resetUrl: string;
  displayName: string;
};

export type EmailTemplateRegistry = {
  "login-magic-link": MagicLinkTemplate;
  "verify-email": VerifyEmailTemplate;
  // "reset-password": EmailTemplate<ResetPasswordTemplateArgs>;
};

export type TemplateNames = keyof EmailTemplateRegistry;

export const EMAIL_TEMPLATE_REGISTRY: EmailTemplateRegistry = {
  "login-magic-link": magicLinkTemplate,
  "verify-email": verifyEmailTemplate,
  // "reset-password": {
  //   // TODO: Implement reset password template
  //   subject: () => "Reset your password",
  //   text: () => "Not implemented",
  //   html: () => "Not implemented",
  // },
};
