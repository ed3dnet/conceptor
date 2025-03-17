import { activity } from "../../../../_worker/activity-helpers.js";
import { type WorkflowSignalLocator } from "../../temporal-dispatcher/types.js";
import { type TranscriptionEvent } from "../events.js";

export interface SignalWorkflowFromTranscriptionInput {
  transcriptionJobId: string;
  signal: WorkflowSignalLocator;
  event: TranscriptionEvent;
}

export const signalWorkflowFromTranscriptionActivity = activity(
  "signalWorkflowFromTranscription",
  {
    fn: async (
      _context,
      logger,
      deps,
      input: SignalWorkflowFromTranscriptionInput,
    ): Promise<void> => {
      const { temporalClient } = deps;

      logger.debug("Signaling workflow", {
        transcriptionJobId: input.transcriptionJobId,
        workflowId: input.signal.workflowId,
        signalName: input.signal.signalName,
        eventKind: input.event.kind,
      });

      const handle = await temporalClient.workflow.getHandle(
        input.signal.workflowId,
      );
      await handle.signal(input.signal.signalName, input.event);

      logger.debug("Successfully signaled workflow", {
        transcriptionJobId: input.transcriptionJobId,
        workflowId: input.signal.workflowId,
        signalName: input.signal.signalName,
      });
    },
  },
);
