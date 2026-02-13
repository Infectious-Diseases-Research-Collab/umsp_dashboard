'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  maxItems?: number;
}

export function MultiSelect({ options, selected, onChange, placeholder = 'Select...', maxItems }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else if (!maxItems || selected.length < maxItems) {
      onChange([...selected, value]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="h-auto min-h-[40px] w-full justify-between py-1.5 text-left font-normal"
      >
        <div className="flex flex-1 flex-wrap gap-1">
          {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
          {selected.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 rounded-full text-xs">
              {s}
              <X className="h-3 w-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggle(s); }} />
            </Badge>
          ))}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-auto rounded-xl border border-border/70 bg-popover/95 p-1 shadow-lg backdrop-blur-sm max-h-60">
          {options.map((option) => (
            <div
              key={option}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-secondary',
                selected.includes(option) && 'bg-secondary'
              )}
              onClick={() => toggle(option)}
            >
              <Check className={cn('h-4 w-4', selected.includes(option) ? 'opacity-100' : 'opacity-0')} />
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
