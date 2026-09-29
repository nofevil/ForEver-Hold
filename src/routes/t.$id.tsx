import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StoryWorkspace } from "@/components/story-workspace";
import { Button } from "@/components/ui/button";
import { HoldMark } from "@/components/mark";
import { listMyCampaigns, listSeats, loadHold, type CampaignCard, type SeatView } from "@/lib/campaigns.functions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useCharacters, useTable } from "@/store/characters";
import { SignInAsk, useAccountPhase } from "@/components/sign-in-ask";

export const Route = createFileRoute("/t/$id")({
  component: TablePage,
});

function TablePage() {
  const { id } = Route.useParams();
  const hydrated = useCharacters((s) => s.hydrated);
  const table = useTable(id);
  const { user, isPending } = useCurrentUserState();
  const phase = useAccountPhase();
  const [card, setCard] = useState<CampaignCard | null | undefined>(undefined);
  const [pulled, setPulled] = useState(false);

  useEffect(() => {
    if (!user) {
      setCard(null);
      return;
    }
    void listMyCampaigns()
      .then((rows) => setCard(rows.find((r) => r.id === id) ?? null))
      .catch(() => setCard(null));
  }, [id, user]);

  useEffect(() => {
    if (table || !user || card?.role !== "owner" || pulled) return;
    void loadHold()
      .then((remote) => {
        if (remote) useCharacters.getState().importCampaign(remote);
      })
      .finally(() => setPulled(true));
  }, [table, user, card, pulled]);

  if (!hydrated || isPending || phase === "loading") return <div className="min-h-dvh bg-parchment" />;
  if (phase === "out") return <SignInAsk page title="Sign in to open this table" from="story" />;
  if (table) return <StoryWorkspace table={table} />;
  if (card === undefined) return <div className="min-h-dvh bg-parchment" />;
  if (card?.role === "owner" && !pulled) return <div className="min-h-dvh bg-parchment" />;
  if (card?.role === "player") return <SeatedTable card={card} />;
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-start justify-center gap-4 px-6">
      <HoldMark className="h-16 w-auto" decorative={false} />
      <h1 className="font-display text-3xl">Table not found</h1>
      <Button asChild>
        <Link to="/" search={{ desk: "story" }}>
          Back to Story Master
        </Link>
      </Button>
    </div>
  );
}

function SeatedTable({ card }: { card: CampaignCard }) {
  const { user } = useCurrentUserState();
  const [seats, setSeats] = useState<SeatView[]>([]);
  useEffect(() => {
    void listSeats({ data: { campaignId: card.id } })
      .then(setSeats)
      .catch(() => {});
  }, [card.id]);
  const mine = seats.find((s) => s.userId === user?.id);
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6">
      <HoldMark className="h-16 w-auto" decorative={false} />
      <p className="text-xs tracking-[0.16em] text-burgundy uppercase">Seated</p>
      <h1 className="font-display text-4xl">{card.name}</h1>
      <p className="text-muted">
        {mine
          ? `${mine.name} is seated${mine.profession ? ` · ${mine.profession}` : ""}. Life ${mine.health}/${mine.healthMax} · DP ${mine.dp}/${mine.dpMax}.`
          : "You are at this table."}
        {card.epoch ? ` Epoch ${card.epoch}.` : ""}
      </p>
      {seats.length > 0 ? (
        <ul className="space-y-2">
          {seats.map((seat) => (
            <li key={seat.userId} className="text-sm text-muted">
              {seat.name}
              {seat.userId === user?.id ? " · you" : ""}
              {seat.profession ? ` · ${seat.profession}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {mine ? (
          <Button asChild>
            <Link to="/c/$id" params={{ id: mine.characterId }} search={{ tab: "stats", step: "identity" }}>
              Open sheet
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link to="/" search={{ desk: "story" }}>
            Back to tables
          </Link>
        </Button>
      </div>
    </div>
  );
}
