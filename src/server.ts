import helmet from "@fastify/helmet";
import { build } from "./app";
import { config } from "./config/config";
import prom from "./plugins/prom";
import localAuth from "./plugins/localAuth";

const app = build({
  logger: config[process.env.NODE_ENV ?? "production"].logger,
});

// Uncomment for exposing prometheus metrics at /metrics endpoint
// See plugins/prom.ts
// app.register(prom);

// Local auth JWT plugin. Uses email and password by default
app.register(localAuth, {
  // Manually configure jwt settings
  // jwt: {
  //   secret: process.env.JWT_SECRET ?? "secret-jwt-key",
  //   sign: {
  //     expiresIn: 3600,
  //   },
  // },
  signUp(user) {
    console.log(user);
    return { id: "some-id" };
  },
  login(user) {
    return { id: "user.id" };
  },
});

// Uses fastify helmet and sensible plugins as defaults
app.register(helmet);

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
