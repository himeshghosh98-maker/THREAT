#!/bin/sh
set -eu
# The node prints development credentials at startup. Discard its output.
node node_modules/hardhat/internal/cli/cli.js node --hostname 0.0.0.0 >/dev/null 2>&1 &
node_pid=$!
trap 'kill "$node_pid" 2>/dev/null || true' EXIT
trap 'exit 0' TERM INT
node -e '
(async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch("http://127.0.0.1:8545", {method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({jsonrpc:"2.0",id:1,method:"eth_chainId",params:[]})});
      if ((await r.json()).result === "0x7a69") return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  process.exit(1);
})();'
npx --no-install hardhat run scripts/deploy.ts --network localhost
wait "$node_pid"
