import toast from "react-hot-toast";

type ErrorWithMessage = {
  message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there are circular references
    return new Error(String(maybeError));
  }
}

function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}

export function useErrorHandler() {
  const handleError = (error: unknown, userFriendlyMessage?: string) => {
    // 1. Show user-friendly toast
    toast.error(userFriendlyMessage || "An unexpected error occurred");

    // 2. Log to console during development
    // @ts-expect-error Vite stubs process.env.NODE_ENV in during builds
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-restricted-globals
      console.error("Error details:", error);
    }

    // 3. Send to error tracking service (future integration)
    // This is where we'd integrate with Sentry, Bugsnag, etc.
    // Example: Sentry.captureException(error);

    // 4. Return the error message for potential UI display
    return getErrorMessage(error);
  };

  return { handleError };
}
