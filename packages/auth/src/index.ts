import { auth } from "@clerk/nextjs/server";
import { count, eq } from "drizzle-orm";

import { getDb, hasDatabase } from "@gamebits/db";
import { profiles, staff } from "@gamebits/db/schema";

import { clerkEnabled } from "./clerk";
import { roleAtLeast, type StaffRole } from "./roles";

export { clerkEnabled } from "./clerk";
export { isStaffRole, roleAtLeast, STAFF_ROLES, type StaffRole } from "./roles";

let bootstrapped = false;

export async function ensureBootstrapOwner() {
  if (bootstrapped || !hasDatabase()) return;
  const adminId = process.env.ADMIN_USER_ID?.trim();
  const db = getDb();
  const [row] = await db.select({ total: count() }).from(staff);
  if (Number(row?.total ?? 0) === 0 && adminId) {
    await db.insert(staff).values({ clerkUserId: adminId, role: "owner" }).onConflictDoNothing();
  }
  bootstrapped = true;
}

export async function getCurrentUserId() {
  if (!clerkEnabled) return null;
  const { userId } = await auth();
  return userId;
}

export async function getStaffRole(userId: string | null | undefined): Promise<StaffRole | null> {
  if (!userId || !hasDatabase()) return null;
  await ensureBootstrapOwner();
  const db = getDb();
  const [row] = await db
    .select({ role: staff.role })
    .from(staff)
    .where(eq(staff.clerkUserId, userId))
    .limit(1);
  return row?.role ?? null;
}

export async function isStaffUser(userId: string | null | undefined) {
  return (await getStaffRole(userId)) !== null;
}

/** Any staff member. Public-site superuser checks use this. */
export async function isAdminUserId(userId: string | null | undefined) {
  return isStaffUser(userId);
}

export async function hasMinRole(userId: string | null | undefined, min: StaffRole) {
  const role = await getStaffRole(userId);
  if (!role) return false;
  return roleAtLeast(role, min);
}

export async function requireStaff(min: StaffRole = "editor") {
  const userId = await getCurrentUserId();
  const role = userId ? await getStaffRole(userId) : null;
  if (!userId || !role || !roleAtLeast(role, min)) {
    throw new Error("Unauthorized");
  }
  return { userId, role };
}

export async function requireAdmin() {
  const { userId } = await requireStaff("editor");
  return userId;
}

export async function requireSignedIn() {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function canManageGame(
  userId: string | null | undefined,
  ownerClerkUserId: string | null | undefined,
) {
  if (!userId) return false;
  if (await isStaffUser(userId)) return true;
  return Boolean(ownerClerkUserId && ownerClerkUserId === userId);
}

async function assertOwner(actorId: string) {
  const role = await getStaffRole(actorId);
  if (role !== "owner") throw new Error("Unauthorized");
}

async function ownerCount() {
  const db = getDb();
  const [row] = await db
    .select({ total: count() })
    .from(staff)
    .where(eq(staff.role, "owner"));
  return Number(row?.total ?? 0);
}

export async function listStaff() {
  if (!hasDatabase()) return [];
  await ensureBootstrapOwner();
  const db = getDb();
  return db
    .select({
      clerkUserId: staff.clerkUserId,
      role: staff.role,
      createdAt: staff.createdAt,
      handle: profiles.handle,
      name: profiles.name,
      email: profiles.email,
    })
    .from(staff)
    .leftJoin(profiles, eq(profiles.clerkUserId, staff.clerkUserId))
    .orderBy(staff.createdAt);
}

export async function addStaffMember(actorId: string, targetId: string, role: StaffRole) {
  await assertOwner(actorId);
  if (!hasDatabase()) throw new Error("Database is not configured");
  const db = getDb();
  const [profile] = await db
    .select({ clerkUserId: profiles.clerkUserId })
    .from(profiles)
    .where(eq(profiles.clerkUserId, targetId))
    .limit(1);
  if (!profile) throw new Error("That person does not have a GameBits profile yet");
  const [current] = await db
    .select({ role: staff.role })
    .from(staff)
    .where(eq(staff.clerkUserId, targetId))
    .limit(1);
  if (current?.role === "owner" && role !== "owner" && (await ownerCount()) <= 1) {
    throw new Error("Cannot demote the last owner");
  }
  await db
    .insert(staff)
    .values({ clerkUserId: targetId, role })
    .onConflictDoUpdate({
      target: staff.clerkUserId,
      set: { role, updatedAt: new Date() },
    });
}

export async function updateStaffRole(actorId: string, targetId: string, role: StaffRole) {
  await assertOwner(actorId);
  const db = getDb();
  const [current] = await db
    .select({ role: staff.role })
    .from(staff)
    .where(eq(staff.clerkUserId, targetId))
    .limit(1);
  if (!current) throw new Error("Staff member not found");
  if (current.role === "owner" && role !== "owner" && (await ownerCount()) <= 1) {
    throw new Error("Cannot demote the last owner");
  }
  await db
    .update(staff)
    .set({ role, updatedAt: new Date() })
    .where(eq(staff.clerkUserId, targetId));
}

export async function removeStaffMember(actorId: string, targetId: string) {
  await assertOwner(actorId);
  const db = getDb();
  const [current] = await db
    .select({ role: staff.role })
    .from(staff)
    .where(eq(staff.clerkUserId, targetId))
    .limit(1);
  if (!current) throw new Error("Staff member not found");
  if (current.role === "owner" && (await ownerCount()) <= 1) {
    throw new Error("Cannot remove the last owner");
  }
  await db.delete(staff).where(eq(staff.clerkUserId, targetId));
}
