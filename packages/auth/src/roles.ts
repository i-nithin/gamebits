export const STAFF_ROLES = ["owner", "admin", "editor"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

const RANK: Record<StaffRole, number> = { editor: 1, admin: 2, owner: 3 };

export function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(value);
}

export function roleAtLeast(role: StaffRole, min: StaffRole) {
  return RANK[role] >= RANK[min];
}
