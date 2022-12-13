import t from "tap";
import { build } from "../app";
import localAuth from "./localAuth";

const setupApp = (overrides?: Partial<Parameters<typeof localAuth>[1]>) => {
  const app = build();
  app.register(localAuth, {
    signUp: (user) => {
      return { id: "signedup" };
    },
    login: (user) => {
      return { id: "loggedIn" };
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
        signUp(user) {
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

      console.log(res.statusCode);
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
        login(user) {
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
        login(user) {
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

  t.end();
});
