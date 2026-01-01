async function signup(input) {
  console.log("[signup] start", { email: input.email });
  const forcedFailure = pickRandomFailure();
  if (forcedFailure) {
    console.log("[signup] random fail enabled", { task: forcedFailure });
  } else {
    console.log("[signup] random fail disabled");
  }

  const controller = new AbortController();
  const signal = controller.signal;
  let firstErr = null;

  const markError = (err) => {
    const error = err instanceof Error ? err : new Error("signup task failed");
    if (firstErr === null) {
      firstErr = error;
      controller.abort();
    }
    throw error;
  };

  await verifyRecaptcha(input.recaptchaToken);
  console.log("[signup] recaptcha ok");
  const user = await createUser(input);
  console.log("[signup] user created", { id: user.id });

  const tasks = [
    trackAnalytics(signal, user)
      .then(() => {
        console.log("[signup] analytics tracked");
      })
      .catch(markError),
    subscribeEmail(user)
      .then(() => {
        console.log("[signup] email subscription ok");
      })
      .catch(markError),
    sendConfirmation(user)
      .then(() => {
        console.log("[signup] confirmation sent");
      })
      .catch(markError),
  ];

  await Promise.allSettled(tasks);
  if (firstErr) {
    console.error("[signup] failed", firstErr.message);
    return { ok: false, error: firstErr };
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

async function trackAnalytics(signal, user) {
  console.log("[analytics] tracking");
  maybeFail("analytics");
  await fetchWithAbort(signal, "https://httpbin.org/delay/0.2");
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

async function fetchWithAbort(signal, url) {
  const controller = new AbortController();
  signal.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const res = await fetch(url, { signal: controller.signal });
    await res.text();
  } finally {}
}

var result = await signup({
  email: "ada@example.com",
  name: "Ada Lovelace",
  recaptchaToken: "ok_123",
});
console.log(result);
