import { FastifyPluginCallback } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

export const protectedRouter: FastifyPluginCallback = (
  instance,
  opts,
  done
) => {
  const fastify = instance.withTypeProvider<TypeBoxTypeProvider>();

  // Verifies an access token on each request after adding hook
  fastify.addHook("onRequest", fastify.authorize);

  fastify.get("/", async (req, reply) => {
    reply.send(`hello ${req.user.id}`);
  });

  done();
};
