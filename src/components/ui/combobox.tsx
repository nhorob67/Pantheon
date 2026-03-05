"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";

export interface ComboboxOption {
  label: string;
  value: string;
  description?: string;
}

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: ComboboxOption) => void;
  fetchSuggestions: (query: string) => Promise<ComboboxOption[]>;
  placeholder?: string;
  debounceMs?: number;
  minChars?: number;
  className?: string;
  onFallback?: () => void;
}

export function Combobox({
  value,
  onChange,
  onSelect,
  fetchSuggestions,
  placeholder,
  debounceMs = 300,
  minChars = 2,
  className,
}: ComboboxProps) {
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchRef = useRef(fetchSuggestions);
  useEffect(() => {
    fetchRef.current = fetchSuggestions;
  }, [fetchSuggestions]);

  const doFetch = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (query.length < minChars) {
        setOptions([]);
        setOpen(false);
        return;
      }

      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        const results = await fetchRef.current(query);
        setOptions(results);
        setOpen(results.length > 0);
        setActiveIndex(-1);
        setLoading(false);
      }, debounceMs);
    },
    [debounceMs, minChars]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    doFetch(v);
  };

  const selectOption = (option: ComboboxOption) => {
    onSelect(option);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" && options.length > 0) {
        setOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i < options.length - 1 ? i + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i > 0 ? i - 1 : options.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && options[activeIndex]) {
          selectOption(options[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (options.length > 0 && value.length >= minChars) setOpen(true);
          }}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="combobox-listbox"
          aria-activedescendant={
            activeIndex >= 0 ? `combobox-option-${activeIndex}` : undefined
          }
          className={className}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[var(--text-dim)]" />
        )}
      </div>

      {open && options.length > 0 && (
        <ul
          ref={listRef}
          id="combobox-listbox"
          role="listbox"
          className="absolute z-50 top-full mt-1 w-full max-h-64 overflow-y-auto rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-lg shadow-black/30"
        >
          {options.map((option, i) => (
            <li
              key={option.value}
              id={`combobox-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(option);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                i === activeIndex
                  ? "bg-[var(--green-dim)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--green-dim)]/50"
              }`}
            >
              <span className="font-medium text-[var(--text-primary)]">
                {option.label}
              </span>
              {option.description && (
                <span className="ml-1.5 text-xs text-[var(--text-dim)]">
                  {option.description}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
