import { Static, Type } from "@sinclair/typebox";

export const PostUserSchema = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 8 }),
});

export type PostUser = Static<typeof PostUserSchema>;
