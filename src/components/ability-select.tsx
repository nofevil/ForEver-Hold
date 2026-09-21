import { NativeSelect } from "@/components/ui/input";
import type { AbilityDef } from "@/lib/op20/catalogs";

export function AbilitySelect({
  list,
  value,
  onChange,
  placeholder = "Choose ability",
}: {
  list: AbilityDef[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const chosen = list.find((a) => a.id === value);
  return (
    <div className="space-y-1.5">
      <NativeSelect value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {list.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </NativeSelect>
      {chosen ? <p className="text-sm leading-snug text-muted">{chosen.text}</p> : null}
    </div>
  );
}
