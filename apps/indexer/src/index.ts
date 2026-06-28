// Lumora indexer entry point: start the API + run the poller in an infinite loop.
import { config } from "./config.js";
import { startApi } from "./api.js";
import { runPoller } from "./poller.js";

console.log(`Lumora indexer · db=${config.dbPath} · rpc=${config.rpcUrl}`);
startApi();
runPoller().catch((e) => {
  console.error("[fatal] poller stopped:", e);
  process.exit(1);
});
