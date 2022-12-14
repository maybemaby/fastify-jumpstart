import { FastifyPluginCallback } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

export const protectedRouter: FastifyPluginCallback = (
  instance,
  opts,
  done
) => {
  const fastify = instance.withTypeProvider<TypeBoxTypeProvider>();

  fastify.addHook("onRequest", async (req, _reply) => {
    await req.jwtVerify();
  });

  fastify.get("/", async (req, reply) => {
    reply.send(`hello ${req.user.id}`);
  });

  done();
};
