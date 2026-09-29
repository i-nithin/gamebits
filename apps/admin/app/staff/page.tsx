import { changeStaffRoleAction, removeStaffAction, saveStaffAction } from "@/app/actions/mutations";
import { StaffForm } from "@/components/staff-form";
import { Forbidden, PageHeader } from "@/components/shell";
import { STAFF_ROLES, getCurrentUserId, hasMinRole, listStaff } from "@gamebits/auth";

export default async function StaffPage() {
  const userId = await getCurrentUserId();
  if (!(await hasMinRole(userId, "owner"))) return <Forbidden need="owners" />;
  const members = await listStaff();

  return (
    <>
      <PageHeader title="Staff" description="Owners manage who can operate GameBits." />
      <StaffForm action={saveStaffAction} />
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs tracking-wide text-fog uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.clerkUserId} className="border-b border-white/5">
                <td className="px-4 py-3">
                  <p>{member.name ?? "No profile"}</p>
                  <p className="text-xs text-fog">{member.handle ? `@${member.handle}` : member.clerkUserId}</p>
                </td>
                <td className="px-4 py-3">
                  <form action={changeStaffRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="clerkUserId" value={member.clerkUserId} />
                    <select
                      name="role"
                      defaultValue={member.role}
                      className="rounded-lg border border-white/10 bg-graphite px-2 py-1"
                    >
                      {STAFF_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="text-ice">
                      Save
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={removeStaffAction}>
                    <input type="hidden" name="clerkUserId" value={member.clerkUserId} />
                    <button type="submit" className="text-fog hover:text-white">
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
