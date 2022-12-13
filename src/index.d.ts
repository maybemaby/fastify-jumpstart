import prom, { Registry } from "prom-client";

declare module "fastify" {
  interface FastifyInstance {
    prom: typeof prom;
    promRegister: Registry;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: string }; // payload type is used for signing and verifying
    user: {
      id: string;
    }; // user type is return type of `request.user` object
  }
}
