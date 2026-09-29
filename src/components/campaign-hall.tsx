import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { listMyCampaigns, saveHold, sitDown, upsertCampaign, type CampaignCard } from "@/lib/campaigns.functions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { makeJoinCode } from "@/lib/join-code";
import { useCharacters } from "@/store/characters";

export function CampaignHall() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const characters = useCharacters((s) => s.characters);
  const createTable = useCharacters((s) => s.createTable);
  const updateTable = useCharacters((s) => s.updateTable);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [characterId, setCharacterId] = useState("");
  const [tables, setTables] = useState<CampaignCard[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    if (!user) return;
    void listMyCampaigns()
      .then(setTables)
      .catch(() => setTables([]));
  };

  useEffect(() => {
    refresh();
  }, [user?.id]);

  if (isPending) return <div className="ornament-frame h-40 rounded-[28px]" />;

  if (!user) {
    return (
      <div className="ornament-frame rounded-[28px] p-8">
        <h2 className="font-display text-2xl">Sign in to open a table</h2>
        <p className="mt-2 max-w-lg text-muted">
          An account keeps your characters. The Story Master shares a join code, and each player sits one of their own characters.
        </p>
        <Button asChild className="mt-4">
          <Link to="/login" search={{ from: "story" }}>
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  const openTable = async () => {
    setBusy(true);
    setError("");
    try {
      const table = createTable();
      const joinCode = makeJoinCode();
      const tableName = name.trim() || "New table";
      updateTable(table.id, { name: tableName, joinCode });
      await saveHold({ data: useCharacters.getState().exportPayload() });
      await upsertCampaign({
        data: { id: table.id, name: tableName, joinCode, epoch: "", notes: "" },
      });
      navigate({ to: "/t/$id", params: { id: table.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the table.");
      setBusy(false);
    }
  };

  const sit = async () => {
    setBusy(true);
    setError("");
    try {
      await saveHold({ data: useCharacters.getState().exportPayload() });
      const result = await sitDown({ data: { code, characterId } });
      navigate({ to: "/t/$id", params: { id: result.campaignId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sit down.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs tracking-[0.16em] text-burgundy uppercase">The hall</p>
        <h2 className="font-display text-3xl">Tables</h2>
        <p className="mt-2 max-w-2xl text-muted">
          Open a table and share the join code. Players sign in, enter the code, and sit a character from their account. You can sit your own character the same way.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ornament-frame rounded-[28px] p-5">
          <h3 className="font-display text-xl text-burgundy">Start a table</h3>
          <p className="mt-1 text-sm text-muted">You are the Story Master. The join code appears on the table.</p>
          <label className="mt-4 block text-xs tracking-wide text-muted uppercase">
            Table name
            <Input className="mt-1" value={name} placeholder="The Lost Mine" onChange={(e) => setName(e.target.value)} />
          </label>
          <Button className="mt-4 w-full" disabled={busy} onClick={() => void openTable()}>
            Open the table
          </Button>
        </section>
        <section className="ornament-frame rounded-[28px] p-5">
          <h3 className="font-display text-xl text-burgundy">Join with a code</h3>
          <p className="mt-1 text-sm text-muted">Seat one of your characters. The Story Master can sit their own this way too.</p>
          <label className="mt-4 block text-xs tracking-wide text-muted uppercase">
            Join code
            <Input
              className="mt-1 uppercase"
              value={code}
              placeholder="ABC123"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>
          <label className="mt-3 block text-xs tracking-wide text-muted uppercase">
            Character
            <NativeSelect className="mt-1" value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
              <option value="">Choose…</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || "Unnamed"}
                  {c.role === "npc" ? " (SM)" : ""}
                </option>
              ))}
            </NativeSelect>
          </label>
          {characters.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Create a character in Company, or an SM character on a table.</p>
          ) : null}
          <Button className="mt-4 w-full" disabled={busy || !code.trim() || !characterId} onClick={() => void sit()}>
            Sit down
          </Button>
        </section>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <section>
        <h3 className="font-display text-2xl">Your tables</h3>
        {tables.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No tables yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {tables.map((t) => (
              <li key={`${t.role}-${t.id}`}>
                <Link
                  to="/t/$id"
                  params={{ id: t.id }}
                  className="ornament-frame block rounded-[28px] p-5"
                >
                  <p className="text-xs tracking-wide text-burgundy uppercase">
                    {t.role === "owner" ? "Story Master" : "Seated"}
                    {t.epoch ? ` · ${t.epoch}` : ""}
                  </p>
                  <h4 className="font-display text-2xl">{t.name}</h4>
                  <p className="mt-1 text-sm text-muted">
                    {t.role === "owner" ? `Code ${t.joinCode}` : t.seatName || "Your character"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
