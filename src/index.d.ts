import prom, { Registry } from "prom-client";

declare module "fastify" {
  interface FastifyInstance {
    prom: typeof prom;
    promRegister: Registry;
  }

  interface FastifyRequest {
    accessVerify: FastifyRequest["jwtVerify"];
    refreshVerify: FastifyRequest["jwtVerify"];
    refreshDecode: FastifyRequest["jwtDecode"];
  }

  interface FastifyReply {
    accessSign: FastifyReply["jwtSign"];
    refreshSign: FastifyReply["jwtSign"];
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: string; provider: string }; // payload type is used for signing and verifying
    user: {
      id: string;
      provider: string;
    }; // user type is return type of `request.user` object
  }
}
