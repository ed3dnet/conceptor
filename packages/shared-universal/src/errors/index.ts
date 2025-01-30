export abstract class ApplicationError extends Error {
  /**
   * A human-readable name for this error, emitted by the
   * HTTP server in its payload.
   */
  get friendlyName(): string {
    return this.constructor.name;
  }

  abstract readonly httpStatusCode: number;
}

export abstract class ClientError extends ApplicationError {}

export class BadRequestError extends ClientError {
  readonly httpStatusCode = 400;
}

export class UnprocessableEntityError extends ClientError {
  readonly httpStatusCode = 422;
}

export class UnauthorizedError extends ClientError {
  readonly httpStatusCode = 401;
}

export class NotFoundError extends ClientError {
  readonly httpStatusCode = 404;
}

export class RateLimitExceededError extends ClientError {
  readonly httpStatusCode = 429;
}

export class ResourceNotFoundError extends NotFoundError {
  constructor(
    readonly resourceType: string,
    readonly resourceField: string,
    readonly resourceValue: string,
  ) {
    super(
      `Resource of type \`${resourceType}\` with \`${resourceField}\`: \`${resourceValue}\` not found`,
    );
  }
}

export class ForbiddenError extends ClientError {
  readonly httpStatusCode = 403;
}

export class ConflictError extends ClientError {
  readonly httpStatusCode = 409;
}

export class InternalServerError extends ApplicationError {
  readonly httpStatusCode = 500;
}
