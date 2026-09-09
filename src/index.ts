/**
 * Per-chain address validation. No dependencies, no network calls.
 *
 * This is the exact check a production swap router runs before it creates an order, extracted so
 * other people stop pasting regexes out of forum answers. It is deliberately *shape* validation:
 * it tells you an address could belong to a chain, not that it exists or that anyone holds it.
 *
 * What it will not do:
 * - verify a checksum (EIP-55, base58check, bech32 polynomial) — see the note on each rule
 * - tell you an address is funded, valid on-chain, or yours
 * - guess a chain from an address alone, except via `chainsFor`, which returns every candidate
 *
 * Getting a receiving address wrong is irreversible, so the honest framing matters: this catches
 * typos and pasted-from-the-wrong-wallet mistakes. It is a seatbelt, not a destination check.
 */

export type Rule = {
  /** Chain ids this pattern accepts. */
  chains: string[];
  re: RegExp;
  /** Human hint, suitable for putting straight under an input. */
  hint: string;
};

/**
 * EVM chains share one address shape, so they share one rule. Adding a new EVM chain is adding an
 * id to this list, which is why it is first and why `isEvm` reads from it.
 */
export const ADDRESS_RULES: Rule[] = [
  {
    chains: [
      "eth", "base", "arb", "op", "pol", "bsc", "avax", "gnosis", "scroll",
      "monad", "xlayer", "bera", "plasma", "abs", "hypercore", "fogo", "robinhood",
    ],
    // Shape only. EIP-55 checksums are not enforced: mixed-case and all-lowercase are both common
    // in the wild, and rejecting lowercase would break more paste flows than it protects.
    re: /^0x[a-fA-F0-9]{40}$/,
    hint: "0x… EVM address",
  },
  {
    chains: ["btc"],
    // bech32 (bc1…) and legacy base58 (1…, 3…). No checksum verification on either.
    re: /^(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
    hint: "bc1… / 1… / 3… Bitcoin address",
  },
  {
    chains: ["sol"],
    re: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    hint: "Solana address",
  },
  {
    chains: ["near"],
    // Named accounts and 64-hex implicit accounts. Sub-accounts (a.b.near) are accepted.
    re: /^([a-z0-9_-]+(\.[a-z0-9_-]+)*\.near|[a-f0-9]{64})$/,
    hint: "name.near or 64-hex NEAR account",
  },
  { chains: ["tron"], re: /^T[1-9A-HJ-NP-Za-km-z]{33}$/, hint: "T… Tron address" },
  { chains: ["doge"], re: /^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/, hint: "D… Dogecoin address" },
  { chains: ["xrp"], re: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/, hint: "r… XRP address" },
  { chains: ["ton"], re: /^(EQ|UQ)[A-Za-z0-9_-]{46}$/, hint: "EQ… / UQ… TON address" },
  { chains: ["zec"], re: /^t1[a-km-zA-HJ-NP-Z1-9]{33}$/, hint: "t1… transparent Zcash address" },
];

export type CheckResult = {
  /** True when the address matches the chain's shape. */
  ok: boolean;
  /** What a correct address looks like. Absent when the chain is unknown. */
  hint?: string;
  /** True when no rule covers this chain, so `ok` came from a length fallback rather than a pattern. */
  unknownChain?: boolean;
};

export const ruleFor = (chain: string): Rule | undefined =>
  ADDRESS_RULES.find((r) => r.chains.includes(chain));

/**
 * Check `address` against `chain`.
 *
 * An unrecognised chain does not throw and does not hard-fail: it falls back to a length check and
 * flags `unknownChain`, so a caller adding a new network is not blocked by this library shipping a
 * rule first. Check that flag if you would rather refuse than guess.
 */
export function checkAddress(chain: string, address: string): CheckResult {
  const addr = address.trim();
  const rule = ruleFor(chain);
  if (!rule) return { ok: addr.length > 6, unknownChain: true };
  return { ok: rule.re.test(addr), hint: rule.hint };
}

/** True when the chain uses the EVM address shape. */
export const isEvm = (chain: string): boolean => ADDRESS_RULES[0].chains.includes(chain);

/** Every chain id this library knows a pattern for. */
export const supportedChains = (): string[] => ADDRESS_RULES.flatMap((r) => r.chains);

/**
 * Every chain whose shape this address could match. Useful for "did you mean?" hints, useless as a
 * source of truth: an EVM address matches seventeen chains and the address itself cannot tell you
 * which one was meant.
 */
export function chainsFor(address: string): string[] {
  const addr = address.trim();
  return ADDRESS_RULES.filter((r) => r.re.test(addr)).flatMap((r) => r.chains);
}
