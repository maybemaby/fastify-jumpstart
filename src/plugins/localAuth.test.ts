import t from "tap";
import { build } from "../app";
import localAuth from "./localAuth";

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

      const res = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        cookies: { "fastify-refresh": cookie.value },
      });

      t.ok(res.statusCode === 200);
    });

    t.test("refresh fail", async (t) => {
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

    t.end();
  });

  t.end();
});
