import { cn } from "@/lib/utils";

/** A named mode inside an ability, written `::Cushion:: the rest of the mode`. */
const MODE = /^::([^:\n]+)::\s*([\s\S]*)$/;

/** Lead line, then each named mode on its own line, the way the Notion pages do. */
export function AbilityProse({ text, className }: { text: string; className?: string }) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (blocks.length === 0) return null;
  return (
    <div className={cn("space-y-2", className)}>
      {blocks.map((block, i) => {
        const mode = block.match(MODE);
        if (!mode) {
          return (
            <p key={i} className="text-muted">
              {block}
            </p>
          );
        }
        const body = mode[2].trim();
        return (
          <p key={i} className="pl-4">
            <span className="font-medium text-ink">{mode[1].trim()}</span>
            {body ? <span className="text-muted"> — {body}</span> : null}
          </p>
        );
      })}
    </div>
  );
}
