import { randomUUID } from "crypto";
import { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import jwt, { UserType } from "@fastify/jwt";
import cookie, { CookieSerializeOptions } from "@fastify/cookie";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { PostUserSchema } from "../schema/user";
import { AuthSuccessResSchema } from "../schema/auth";
import type { LocalAuthPluginOptions } from "../types/types";

const localAuthPlugin: FastifyPluginCallback<LocalAuthPluginOptions> = (
  instance,
  opts,
  done
) => {
  const REFRESH_COOKIE_NAME = "fastify-refresh";
  const env = process.env.NODE_ENV;
  const fastify = instance.withTypeProvider<TypeBoxTypeProvider>();
  // Allow path overrides
  const path = opts.path ?? "/auth";

  const cookieOpts: CookieSerializeOptions = opts.refreshCookie ?? {
    path: "/",
    secure: env === "production",
    httpOnly: true,
    sameSite: "lax",
    signed: true,
  };

  // Make sure a proper secret is available
  if (
    (typeof process.env.JWT_SECRET !== "string" ||
      typeof process.env.REFRESH_SECRET !== "string") &&
    (!opts.accessJwt || !opts.refreshJwt)
  ) {
    throw new Error("Must provide a JWT secret");
  }

  if (typeof process.env.COOKIE_SECRET !== "string") {
    throw new Error("Must provide cookie secret");
  }

  fastify.register(cookie, {
    hook: "onRequest",
    secret: process.env.COOKIE_SECRET,
  });

  fastify.register(
    jwt,
    opts.accessJwt ?? {
      // Default JWT configs
      secret: process.env.JWT_SECRET!,
      sign: {
        algorithm: "HS256",
        expiresIn: 3600, // 1 day
      },
      namespace: "access",
      jwtVerify: "accessVerify",
      jwtSign: "accessSign",
    }
  );

  fastify.register(
    jwt,
    opts.refreshJwt ?? {
      // Default Refresh JWT configs
      secret: process.env.REFRESH_SECRET!,
      sign: {
        algorithm: "HS256",
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        jti: randomUUID(),
      },
      namespace: "refresh",
      jwtVerify: "refreshVerify",
      jwtSign: "refreshSign",
      jwtDecode: "refreshDecode",
      cookie: {
        cookieName: REFRESH_COOKIE_NAME,
        signed: true,
      },
    }
  );

  fastify.post(
    `${path}/signup`,
    {
      schema: {
        body: PostUserSchema,
        response: {
          200: AuthSuccessResSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const user = await opts.signUp(req.body);
        const token = await reply.accessSign(user, {
          sign: {
            sub: user.id,
          },
        });
        const refreshToken = await reply.refreshSign(user, {
          sign: {
            sub: user.id,
          },
        });

        reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, cookieOpts);
        return {
          accessToken: token,
          userId: user.id,
          provider: "email",
        };
      } catch (e) {
        return reply.badRequest("Could not create user");
      }
    }
  );

  fastify.post(
    `${path}/login`,
    {
      schema: {
        body: PostUserSchema,
        response: {
          200: AuthSuccessResSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const user = await opts.login(req.body);
        if (!user) {
          return reply.notFound("User not found");
        }
        const token = await reply.accessSign(user, {
          sign: {
            sub: user.id,
          },
        });

        const refreshToken = await reply.refreshSign(user, {
          sign: {
            sub: user.id,
          },
        });

        reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, cookieOpts);

        return {
          accessToken: token,
          userId: user.id,
          provider: "email",
        };
      } catch (e) {
        return reply.unauthorized("Request unauthorized.");
      }
    }
  );

  fastify.post(`${path}/logout`, {}, async (req, reply) => {
    const { payload: decoded } = await req.refreshDecode<{
      payload: UserType & { exp: number; jti: string };
    }>({
      decode: {
        complete: true,
      },
      verify: {
        complete: true,
        onlyCookie: true,
      },
    });
    await opts.logout(decoded.jti);
    reply.clearCookie(REFRESH_COOKIE_NAME);
    reply.code(200);
    return {
      message: "Signed out",
    };
  });

  fastify.post(
    `${path}/refresh`,
    {
      schema: {
        response: {
          200: AuthSuccessResSchema,
        },
      },
    },
    async (req, reply) => {
      const { payload: decoded } = await req.refreshVerify<{
        payload: UserType & { exp: number; jti: string };
      }>({
        complete: true,
        onlyCookie: true,
      });

      // Pass in the jti to a refresh token check
      if (!(await opts.refresh(decoded.jti))) {
        return reply.unauthorized("Invalid refresh token");
      }

      const token = await reply.accessSign(
        { id: decoded.id, provider: decoded.provider },
        {
          sign: {
            sub: decoded.id,
          },
        }
      );

      const refreshToken = await reply.refreshSign(
        { id: decoded.id, provider: decoded.provider },
        {
          sign: {
            sub: decoded.id,
          },
        }
      );

      reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, cookieOpts);

      return {
        accessToken: token,
        userId: decoded.id,
        provider: decoded.provider,
      };
    }
  );

  done();
};

export default fp(localAuthPlugin, { name: "localAuth" });
