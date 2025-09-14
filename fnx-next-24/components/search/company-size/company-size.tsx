'use client';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
    label: string;
    value: string;
}

interface MultiSelectDropdownProps {
    placeholder?: string;
    options?: Option[];
    selected?: string[];
    setSelected?: (values: string[]) => void;
}

export function MultiSelectDropdown({
    placeholder = 'Select Company Size',
    options = [],
    selected = [],
    setSelected = () => { },
}: MultiSelectDropdownProps) {
    const toggleOption = (value: string) => {
        if (selected.includes(value)) {
            setSelected(selected.filter((v) => v !== value));
        } else {
            setSelected([...selected, value]);
        }
    };

    const selectedLabel = selected.length > 0
        ? options.filter(option => selected.includes(option.value)).map(option => option.label).join(', ')
        : placeholder;

    return (
        <Popover>
            <PopoverTrigger asChild>
                {/* This button will mimic the input field from the image */}
                <button
                    className={cn(
                        'flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                        selected.length > 0 ? 'text-black' : 'text-gray-500'
                    )}
                >
                    <span className="truncate">
                        {selected.length > 0 ? selectedLabel : placeholder}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[250px] overflow-y-auto">
                {options.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => toggleOption(option.value)}
                        className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white"
                    >
                        <div
                            className={cn(
                                'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                                selected.includes(option.value)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-white'
                            )}
                        >
                            {selected.includes(option.value) && (
                                <Check className="h-3 w-3" />
                            )}
                        </div>
                        {option.label}
                    </button>
                ))}
            </PopoverContent>
        </Popover>
    );
}