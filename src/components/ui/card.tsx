import React, { type HTMLAttributes } from "react";

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

type CardProps = HTMLAttributes<HTMLDivElement>;

function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`bg-card rounded-xl border border-border shadow-sm ${className}`}
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
  type CardHeaderProps,
  type CardTitleProps,
  type CardContentProps,
};
