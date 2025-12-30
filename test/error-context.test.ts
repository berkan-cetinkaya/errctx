import { describe, expect, it, vi } from "vitest";
import { background } from "go-like-ctx";
import type { Context } from "go-like-ctx";
import { errgroup } from "../src";
import { errorContext } from "../src/error-context";

describe("errorContext", () => {
  it("records only the first error", () => {
    const ctx = {} as Context;
    const ectx = errorContext(ctx);
    const first = new Error("first");
    const second = new Error("second");

    ectx.fail(first);
    ectx.fail(second);

    expect(ectx.isFailed()).toBe(true);
    expect(ectx.error()).toBe(first);
  });

  it("stays unfailed without fail()", () => {
    const ctx = {} as Context;
    const ectx = errorContext(ctx);

    expect(ectx.isFailed()).toBe(false);
    expect(ectx.error()).toBe(null);
  });

  it("does not cancel the context", () => {
    const ctx = background();
    const cancel = vi.spyOn(ctx, "cancel");
    const ectx = errorContext(ctx as Context);

    ectx.fail(new Error("boom"));

    expect(cancel).not.toHaveBeenCalled();
  });

  it("captures errgroup failures via onError", async () => {
    const ctx = background();
    const ectx = errorContext(ctx);
    const group = errgroup(ctx, {
      onError: (err) => ectx.fail(err),
    });
    const boom = new Error("boom");

    group.go(() => {
      throw boom;
    });

    await expect(group.wait()).rejects.toBe(boom);
    expect(ectx.isFailed()).toBe(true);
    expect(ectx.error()).toBe(boom);
  });
});
