import {
  type EmailTemplate,
  type EmailTemplateRegistry,
  type TemplateNames,
} from "./template-registry.js";

export type EnqueueEmailInput = {
  to: string;
  templateName: TemplateNames;
  args: EmailTemplateRegistry[TemplateNames] extends EmailTemplate<infer T>
    ? T
    : never;
};
