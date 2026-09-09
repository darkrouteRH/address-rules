# @darkroute/address-rules

Per-chain crypto address validation. Zero dependencies, no network calls, ~100 lines.

This is the exact check [DarkRoute](https://darkroute.exchange) runs before it creates an order —
extracted so other people stop pasting regexes out of forum answers.

```ts
import { checkAddress, isEvm, chainsFor } from "@darkroute/address-rules";

checkAddress("btc", "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq");
// { ok: true, hint: "bc1… / 1… / 3… Bitcoin address" }

checkAddress("sol", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
// { ok: false, hint: "Solana address" }   ← an EVM address pasted on Solana

checkAddress("some-new-chain", "abcdefghijkl");
// { ok: true, unknownChain: true }        ← no rule, fell back to a length check

isEvm("base");                             // true
chainsFor("0xd8dA…96045");                 // every EVM chain — an address cannot tell you which
```

## What it does not do

- **No checksums.** EIP-55, base58check and bech32 polynomials are not verified. Shape only.
- **No existence check.** It never asks a node whether an address exists or holds anything.
- **No chain detection.** `chainsFor` returns candidates, not an answer — one EVM address matches
  seventeen chains.

Sending to a wrong receiving address is irreversible, so the framing matters: this catches typos
and wallet-mixups. It is a seatbelt, not a destination check.

## Chains

EVM (17 ids incl. Robinhood Chain) · Bitcoin · Solana · NEAR · Tron · Dogecoin · XRP · TON · Zcash

An unknown chain flags `unknownChain` and falls back to a length check rather than hard-failing, so
adding a network isn't blocked on this library shipping a rule first.

## Tests

```bash
npm test      # node --test, no dependencies, no build step
```

The suite exists for the mistakes that actually happen — an EVM address pasted on Bitcoin, a
truncated copy, a wrong prefix. It has already paid for itself once: it caught NEAR sub-accounts
(`v2.ref-finance.near`) being rejected by the pattern this was extracted from, which was a live bug
in the router. Found in the first run.

MIT.
