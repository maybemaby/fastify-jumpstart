import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import { build } from "./app";
import { config } from "./config/config";
import prom from "./plugins/prom";

const app = build({
  logger: config[process.env.NODE_ENV ?? "production"].logger,
});

// Uncomment for exposing prometheus metrics at /metrics endpoint
// See plugins/prom.ts
// app.register(prom);

// Uses fastify helmet and sensible plugins as defaults
app.register(helmet);
app.register(sensible);

// Returns swagger spec JSON when not in production
if (process.env.NODE_ENV !== "production") {
  app.get("/spec", async (_req, _res) => {
    return app.swagger();
  });
}

app.listen(
  {
    port: 5000,
  },
  (err, _address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
  }
);
