import Handlebars from "handlebars";

import { type EmailTemplate } from "../template-registry.js";

export type LoginMagicLinkTemplateArgs = {
  loginUrl: string;
};

const subjectTemplate = Handlebars.compile("Login to your Identivine account");

const textTemplate = Handlebars.compile(`
Click the link below to log in to your Identivine account:

{{loginUrl}}

This link will expire in 15 minutes. If you didn't request this login link, you can safely ignore this email.
`);

const htmlTemplate = Handlebars.compile(`
<p>Click the link below to log in to your Identivine account:</p>

<p><a href="{{loginUrl}}">{{loginUrl}}</a></p>

<p>This link will expire in 15 minutes. If you didn't request this login link, you can safely ignore this email.</p>
`);

export type MagicLinkTemplate = EmailTemplate<LoginMagicLinkTemplateArgs>;
export const magicLinkTemplate: EmailTemplate<LoginMagicLinkTemplateArgs> = {
  subject: () => subjectTemplate({}),
  text: (args) => textTemplate(args),
  html: (args) => htmlTemplate(args),
};
