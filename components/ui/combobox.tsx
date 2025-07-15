"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import Fuse from "fuse.js";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface ComboboxOption {
  value: string;
  label: string;
  logoUrl?: string; // Add logoUrl for each option
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onQueryChange?: (query: string) => void;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  onQueryChange,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [filteredOptions, setFilteredOptions] = React.useState(options);

  // Setup Fuse for fuzzy search
  const fuse = React.useMemo(
    () =>
      new Fuse(options, {
        keys: ["label", "value"],
        threshold: 0.4, // Adjust for strictness
        ignoreLocation: true,
      }),
    [options]
  );

  React.useEffect(() => {
    if (search) {
      const results = fuse.search(search).map((result) => result.item);
      setFilteredOptions(results);
    } else {
      setFilteredOptions(options);
    }
    if (onQueryChange) onQueryChange(search);
  }, [search, options, fuse, onQueryChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder || "Select an exchange"}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[200px] p-0 max-h-72 overflow-y-auto">
        <Command>
          <CommandInput
            placeholder="Search..."
            className="h-9"
            value={search}
            onValueChange={(e) => setSearch(e)}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option, i) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value === value ? "" : option.value);
                    setOpen(false);
                  }}
                >
                  {option.logoUrl && (
                    <img
                      src={option.logoUrl}
                      alt={option.label + " logo"}
                      className="w-5 h-5 mr-2 inline-block align-middle rounded-full bg-white object-contain border"
                    />
                  )}
                  <Badge
                    className={cn(
                      "px-1.5",
                      value === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {option.label}
                  </Badge>
                  <Check
                    className={cn(
                      "ml-auto",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
