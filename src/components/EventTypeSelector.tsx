import { useState, useEffect } from 'react';
import { Check, Plus, X } from 'lucide-react';

const STORAGE_KEY = 'satya_saved_event_types';

const INITIAL_TYPES = ['Bridal Makeup', 'Mehendi', 'Hairstyle', 'Saree Draping'];

interface EventTypeSelectorProps {
  selectedTypes: string[];
  onChange: (types: string[]) => void;
  label?: string;
  required?: boolean;
  helperText?: string;
}

export function EventTypeSelector({
  selectedTypes,
  onChange,
  label = 'Event Type(s) (Select Multiple)',
  required = false,
  helperText
}: EventTypeSelectorProps) {
  const [customInput, setCustomInput] = useState('');
  const [savedTypes, setSavedTypes] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_TYPES;
  });

  // Ensure any selectedTypes from existing bookings are also in savedTypes
  useEffect(() => {
    const missing = selectedTypes.filter(t => t && !savedTypes.includes(t));
    if (missing.length > 0) {
      const updated = [...savedTypes, ...missing];
      setSavedTypes(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  }, [selectedTypes, savedTypes]);

  const toggleType = (type: string) => {
    const trimmed = type.trim();
    if (!trimmed) return;
    if (selectedTypes.includes(trimmed)) {
      onChange(selectedTypes.filter(t => t !== trimmed));
    } else {
      onChange([...selectedTypes, trimmed]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    let updatedList = savedTypes;
    if (!savedTypes.includes(trimmed)) {
      updatedList = [...savedTypes, trimmed];
      setSavedTypes(updatedList);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      } catch {
        // ignore
      }
    }

    if (!selectedTypes.includes(trimmed)) {
      onChange([...selectedTypes, trimmed]);
    }

    setCustomInput('');
  };

  const handleRemoveFromSaved = (typeToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedTypes.filter(t => t !== typeToRemove);
    setSavedTypes(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    if (selectedTypes.includes(typeToRemove)) {
      onChange(selectedTypes.filter(t => t !== typeToRemove));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustom();
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {selectedTypes.length > 0 && (
          <span className="text-xs font-bold text-rosegold-600 bg-rosegold-50 px-2.5 py-0.5 rounded-full">
            {selectedTypes.length} selected
          </span>
        )}
      </div>

      {helperText && (
        <p className="text-[11px] text-gray-500">{helperText}</p>
      )}

      {/* Input to add custom type that gets saved for next time */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type event/service (e.g. Mehendi)..."
          className="flex-1 px-3.5 py-2.5 sm:py-2 border border-gray-200 rounded-xl text-base sm:text-xs outline-none focus:ring-2 focus:ring-rosegold-500 focus:border-rosegold-500 bg-white"
        />
        <button
          type="button"
          onClick={handleAddCustom}
          className="px-4 py-2.5 sm:py-2 bg-rosegold-500 hover:bg-rosegold-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1 shrink-0 cursor-pointer active:scale-95"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Chips: Saved types that user can select/deselect multiple */}
      <div className="flex flex-wrap gap-2 pt-0.5">
        {savedTypes.map((type) => {
          const isSelected = selectedTypes.includes(type);
          return (
            <div
              key={type}
              onClick={() => toggleType(type)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border select-none ${
                isSelected
                  ? 'bg-rosegold-500 text-white border-rosegold-600 shadow-xs scale-102'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-rosegold-300 hover:bg-rosegold-50/40'
              }`}
            >
              {isSelected && <Check size={13} className="stroke-[3]" />}
              <span>{type}</span>
              <button
                type="button"
                onClick={(e) => handleRemoveFromSaved(type, e)}
                title="Remove from saved types"
                className={`ml-1 p-0.5 rounded-full transition-opacity ${
                  isSelected 
                    ? 'text-white/80 hover:text-white hover:bg-black/20' 
                    : 'text-gray-300 hover:text-red-500 hover:bg-gray-100'
                }`}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {required && selectedTypes.length === 0 && (
        <p className="text-[11px] text-amber-600 font-medium">
          Please select or add at least one event type
        </p>
      )}
    </div>
  );
}
