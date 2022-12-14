import { Static, Type } from "@sinclair/typebox";

export const AuthSuccessResSchema = Type.Object({
  userId: Type.String(),
  accessToken: Type.String(),
  provider: Type.String(),
});

export type AuthSuccessRes = Static<typeof AuthSuccessResSchema>;
