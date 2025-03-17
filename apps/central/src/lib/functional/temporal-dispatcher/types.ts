import { type Static, Type } from "@sinclair/typebox";

export const WorkflowSignalLocator = Type.Object({
  workflowId: Type.String(),
  signalName: Type.String(),
});
export type WorkflowSignalLocator = Static<typeof WorkflowSignalLocator>;
