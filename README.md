# errctx

Go-style error context tracking for Node.js.

## Install

```bash
npm i errctx
```

## Usage

```ts
import { errgroup, errorContext } from "errctx";
import { background } from "go-like-ctx";

const ctx = background();
const ectx = errorContext(ctx);

const g = errgroup(ectx.ctx, {
  onError: (err) => ectx.fail(err),
});

g.go(async (groupCtx) => {
  void groupCtx;
  // do work
});

await g.wait();

if (ectx.isFailed()) {
  console.error("reason:", ectx.error());
}
```

## API

### errorContext(ctx)

Returns an object with:

- `ctx`: the input context
- `fail(err)`: record only the first error
- `error()`: returns the recorded error or null
- `isFailed()`: true only if `fail()` was called

### errgroup(ctx, opts)

Re-exported from the `errgroup` package.

## Examples

- `examples/signup.js`
- `examples/signup.no-lib.js`
