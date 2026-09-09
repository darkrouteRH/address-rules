import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADDRESS_RULES,
  checkAddress,
  chainsFor,
  isEvm,
  ruleFor,
  supportedChains,
} from "../src/index.ts";

/** Real, well-known public addresses. Nothing here is anybody's live wallet worth checking. */
const VALID: [string, string][] = [
  ["eth", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"],
  ["eth", "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"], // lowercase is accepted on purpose
  ["base", "0x4200000000000000000000000000000000000006"],
  ["robinhood", "0xebb4c5b97e4117e30ec82ce025e6f21dded05436"],
  ["btc", "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"],
  ["btc", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"],
  ["btc", "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"],
  ["sol", "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"],
  ["near", "intents.near"],
  ["near", "a.sub.near"],
  ["near", "9f1e2b3c4d5a6b7c8d9e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e"],
  ["tron", "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9"],
  ["doge", "DBXu2kgc3xtvCUWFcxFE3r9hEYgmuaaCyD"],
  ["xrp", "rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh"],
  ["ton", "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N"],
  ["zec", "t1KDGdF4hDN9EinFLLdgivFqsBhrsvNZfrs"],
];

/** The mistakes that actually happen: wrong chain, truncated paste, one character short. */
const INVALID: [string, string, string][] = [
  ["eth", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA9604", "one character short"],
  ["eth", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045Z", "trailing junk"],
  ["eth", "d8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "missing 0x"],
  ["eth", "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", "a Bitcoin address on an EVM chain"],
  ["btc", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "an EVM address on Bitcoin"],
  ["btc", "bc1", "far too short"],
  ["sol", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "an EVM address on Solana"],
  ["near", "NOT.NEAR", "uppercase named account"],
  ["near", "intents.testnet", "wrong suffix"],
  ["tron", "XN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9", "wrong prefix"],
  ["xrp", "sEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh", "wrong prefix"],
  ["ton", "XQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N", "wrong prefix"],
  ["zec", "t3KDGdF4hDN9EinFLLdgivFqsBhrsvNZfrs", "shielded prefix, not transparent"],
];

test("accepts real addresses on their own chain", () => {
  for (const [chain, addr] of VALID) {
    assert.equal(checkAddress(chain, addr).ok, true, `${chain} rejected ${addr}`);
  }
});

test("rejects the mistakes people actually make", () => {
  for (const [chain, addr, why] of INVALID) {
    assert.equal(checkAddress(chain, addr).ok, false, `${chain} accepted ${addr} (${why})`);
  }
});

test("trims surrounding whitespace from a paste", () => {
  assert.equal(checkAddress("eth", "  0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\n").ok, true);
});

test("an unknown chain flags itself instead of silently passing or failing", () => {
  const r = checkAddress("some-new-chain", "abcdefghijkl");
  assert.equal(r.unknownChain, true);
  assert.equal(r.ok, true, "a plausible string should pass the fallback");
  assert.equal(checkAddress("some-new-chain", "abc").ok, false, "a short string should not");
  assert.equal(r.hint, undefined, "there is no hint to give for an unknown chain");
});

test("a known chain never claims to be unknown", () => {
  assert.equal(checkAddress("eth", "0x0").unknownChain, undefined);
});

test("every rule carries a hint, and known chains return it", () => {
  for (const r of ADDRESS_RULES) assert.ok(r.hint.length > 0);
  assert.equal(checkAddress("btc", "nope").hint, "bc1… / 1… / 3… Bitcoin address");
});

test("isEvm agrees with the EVM rule", () => {
  assert.equal(isEvm("eth"), true);
  assert.equal(isEvm("robinhood"), true);
  assert.equal(isEvm("btc"), false);
  assert.equal(isEvm("nonsense"), false);
});

test("chainsFor lists every chain an address could belong to", () => {
  const evm = chainsFor("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  assert.ok(evm.includes("eth") && evm.includes("base"), "should span EVM chains");
  assert.ok(!evm.includes("btc"));
  assert.deepEqual(chainsFor("nonsense-address-here"), []);
});

test("no chain id is claimed by two different rules", () => {
  const all = supportedChains();
  assert.equal(new Set(all).size, all.length, "a chain appears in more than one rule");
});

test("ruleFor returns the rule that actually matched", () => {
  assert.equal(ruleFor("base"), ADDRESS_RULES[0]);
  assert.equal(ruleFor("btc")?.chains[0], "btc");
  assert.equal(ruleFor("unknown"), undefined);
});
