"use client";

import { useActionState } from "react";

import type { saveStaffAction } from "@/app/actions/mutations";
import { STAFF_ROLES } from "@gamebits/auth/roles";

export function StaffForm({ action }: { action: typeof saveStaffAction }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-fog">Handle</span>
        <input
          name="handle"
          required
          placeholder="player"
          className="rounded-lg border border-white/10 bg-graphite px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-fog">Role</span>
        <select name="role" defaultValue="editor" className="rounded-lg border border-white/10 bg-graphite px-3 py-2">
          {STAFF_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-paper px-3 py-2 text-sm font-medium text-void"
      >
        {pending ? "Adding…" : "Add staff"}
      </button>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
    </form>
  );
}
