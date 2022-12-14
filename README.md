# Fastify Jumpstart

A starter kit template for Fastify Typescript REST APIs.

## Features

- Typescript
- OpenAPI v3 with fastify-swagger
- Testing with Tap
- ESLint
- Database Agnostic
- Local Auth with JWT and refresh tokens

## Available Optional Plugins

- Prometheus for monitoring

## Project Structure

### `src/app.ts`

Contains the `build` function for bootstrapping a fastify instance. Also contains configuration for default
plugins like fastify-sensible, apiRouter, fastify-swagger, and healthRoute.

### `src/server.ts`

Actual server instance where you can apply any additional plugins and initialize the web serve.

### `src/plugins`

Contains all plugins like prom and localAuth.

### `src/schema`

Contains schema definitions. Using Typebox as the type provider for fastify.

### `src/index.d.ts`

Type definitions for extending Fastify and its plugins.

### `src/routes`

Contains router plugin definitions. By default, includes a `/health`, `/api`, and some placeholder endpoints to
demonstrate defining more.

Example of adding routes.

`src/routes/api/placeholder/placeholderRouter.ts`

```ts
import { FastifyPluginCallback } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

export const placeholderRouter: FastifyPluginCallback = (
  instance,
  opts,
  done
) => {
  // Important for type-safe schemas
  const fastify = instance.withTypeProvider<TypeBoxTypeProvider>();

  fastify.get("/", async (req, reply) => {
    reply.send("Success");
  });

  done();
};
```

`src/routes/api/index.ts`

```ts
import { FastifyPluginCallback } from "fastify";
import { placeholderRouter } from "./placeholder/placeholderRouter";

export const apiRouter: FastifyPluginCallback = (fastify, opts, done) => {
  // ...
  fastify.register(placeholderRouter, { prefix: "/placeholder" });
  done();
};
```

## Local Authorization Plugin

A local authorization plugin is included in `src/plugins/localAuth`. It utilizes `fastify-jwt` to implement access and
refresh tokens. Adds `/login`, `/signup`, `/logout`, and `/refresh` endpoints. To get started, you should define logic
for the login, signup, logout, and refresh hooks.

```ts
app.register(localAuth, {
  // Manually configure jwt settings. See fastify-jwtdocumentation for options
  // accessJwt: {
  //  ...
  // },
  // refreshJwt: {
  //  ...
  // },
  // Select a different root path, defaults to /auth
  // prefix: '/auth',
  signUp(user) {
    // Enter some logic to process signups and return a UserType
    return { id: "some-id", provider: "email" };
  },
  login(user) {
    // Enter some logic to process logins and return a UserType
    return { id: "user.id", provider: "email" };
  },
  logout(jti) {
    // Enter some logic to blacklist the jti
  },
  refresh(_jti: string): boolean {
    // Enter some logic to verify a refresh token jti is valid, return true if valid
    // A UUID is generated during signing to use as a jti
  },
});
```

### Protecting routes

```ts
fastify.addHook("onRequest", async (req, _reply) => {
  await req.accessVerify();
});
```

### Customizing the UserType

User properties and the jwt payload can be customized under the `src/index.d.ts` file.

```ts
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: string; provider: string }; // payload type is used for signing and verifying
    user: {
      id: string;
      provider: string;
    }; // user type is return type of `request.user` object
  }
}
```

## Todo:

- [x] Auth
- [ ] API Versioning