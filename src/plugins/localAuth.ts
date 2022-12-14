import { randomUUID } from "crypto";
import { FastifyPluginCallback } from "fastify";
import jwt, { UserType } from "@fastify/jwt";
import fp from "fastify-plugin";
import { LocalAuthPluginOptions } from "../types/types";
import { PostUserSchema } from "../schema/user";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { AuthSuccessResSchema } from "../schema/auth";

const localAuthPlugin: FastifyPluginCallback<LocalAuthPluginOptions> = (
  instance,
  opts,
  done
) => {
  const fastify = instance.withTypeProvider<TypeBoxTypeProvider>();
  // Allow path overrides
  const path = opts.path ?? "/auth";

  // Make sure a proper secret is available
  if (
    (typeof process.env.JWT_SECRET !== "string" ||
      typeof process.env.REFRESH_SECRET !== "string") &&
    (!opts.accessJwt || !opts.refreshJwt)
  ) {
    throw new Error("Must provide a JWT secret");
  }

  fastify.register(
    jwt,
    opts.accessJwt ?? {
      // Default JWT configs
      secret: process.env.JWT_SECRET!,
      sign: {
        algorithm: "HS256",
        expiresIn: 3600,
      },
      namespace: "access",
      jwtVerify: "accessVerify",
      jwtSign: "accessSign",
    }
  );

  fastify.register(
    jwt,
    opts.refreshJwt ?? {
      secret: process.env.REFRESH_SECRET!,
      sign: {
        algorithm: "HS256",
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        jti: randomUUID(),
      },
      namespace: "refresh",
      jwtVerify: "refreshVerify",
      jwtSign: "refreshSign",
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
        return {
          accessToken: token,
          refreshToken: refreshToken,
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

        return {
          accessToken: token,
          refreshToken,
          userId: user.id,
          provider: "email",
        };
      } catch (e) {
        return reply.unauthorized("Request unauthorized.");
      }
    }
  );

  fastify.post(`${path}/logout`, {}, async (req, reply) => {
    const { payload: decoded } = await req.refreshVerify<{
      payload: UserType & { exp: number; jti: string };
    }>({
      complete: true,
    });
    await opts.logout(decoded.jti);
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
      return {
        accessToken: token,
        refreshToken,
        userId: decoded.id,
        provider: decoded.provider,
      };
    }
  );

  done();
};

export default fp(localAuthPlugin, { name: "localAuth" });
