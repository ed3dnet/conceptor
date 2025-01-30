import { genRandomId } from "@myapp/shared-universal/utils/random-id.js";
import {
  Connection,
  Client as TemporalClient,
  type Workflow,
  type WorkflowHandleWithFirstExecutionRunId,
} from "@temporalio/client";
import { type Logger } from "pino";

import { type TemporalQueueConfig, type TemporalQueueName } from "./config.js";

export {
  Client as TemporalClient,
  Connection as TemporalConnection,
} from "@temporalio/client";

export async function buildTemporalConnection({
  address,
  namespace,
}: {
  address: string;
  namespace: string;
}) {
  const temporalConnection = await Connection.connect({
    address,
  });

  const temporalClient = new TemporalClient({
    connection: temporalConnection,
    namespace,
  });

  return { temporalClient, temporalConnection };
}

export class TemporalClientService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly client: TemporalClient,
    private readonly queues: TemporalQueueConfig,
  ) {
    this.logger = logger.child({ context: TemporalClientService.name });
  }

  async start<W extends Workflow>(
    queue: TemporalQueueName,
    workflowFunc: W,
    args: Parameters<W>,
  ): Promise<WorkflowHandleWithFirstExecutionRunId<W>> {
    const workflowId = workflowFunc.name + "-" + genRandomId();

    const taskQueue = this.queues[queue];
    this.logger.info(
      { workflowId, queue },
      `Starting workflow ${workflowId} on queue ${taskQueue}.`,
    );

    const handle = await this.client.workflow.start(workflowFunc, {
      workflowId,
      taskQueue,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: args as any,
    });

    return handle;
  }
}
