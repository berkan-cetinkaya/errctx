import type { Context } from "go-like-ctx";

export interface ErrorContext {
  readonly ctx: Context;
  fail(err: Error): void;
  error(): Error | null;
  isFailed(): boolean;
}

type ErrorHandler = (err: Error) => void;
type ErrorGetter = () => Error | null;
type FailureCheck = () => boolean;

type ErrorState = {
  failed: boolean;
  storedError: Error | null;
};


export function errorContext(ctx: Context): ErrorContext {
  const state: ErrorState = { failed: false, storedError: null };

  const fail: ErrorHandler = (err) => {
    if (state.failed) {
      return;
    }
    state.failed = true;
    state.storedError = err;
  };

  const error: ErrorGetter = () => state.storedError;
  const isFailed: FailureCheck = () => state.failed;

  return {
    ctx,
    fail,
    error,
    isFailed,
  };
}
