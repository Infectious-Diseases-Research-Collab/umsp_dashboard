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
        className="w-full justify-between text-left font-normal h-auto min-h-[36px] py-1"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
          {selected.map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">
              {s}
              <X
                className="w-3 h-3 ml-1 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); toggle(s); }}
              />
            </Badge>
          ))}
        </div>
        <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50" />
      </Button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
          {options.map((option) => (
            <div
              key={option}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent',
                selected.includes(option) && 'bg-accent'
              )}
              onClick={() => toggle(option)}
            >
              <Check className={cn('w-4 h-4', selected.includes(option) ? 'opacity-100' : 'opacity-0')} />
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
