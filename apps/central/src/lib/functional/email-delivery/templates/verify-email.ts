import Handlebars from "handlebars";

import { type EmailTemplate } from "../template-registry.js";

export type VerifyEmailTemplateArgs = {
  verificationUrl: string;
  displayName: string;
};

const subjectTemplate = Handlebars.compile("Verify your email for Identivine");

const textTemplate = Handlebars.compile(`
Hi {{displayName}},

Please verify your email address by clicking the link below:

{{verificationUrl}}

If you didn't create an Identivine account, you can safely ignore this email.
`);

const htmlTemplate = Handlebars.compile(`
<p>Hi {{displayName}},</p>

<p>Please verify your email address by clicking the link below:</p>

<p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>

<p>If you didn't create an Identivine account, you can safely ignore this email.</p>
`);

export type VerifyEmailTemplate = EmailTemplate<VerifyEmailTemplateArgs>;
export const verifyEmailTemplate: EmailTemplate<VerifyEmailTemplateArgs> = {
  subject: () => subjectTemplate({}),
  text: (args) => textTemplate(args),
  html: (args) => htmlTemplate(args),
};
