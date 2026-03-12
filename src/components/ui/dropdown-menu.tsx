"use client";

import React, { type ReactNode, type Ref, useState, useEffect, useRef, useCallback } from "react";

interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: "default" | "destructive";
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownMenuItem[];
  align?: "left" | "right";
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

function DropdownMenu({ trigger, items, align = "left", className = "", ref }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocusedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(true);
          setFocusedIndex(0);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % items.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + items.length) % items.length);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            items[focusedIndex].onClick();
            setOpen(false);
            setFocusedIndex(-1);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [open, focusedIndex, items],
  );

  // Focus the active item when focusedIndex changes
  useEffect(() => {
    if (focusedIndex >= 0 && itemsRef.current[focusedIndex]) {
      itemsRef.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  return (
    <div ref={containerRef} className={["relative inline-block", className].filter(Boolean).join(" ")} onKeyDown={handleKeyDown}>
      <div ref={ref}>
        <button
          type="button"
          onClick={() => {
            setOpen((prev) => !prev);
            setFocusedIndex(-1);
          }}
          aria-haspopup="true"
          aria-expanded={open}
          className="cursor-pointer"
        >
          {trigger}
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className={[
            "absolute z-50 mt-2 min-w-[180px]",
            "rounded-lg border border-border bg-card shadow-lg",
            "py-1",
            align === "right" ? "right-0" : "left-0",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {items.map((item, index) => (
            <button
              key={index}
              ref={(el) => { itemsRef.current[index] = el; }}
              role="menuitem"
              type="button"
              tabIndex={focusedIndex === index ? 0 : -1}
              onClick={() => {
                item.onClick();
                setOpen(false);
                setFocusedIndex(-1);
              }}
              className={[
                "flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-body",
                "outline-none transition-colors duration-150 cursor-pointer",
                focusedIndex === index ? "bg-muted/50" : "",
                "hover:bg-muted/50",
                item.variant === "destructive"
                  ? "text-destructive"
                  : "text-foreground",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {item.icon && <span className="h-4 w-4 shrink-0">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

DropdownMenu.displayName = "DropdownMenu";

export { DropdownMenu, type DropdownMenuProps, type DropdownMenuItem };
