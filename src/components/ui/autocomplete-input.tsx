import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  id,
  required,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = React.useState<string[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (value.length >= 2) {
      const filtered = suggestions.filter((s) =>
        s.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8);
      setFilteredSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setIsOpen(false);
    }
  }, [value, suggestions]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (filteredSuggestions.length > 0) setIsOpen(true);
        }}
        required={required}
        autoComplete="off"
      />
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-[200px] overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors"
              onClick={() => handleSelect(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
