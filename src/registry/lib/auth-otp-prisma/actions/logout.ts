"use server";

import { authActionClient } from "@/lib/auth-otp-prisma/client/safe-action";
import { deleteSessionTokenCookie } from "@/lib/auth-otp-prisma/server/cookies";
import { invalidateSession } from "@/lib/auth-otp-prisma/server/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const logout = authActionClient
  .metadata({ actionName: "logout" })
  .action(async ({ ctx }) => {
    await invalidateSession(ctx.sessionId);
    await deleteSessionTokenCookie();
    revalidatePath("/");
    redirect("/");
  });
