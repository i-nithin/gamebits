import { assignWeekAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getIsoWeekUtc } from "@/lib/iso-week";

export function AssignWeekForm({ gameId }: { gameId: string }) {
  const current = getIsoWeekUtc();
  return (
    <form action={assignWeekAction} className="max-w-md">
      <input type="hidden" name="gameId" value={gameId} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="year">ISO year</FieldLabel>
          <Input id="year" name="year" type="number" required defaultValue={current.year} />
        </Field>
        <Field>
          <FieldLabel htmlFor="week">ISO week</FieldLabel>
          <Input id="week" name="week" type="number" required defaultValue={current.week} />
        </Field>
        <Field orientation="horizontal">
          <input id="featured" name="featured" type="checkbox" className="size-4 rounded border-iron" />
          <FieldLabel htmlFor="featured">Featured in carousel</FieldLabel>
        </Field>
        <Button type="submit">Assign to week</Button>
      </FieldGroup>
    </form>
  );
}
