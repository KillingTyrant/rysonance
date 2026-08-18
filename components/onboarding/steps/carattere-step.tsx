import { StepSection } from "../step-section";
import { TendenzaSlider } from "../tendenza-slider";
import type { StepProps } from "../wizard-steps";

/**
 * L'alterego: com'è fatto dentro il personaggio, non cosa sa fare. Allineamento,
 * moralità e i quattro assi di carattere.
 *
 * Sono tutti assi fra due poli, non elenchi di opzioni, quindi un solo controllo
 * li disegna tutti e l'elenco lo decide il catalogo. Un separatore marca il
 * cambio di `type` senza intestazioni: i nomi dei tipi sono dati di gioco, non
 * etichette da mostrare.
 */
export function CarattereStep({ catalog, draft, onChange }: StepProps) {
  return (
    <StepSection
      title="Carattere e allineamento"
      description="Nessuna di queste scelte è sbagliata: descrivono il personaggio, non lo rendono più forte. L'allineamento è una linea guida per le prime sessioni, e cambierà giocando."
    >
      <ul className="flex flex-col gap-6">
        {catalog.tendenze.map((tendenza, index) => (
          <li
            key={tendenza.key}
            className={
              index > 0 && tendenza.type !== catalog.tendenze[index - 1].type
                ? "border-t pt-6"
                : undefined
            }
          >
            <TendenzaSlider
              tendenza={tendenza}
              value={draft.tendenze[tendenza.key] ?? tendenza.default_value}
              onChange={(value) =>
                onChange({ tendenze: { ...draft.tendenze, [tendenza.key]: value } })
              }
            />
          </li>
        ))}
      </ul>
    </StepSection>
  );
}
