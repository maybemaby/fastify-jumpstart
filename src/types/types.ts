import { FastifyJWTOptions, UserType } from "@fastify/jwt";
import { DefaultMetricsCollectorConfiguration } from "prom-client";
import { PostUser } from "../schema/user";
import { CookieSerializeOptions } from "@fastify/cookie";

export interface PromPluginOptions {
  defaultMetrics?: DefaultMetricsCollectorConfiguration;
}

export interface LocalAuthPluginOptions {
  accessJwt?: FastifyJWTOptions;
  refreshJwt?: FastifyJWTOptions;
  path?: string;

  refreshCookie?: CookieSerializeOptions;

  signUp(user: PostUser): UserType | Promise<UserType>;

  login(user: PostUser): (UserType | Promise<UserType>) | null;

  logout(jti: string): void | Promise<void>;

  refresh(jti: string): boolean | Promise<boolean>;
}
