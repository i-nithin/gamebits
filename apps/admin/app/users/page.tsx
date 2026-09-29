import { suspendUserAction } from "@/app/actions/mutations";
import { Forbidden, PageHeader } from "@/components/shell";
import { getCurrentUserId, hasMinRole } from "@gamebits/auth";
import { searchProfiles } from "@gamebits/core/users";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!(await hasMinRole(userId, "admin"))) return <Forbidden need="admins and owners" />;

  const { q = "" } = await searchParams;
  const profiles = await searchProfiles(q);

  return (
    <>
      <PageHeader title="Users" description="Profiles created on GameBits." />
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, handle, or email"
          className="w-full max-w-sm rounded-lg border border-white/10 bg-graphite px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg border border-white/10 px-3 py-2 text-sm">
          Search
        </button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs tracking-wide text-fog uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.clerkUserId} className="border-b border-white/5">
                <td className="px-4 py-3">
                  <p>{profile.name}</p>
                  <p className="text-xs text-fog">@{profile.handle}</p>
                </td>
                <td className="px-4 py-3 text-fog">{profile.email ?? "—"}</td>
                <td className="px-4 py-3">{profile.suspendedAt ? "Suspended" : "Active"}</td>
                <td className="px-4 py-3 text-right">
                  <form action={suspendUserAction}>
                    <input type="hidden" name="clerkUserId" value={profile.clerkUserId} />
                    <input type="hidden" name="suspended" value={profile.suspendedAt ? "false" : "true"} />
                    <button type="submit" className="text-fog hover:text-white">
                      {profile.suspendedAt ? "Restore" : "Suspend"}
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
