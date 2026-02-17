import React, { type HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

function Skeleton({ className = "", ...rest }: SkeletonProps) {
  return (
    <div
      className={`bg-muted animate-pulse rounded-lg ${className}`}
      {...rest}
    />
  );
}

export { Skeleton, type SkeletonProps };
