import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

// Schema used to coerce env variables
const EnvSchema = Type.Object({
  JWT_SECRET: Type.String(),
  REFRESH_SECRET: Type.String(),
  NODE_ENV: Type.String(),
  PORT: Type.Integer({ default: 5000 }),
  COOKIE_SECRET: Type.String(),
  HOST: Type.Optional(Type.String()),
});

export const env = Value.Cast(EnvSchema, process.env);
