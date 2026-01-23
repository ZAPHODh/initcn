import { createMiddleware } from "next-safe-action";
import { getCurrentSession } from "./session";

export const authMiddleware = createMiddleware().define(
  async ({ next }) => {
    const { session, user } = await getCurrentSession();

    if (!session || !user) {
      throw new Error("Unauthorized");
    }

    return next({
      ctx: {
        userId: user.id,
        sessionId: session.id,
        user,
      },
    });
  },
);
