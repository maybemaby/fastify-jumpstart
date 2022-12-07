import { FastifyPluginCallback } from "fastify";

export const placeholderRouter: FastifyPluginCallback = (
  instance,
  opts,
  done
) => {
  instance.get("/", async (req, reply) => {
    reply.send("Success");
  });
  done();
};
