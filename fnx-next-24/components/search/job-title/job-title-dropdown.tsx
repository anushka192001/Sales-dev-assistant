'use client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import React from 'react'; // Added React import

interface Option {
  label: string;
  value: string;
  group?: string;
}

interface MultiSelectDropdownProps {
  placeholder?: string;
  options?: Option[];
  selected?: string[];
  setSelected?: (values: string[]) => void;
  searchOnly?: boolean;
  searchValue?: string;
  setSearchValue?: (value: string) => void;
}

export function MultiSelectDropdown({
  placeholder = 'Select...',
  options = [],
  selected = [],
  setSelected = () => { },
  searchOnly = false,
  searchValue = '',
  setSearchValue = () => { },
}: MultiSelectDropdownProps) {
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  const grouped = options.reduce((acc, option) => {
    const group = option.group || 'Other';
    acc[group] = [...(acc[group] || []), option];
    return acc;
  }, {} as Record<string, Option[]>);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'w-full border px-3 py-2 rounded-md text-left text-sm bg-white hover:border-gray-400 flex justify-between items-center',
            searchOnly
              ? (searchValue ? 'text-black' : 'text-gray-500')
              : (selected.length ? 'text-black' : 'text-gray-500')
          )}
        >
          <span className="truncate">
            {searchOnly ? searchValue || placeholder : (selected.length > 0 ? `${selected.length} selected` : placeholder)}
          </span>
          {!searchOnly && <ChevronDown className="h-4 w-4 text-gray-500" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] max-h-[250px] overflow-y-auto p-2 rounded-md border shadow-md bg-white">
        {searchOnly ? (
          <Input
            type="text"
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full"
            autoFocus
          />
        ) : (
          Object.entries(grouped).map(([groupName, groupOptions]) => (
            <div key={groupName}>
              {groupName !== 'Other' && ( // Only show group name if it's not 'Other'
                <p className="text-xs text-gray-500 font-medium px-1 py-1">{groupName}</p>
              )}
              {groupOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className="flex items-center w-full px-2 py-1.5 text-sm text-left hover:bg-gray-100 rounded-md"
                >
                  <div
                    className={cn(
                      'h-4 w-4 mr-2 rounded-sm border border-gray-300 flex items-center justify-center',
                      selected.includes(option.value) ? 'bg-blue-500 text-white' : 'bg-white'
                    )}
                  >
                    {selected.includes(option.value) && <Check className="w-3 h-3" />}
                  </div>
                  {option.label}
                </button>
              ))}
            </div>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}