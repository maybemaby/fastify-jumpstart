import { FastifyJWTOptions, UserType } from "@fastify/jwt";
import { DefaultMetricsCollectorConfiguration } from "prom-client";
import { PostUser } from "../schema/user";

export interface PromPluginOptions {
  defaultMetrics?: DefaultMetricsCollectorConfiguration;
}

export interface LocalAuthPluginOptions {
  jwt?: FastifyJWTOptions;
  path?: string;
  signUp(user: PostUser): UserType | Promise<UserType>;
  login(user: PostUser): (UserType | Promise<UserType>) | null;
}
