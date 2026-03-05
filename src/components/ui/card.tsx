import React, { type HTMLAttributes } from "react";

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

type CardVariant = "default" | "elevated" | "outlined" | "accent";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantClasses: Record<CardVariant, string> = {
  default: "bg-card rounded-xl border border-border shadow-sm",
  elevated: "bg-bg-elevated rounded-xl border border-border shadow-md",
  outlined: "bg-transparent rounded-xl border border-border-light",
  accent: "bg-card rounded-xl border border-border shadow-sm border-l-4 border-l-accent",
};

function Card({ variant = "default", className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  CardHeader                                                                */
/* -------------------------------------------------------------------------- */

type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

function CardHeader({ className = "", children, ...rest }: CardHeaderProps) {
  return (
    <div
      className={`px-6 py-4 border-b border-border ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  CardTitle                                                                 */
/* -------------------------------------------------------------------------- */

type CardTitleProps = HTMLAttributes<HTMLHeadingElement>;

function CardTitle({ className = "", children, ...rest }: CardTitleProps) {
  return (
    <h3
      className={`font-headline text-lg font-semibold text-foreground ${className}`}
      {...rest}
    >
      {children}
    </h3>
  );
}

/* -------------------------------------------------------------------------- */
/*  CardContent                                                               */
/* -------------------------------------------------------------------------- */

type CardContentProps = HTMLAttributes<HTMLDivElement>;

function CardContent({ className = "", children, ...rest }: CardContentProps) {
  return (
    <div className={`p-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  type CardProps,
  type CardVariant,
  type CardHeaderProps,
  type CardTitleProps,
  type CardContentProps,
};
