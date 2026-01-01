import { errorContext } from "../dist/index.js";
import { errgroup } from "errgroup";
import { background } from "go-like-ctx";

async function signup(input) {
  console.log("[signup] start", { email: input.email });
  const ctx = background().withTimeout(1000);
  const ectx = errorContext(ctx);
  const forcedFailure = pickRandomFailure();
  if (forcedFailure) {
    console.log("[signup] random fail enabled", { task: forcedFailure });
  } else {
    console.log("[signup] random fail disabled");
  }

  await verifyRecaptcha(input.recaptchaToken);
  console.log("[signup] recaptcha ok");
  const user = await createUser(input);
  console.log("[signup] user created", { id: user.id });

  const g = errgroup(ectx.ctx, {
    onError: (err) => {
      ectx.fail(err);
      console.error("[signup] failed", err.message);
    },
  });

  g.go(async (groupCtx) => {
    await trackAnalytics(groupCtx, user);
    console.log("[signup] analytics tracked");
  });

  g.go(async (groupCtx) => {
    await subscribeEmail(user);
    console.log("[signup] email subscription ok");
  });

  g.go(async (groupCtx) => {
    await sendConfirmation(user);
    console.log("[signup] confirmation sent");
  });

  await g.waitSafe();

  if (ectx.isFailed()) {
    return { ok: false, error: ectx.error() };
  }

  console.log("[signup] done");
  return { ok: true, user };
}

async function verifyRecaptcha(token) {
  console.log("[recaptcha] verifying");
  await sleep(50);
  if (!token || token.startsWith("bad")) {
    throw new Error("recaptcha failed");
  }
}

async function createUser(input) {
  console.log("[db] creating user");
  await sleep(80);
  return {
    id: "user_123",
    email: input.email,
    name: input.name,
  };
}

async function subscribeEmail(user) {
  console.log("[email] subscribing");
  await sleep(500);
  maybeFail("subscribe");
  if (!user.email.includes("@")) {
    throw new Error("email subscription failed");
  }
}

async function trackAnalytics(ctx, user) {
  console.log("[analytics] tracking");
  maybeFail("analytics");
  const reqCtx = ctx.withTimeout(800);
  const res = await fetch("https://httpbin.org/delay/0.2", {
    signal: reqCtx.signal(),
  });
  await res.text();
  void user;
}

async function sendConfirmation(user) {
  console.log("[email] sending confirmation");
  maybeFail("confirmation");
  await sleep(70);
  void user;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let chosenFailure = null;

function pickRandomFailure() {
  const options = ["subscribe", "analytics", "confirmation"];
  const envChoice = process.env.FAIL_TASK;
  if (envChoice && options.includes(envChoice)) {
    chosenFailure = envChoice;
    return chosenFailure;
  }
  if (process.env.ALWAYS_FAIL === "1") {
    chosenFailure = options[Math.floor(Math.random() * options.length)];
    return chosenFailure;
  }
  const withNone = [null, ...options];
  chosenFailure = withNone[Math.floor(Math.random() * withNone.length)];
  return chosenFailure;
}

function maybeFail(task) {
  if (chosenFailure === task) {
    throw new Error(`random ${task} failure`);
  }
}

var result = await signup({
  email: "ada@example.com",
  name: "Ada Lovelace",
  recaptchaToken: "ok_123",
});
console.log(result);
