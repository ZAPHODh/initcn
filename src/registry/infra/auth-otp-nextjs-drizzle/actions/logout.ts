"use server";

import { authActionClient } from "@/lib/server/auth/client/safe-action";
import { deleteSessionTokenCookie } from "@/lib/server/auth/server/cookies";
import { invalidateSession } from "@/lib/server/auth/server/session";
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
