import t from "tap";
import { build } from "../app";
import localAuth from "./localAuth";
import { FastifyInstance } from "fastify";

const setupApp = (overrides?: Partial<Parameters<typeof localAuth>[1]>) => {
  const app = build();
  app.register(localAuth, {
    signUp: (_user) => {
      return { id: "signedup", provider: "email" };
    },
    login: (_user) => {
      return { id: "loggedIn", provider: "email" };
    },
    logout(_jti: string): void | Promise<void> {
      return;
    },
    refresh(_jti: string): boolean | Promise<boolean> {
      return true;
    },
    ...overrides,
  });

  app.register(
    (instance, opts, done) => {
      instance.addHook("onRequest", instance.authorize);
      instance.get("/", (req, reply) => {
        reply.send("Success");
      });
      done();
    },
    { prefix: "/protected-test" }
  );

  return app;
};

t.test("local auth plugin", (t) => {
  t.test("signup", (t) => {
    t.test("default signup success", async (t) => {
      const app = setupApp();

      const res = await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: {
          email: "email@email.com",
          password: "password@password.com",
        },
      });

      t.ok(res.statusCode >= 200 && res.statusCode < 300);
      t.match(await res.json(), { userId: "signedup" });
    });

    t.test("signup returns bad request on error", async (t) => {
      const app = setupApp({
        signUp(_user) {
          throw new Error("test error");
        },
      });

      const res = await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: {
          email: "email@email.com",
          password: "password@password.com",
        },
      });

      t.ok(res.statusCode === 400);
    });

    t.end();
  });

  t.test("login", (t) => {
    t.test("default login success", async (t) => {
      const app = setupApp();

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "email@email.com",
          password: "password231",
        },
      });

      t.ok(res.statusCode >= 200 && res.statusCode < 300);
      t.match(await res.json(), { userId: "loggedIn" });
    });

    t.test("login returns unauthorized on err", async (t) => {
      const app = setupApp({
        login(_user) {
          throw new Error("test error");
        },
      });

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "email@email.com",
          password: "password@password.com",
        },
      });

      t.ok(res.statusCode === 401);
    });

    t.test("returns not found on null", async (t) => {
      const app = setupApp({
        login(_user) {
          return null;
        },
      });

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "email@email.com",
          password: "password@password.com",
        },
      });

      t.ok(res.statusCode === 404);
    });

    t.end();
  });

  t.test("refresh", (t) => {
    t.test("refresh success", async (t) => {
      const app = setupApp();

      const { cookie } = await loginAndGetTokenAndCookie(app);

      const res = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        cookies: { "fastify-refresh": cookie.value },
      });

      t.ok(res.statusCode === 200);
    });

    t.test("refresh fail missing cookie", async (t) => {
      const app = setupApp({
        refresh(_jti: string): boolean | Promise<boolean> {
          return false;
        },
      });

      const res = await app.inject({
        method: "POST",
        url: "/auth/refresh",
      });

      t.equal(res.statusCode, 401);
    });

    t.test("refresh auto success", async (t) => {
      const app = setupApp({
        autoRefresh: true,
        accessJwt: {
          secret: process.env.JWT_SECRET!,
          sign: {
            algorithm: "HS256",
            expiresIn: 1,
          },
          namespace: "access",
          jwtVerify: "accessVerify",
          jwtSign: "accessSign",
        },
      });

      const { cookie, accessToken } = await loginAndGetTokenAndCookie(app);

      await delay(1100);

      const finalRes = await app.inject({
        method: "GET",
        url: "/protected-test",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        cookies: { "fastify-refresh": cookie.value },
      });

      t.equal(finalRes.statusCode, 200);
      t.ok(finalRes.headers["x-access-token"]);
      t.equal(finalRes.body, "Success");
      t.notSame(finalRes.cookies.pop(), cookie);
    });

    t.test("refresh auto fail: No refresh token", async (t) => {
      const app = setupApp({
        autoRefresh: true,
        accessJwt: {
          secret: process.env.JWT_SECRET!,
          sign: {
            algorithm: "HS256",
            expiresIn: 1,
          },
          namespace: "access",
          jwtVerify: "accessVerify",
          jwtSign: "accessSign",
        },
      });

      const { accessToken } = await loginAndGetTokenAndCookie(app);

      await delay(1100);

      const finalRes = await app.inject({
        method: "GET",
        url: "/protected-test",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      t.equal(finalRes.statusCode, 401);
    });

    t.end();
  });

  t.test("authorize", (t) => {
    t.test("fails on missing header", async (t) => {
      const app = setupApp();

      const res = await app.inject({
        method: "GET",
        url: "/protected-test",
      });

      t.equal(res.statusCode, 401);
      t.ok(res.body.includes("Must include a Bearer authorization."));
    });

    t.test("Fails on not a bearer header", async (t) => {
      const app = setupApp();
      const { accessToken } = await loginAndGetTokenAndCookie(app);

      const res = await app.inject({
        method: "GET",
        url: "/protected-test",
        headers: {
          authorization: `Basic ${accessToken}`,
        },
      });

      t.equal(res.statusCode, 401);
      t.ok(res.body.includes("Must include a Bearer authorization."));
    });

    t.end();
  });

  t.end();
});

async function loginAndGetTokenAndCookie(app: FastifyInstance) {
  const tokenRes = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      email: "email@email.com",
      password: "password@password.com",
    },
  });

  const cookie = tokenRes.cookies.pop() as {
    name: "fastify-refresh";
    value: string;
  };

  const { accessToken } = tokenRes.json<{ accessToken: string }>();

  return {
    accessToken,
    cookie,
  };
}

function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
