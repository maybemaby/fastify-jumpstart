import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import { build } from "./app";
import { config } from "./config/config";
import prom from "./plugins/prom";
import localAuth from "./plugins/localAuth";
import { apiRouter } from "./routes/api";

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
  // refreshCookie: {
  // }
  signUp(_user) {
    // Enter some logic to process signups and return a UserType
    return { id: "some-id", provider: "email" };
  },
  login(_user) {
    // Enter some logic to process logins and return a UserType
    return { id: "user.id", provider: "email" };
  },
  logout(jti) {
    // Enter some logic to blacklist the jti
    console.log(jti, "Logged out");
    return;
  },
  refresh(_jti: string): boolean {
    // Enter some logic to verify a refresh token jti is valid, return true if valid
    // A UUID is generated during signing to use as a jti
    return true;
  },
});

app.register(cors, {
  origin: "*",
});

// Uses fastify helmet and sensible plugins as defaults
app.register(helmet);

// Returns swagger spec JSON when not in production
if (process.env.NODE_ENV !== "production") {
  app.get("/spec", async (_req, _res) => {
    return app.swagger();
  });
}

app.register(apiRouter, { prefix: "/api" });

const parsedPort = parseInt(process.env.PORT ?? "5000");
const PORT = Number.isNaN(parsedPort) ? 5000 : parsedPort;
const HOST = process.env.HOST;

if (HOST) {
  app.listen(
    {
      port: PORT,
      host: HOST,
    },
    (err, _address) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
    }
  );
} else {
  app.listen(
    {
      port: PORT,
    },
    (err, _address) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
    }
  );
}
