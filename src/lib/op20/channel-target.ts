import { markChannelTarget } from "@/lib/campaigns.functions";
import { appliedFrom } from "@/lib/op20/sustain";
import type { ChannelState, Character } from "@/lib/op20/types";
import { useCharacters } from "@/store/characters";

/** Land a friendly-targeted channel on that character, here or at the table. */
export function deliverChannel(source: Character, channel: ChannelState) {
  const effect = appliedFrom(source, channel);
  if (!effect || !channel.aim) return;
  const local = useCharacters.getState().characters.find((c) => c.id === channel.aim?.targetId);
  if (local) {
    useCharacters.getState().update(local.id, (cur) => ({
      ...cur,
      applied: [...(cur.applied ?? []).filter((a) => a.id !== effect.id), effect],
    }));
    return;
  }
  void markChannelTarget({
    data: { targetId: channel.aim.targetId, effect, effectId: effect.id },
  }).catch(() => {});
}

/** Take that mark off when the channel stops. */
export function retractChannel(sourceId: string, channel: ChannelState) {
  const aim = channel.aim;
  if (!aim || aim.kind !== "character") return;
  const effectId = `${sourceId}:${channel.treeId}:${channel.pickTier}`;
  const local = useCharacters.getState().characters.find((c) => c.id === aim.targetId);
  if (local) {
    useCharacters.getState().update(local.id, (cur) => ({
      ...cur,
      applied: (cur.applied ?? []).filter((a) => a.id !== effectId),
    }));
    return;
  }
  void markChannelTarget({ data: { targetId: aim.targetId, effect: null, effectId } }).catch(() => {});
}
