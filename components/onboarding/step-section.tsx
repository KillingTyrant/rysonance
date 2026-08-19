import type { ReactNode } from "react";

type StepSectionProps = {
  title?: string;
  description?: string;
  /** Nota che spiega da cosa dipende questa sezione (es. la razza scelta). */
  hint?: ReactNode;
  children: ReactNode;
};

export function StepSection({ title, description, hint, children }: StepSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        {title && <h3 className="font-semibold">{title}</h3>}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
