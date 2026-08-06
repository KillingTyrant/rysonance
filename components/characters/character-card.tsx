import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CHOICE_FIELDS,
  categoryByKey,
  disciplineByKey,
  optionByKey,
  parseDisciplinePoints,
  raceByKey,
  spentSlots,
  stirpeByKey,
  supportedTraits,
  talentsFor,
  viaByKey,
} from "@/lib/onboarding/rules";
import type { TraitColumn } from "@/lib/onboarding/rules";
import type { Catalog, Character } from "@/lib/onboarding/types";

const DATE_FORMAT = new Intl.DateTimeFormat("it-IT", { dateStyle: "long" });

/** Scheda di un personaggio salvato: le chiavi vengono risolte sul catalogo. */
export function CharacterCard({
  character,
  catalog,
}: {
  character: Character;
  catalog: Catalog;
}) {
  const race = raceByKey(catalog, character.race_key);
  const stirpe = stirpeByKey(catalog, character.stirpe_key);
  const via = viaByKey(catalog, character.via_key);
  const gender = optionByKey(catalog, "gender", character.gender_key);
  const talents = talentsFor(catalog, {
    raceKey: character.race_key,
    stirpeKey: character.stirpe_key,
    viaKey: character.via_key,
  });
  const points = parseDisciplinePoints(character.discipline_points);
  const allocations = Object.entries(points);

  const lineage = [race?.name, stirpe?.name, gender?.name].filter(Boolean).join(" · ");

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl">{character.name ?? "Senza nome"}</CardTitle>
          {character.status === "draft" && <Badge variant="secondary">Bozza</Badge>}
        </div>
        <CardDescription>{lineage || "Origini non definite"}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-medium">{via?.name ?? "Via non scelta"}</span>
          <span className="text-muted-foreground">Livello {character.level}</span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
          <span>
            HP <Stat value={character.hp} />
          </span>
          <span>
            Mana <Stat value={character.mana} />
          </span>
          <span>
            Velocità <Stat value={character.speed} />
          </span>
        </div>

        <Block title="Scelte">
          <ul className="flex flex-col gap-0.5 text-muted-foreground">
            {CHOICE_FIELDS.filter(({ category }) => category !== "gender").map(
              ({ category, field }) => (
                <li key={category} className="flex justify-between gap-3">
                  <span>{categoryByKey(catalog, category)?.title ?? category}</span>
                  <span className="text-foreground">
                    {optionByKey(catalog, category, character[field])?.name ?? "—"}
                  </span>
                </li>
              ),
            )}
          </ul>
        </Block>

        <Block title="Carattere">
          <ul className="flex flex-col gap-0.5 text-muted-foreground">
            {supportedTraits(catalog).map((trait) => (
              <li key={trait.key} className="flex justify-between gap-3">
                <span>
                  {trait.left_label} · {trait.right_label}
                </span>
                <span className="tabular-nums text-foreground">
                  {character[trait.key as TraitColumn] ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </Block>

        <Block title={`Discipline (${spentSlots(points)} slot)`}>
          {allocations.length === 0 ? (
            <p className="text-muted-foreground">Nessuno slot assegnato.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {allocations.map(([key, value]) => (
                <Badge key={key} variant="outline">
                  {disciplineByKey(catalog, key)?.name ?? key} ×{value}
                </Badge>
              ))}
            </div>
          )}
        </Block>

        {talents.length > 0 && (
          <Block title="Talenti">
            <div className="flex flex-wrap gap-1">
              {talents.map((talent) => (
                <Badge key={talent.key} variant="secondary">
                  {talent.name}
                </Badge>
              ))}
            </div>
          </Block>
        )}

        <p className="mt-auto pt-2 text-xs text-muted-foreground">
          Creato il {DATE_FORMAT.format(new Date(character.created_at))}
        </p>
      </CardContent>
    </Card>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t pt-3">
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ value }: { value: number | null }) {
  return <span className="font-medium text-foreground">{value ?? "—"}</span>;
}
