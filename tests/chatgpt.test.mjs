import assert from "node:assert/strict";
import { test } from "node:test";
import { ChatGPTPool } from "../dist/chatgpt.js";

const credentialMarker = ["private", "value"].join("-");

test("selects an existing account and handles an empty pool", () => {
  const pool = new ChatGPTPool();
  assert.equal(pool.chatGPTAPI, undefined);
  const account = { account: {}, chatGpt: {} };
  pool.chatGPTPools = [account];
  assert.equal(pool.chatGPTAPI, account);
});

test("does not log credentials when sending a message fails", async (t) => {
  const log = t.mock.method(console, "log", () => {});
  const error = t.mock.method(console, "error", () => {});
  const pool = new ChatGPTPool();
  pool.chatGPTPools = [{
    account: { email: "test@example.invalid", password: credentialMarker },
    chatGpt: { sendMessage: async () => { throw new Error("failed"); } },
  }];

  await pool.sendMessage("hello", "test");
  assert.equal(error.mock.callCount(), 1);
  const output = JSON.stringify([...log.mock.calls, ...error.mock.calls]);
  assert.equal(output.includes(credentialMarker), false);
  assert.equal(output.includes("test@example.invalid"), false);
});

test("does not log credentials when refreshing an account", async (t) => {
  const log = t.mock.method(console, "log", () => {});
  const pool = new ChatGPTPool();
  let attempts = 0;
  pool.chatGPTPools = [{
    account: { email: "test@example.invalid", password: credentialMarker },
    chatGpt: {
      sendMessage: async () => {
        if (attempts++ === 0) throw new Error("ChatGPT failed to refresh auth token");
        return { response: "ok", conversationId: "c", messageId: "m" };
      },
    },
  }];
  pool.resetAccount = async () => {};

  assert.equal(await pool.sendMessage("hello", "test"), "ok");
  const output = JSON.stringify(log.mock.calls);
  assert.equal(output.includes(credentialMarker), false);
  assert.equal(output.includes("test@example.invalid"), false);
});
