import { FastifyPluginCallback } from "fastify";
import jwt from "@fastify/jwt";
import fp from "fastify-plugin";
import { LocalAuthPluginOptions } from "../types/types";
import { PostUserSchema } from "../schema/user";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import * as repl from "repl";
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
  if (typeof process.env.JWT_SECRET !== "string" && !opts.jwt) {
    throw new Error("Must provide a JWT secret");
  }

  fastify.register(
    jwt,
    opts.jwt ?? {
      // Default JWT configs
      secret: process.env.JWT_SECRET!,
      sign: {
        algorithm: "HS256",
        expiresIn: 3600,
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
        const token = await reply.jwtSign(user, {
          sign: {
            sub: user.id,
          },
        });
        console.log(token);
        return {
          accessToken: token,
          userId: user.id,
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
        const token = await reply.jwtSign(user, {
          sign: {
            sub: user.id,
          },
        });
        return {
          accessToken: token,
          userId: user.id,
        };
      } catch (e) {
        return reply.unauthorized("Request unauthorized.");
      }
    }
  );

  done();
};

export default fp(localAuthPlugin, { name: "localAuth" });
