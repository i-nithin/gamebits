import { auth } from "@clerk/nextjs/server";

import { clerkEnabled } from "@/lib/clerk-enabled";

export async function getCurrentUserId() {
  if (!clerkEnabled) return null;
  const { userId } = await auth();
  return userId;
}

export function isAdminUserId(userId: string | null | undefined) {
  const adminId = process.env.ADMIN_USER_ID;
  return Boolean(adminId && userId && userId === adminId);
}

export async function requireAdmin() {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) {
    throw new Error("Unauthorized");
  }
  return userId as string;
}
