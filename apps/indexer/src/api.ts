// Lightweight REST API (built-in http; no external framework). Frontend can read from here.
import { createServer } from "node:http";
import { config } from "./config.js";
import { queryEvents, stats } from "./db.js";
import { employerAnalytics, employeeAnalytics } from "./analytics.js";

function send(res: import("node:http").ServerResponse, code: number, body: unknown) {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // demo/testnet: open to all origins
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  });
  res.end(json);
}

export function startApi(): void {
  const server = createServer((req, res) => {
    if (req.method === "OPTIONS") return send(res, 204, {});
    const url = new URL(req.url ?? "/", `http://localhost:${config.port}`);
    const p = url.pathname;
    const q = url.searchParams;

    try {
      if (p === "/health") {
        return send(res, 200, { ok: true, ...stats(), contracts: config.contracts });
      }
      if (p === "/events") {
        return send(
          res,
          200,
          queryEvents({
            contract: q.get("contract") ?? undefined,
            kind: q.get("kind") ?? undefined,
            address: q.get("address") ?? undefined,
            limit: q.get("limit") ? Number(q.get("limit")) : undefined,
          })
        );
      }
      const emp = p.match(/^\/analytics\/employer\/(G[A-Z2-7]{55})$/);
      if (emp) return send(res, 200, employerAnalytics(emp[1]));

      const empe = p.match(/^\/analytics\/employee\/(G[A-Z2-7]{55})$/);
      if (empe) return send(res, 200, employeeAnalytics(empe[1]));

      return send(res, 404, { error: "not found", routes: ["/health", "/events", "/analytics/employer/:G…", "/analytics/employee/:G…"] });
    } catch (e) {
      return send(res, 500, { error: String(e).slice(0, 200) });
    }
  });

  server.listen(config.port, () => {
    console.log(`[api] http://localhost:${config.port} · /health /events /analytics/...`);
  });
}
