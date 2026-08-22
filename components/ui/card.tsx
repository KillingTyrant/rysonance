import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Le misure delle card di scelta, dal design: 351×195 chiusa, 351×576 aperta.
 *
 * Del CSS di Figma resta solo la scatola. `position: absolute` con `left: 18px`
 * e `top: 229px` sono le coordinate dell'artboard da 390px, non un layout: la
 * card sta nel flusso normale e i 18px di gutter li mette il contenitore. Anche
 * la larghezza diventa un tetto invece di una misura fissa (351 = 390 − 18×2,
 * cioè la larghezza piena sul telefono di riferimento), così su schermi più
 * stretti la card si restringe invece di traboccare.
 *
 * Le altezze restano fisse come nel design: sono ciò che dà alla griglia il suo
 * ritmo, e la card aperta è alta perché ci sta dentro la scelta della tribù.
 */
const cardVariants = cva(
  "rounded-xl border bg-card text-card-foreground shadow",
  {
    variants: {
      size: {
        /** Altezza dal contenuto: la Card di sempre, invariata. */
        default: "",
        /** Card di scelta chiusa: illustrazione e nome. */
        compact: "h-[195px] w-full",
        /** Card di scelta aperta: contiene anche la scelta della sottorazza. */
        expanded: "h-[576px] w-full",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>
>(({ className, size, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ size, className }))} {...props} />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};
