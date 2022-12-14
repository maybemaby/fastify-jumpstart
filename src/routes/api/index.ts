import { Type } from "@sinclair/typebox";
import { FastifyPluginCallback } from "fastify";
import { placeholderRouter } from "./placeholder/placeholderRouter";
import { protectedRouter } from "./protected/protected";

// Root api router,
export const apiRouter: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.get(
    "/",
    {
      schema: {
        response: {
          200: Type.Object(
            {
              version: Type.String(),
            },
            {
              description: "API Information",
            }
          ),
        },
      },
    },
    async (_req, _res) => {
      return { version: "1" };
    }
  );

  // Register any api routes here:
  // Delete this example
  fastify.register(placeholderRouter, { prefix: "/placeholder" });
  fastify.register(protectedRouter, { prefix: "/protected" });
  done();
};
