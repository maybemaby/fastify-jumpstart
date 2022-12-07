import prom, { Registry } from "prom-client";

declare module "fastify" {
  interface FastifyInstance {
    prom: typeof prom;
    promRegister: Registry;
  }
}
