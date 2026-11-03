'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GeocodeResult } from '@/app/api/geocode/route';

interface LocationSearchProps {
  onSelect: (location: GeocodeResult) => void;
  initialValue?: string;
}

export function LocationSearch({ onSelect, initialValue = '' }: LocationSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<GeocodeResult | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setSelectedLocation(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSuggestions(json.data);
          setIsOpen(true);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  function handleSelectSuggestion(item: GeocodeResult) {
    setSelectedLocation(item);
    setQuery(item.formatted);
    setIsOpen(false);
    onSelect(item);
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search city, state, locality or address in India..."
          className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
        />
        {loading && (
          <div className="absolute right-3 top-3 text-stone-400">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
          </div>
        )}
      </div>

      {/* Selected Coordinates Badge */}
      {selectedLocation && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200">
          <span className="font-semibold">Selected Location:</span>
          <span>
            {selectedLocation.formatted} ({selectedLocation.lat.toFixed(4)}°N,{' '}
            {selectedLocation.lng.toFixed(4)}°E)
          </span>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-stone-200 max-h-60 overflow-y-auto">
          {suggestions.length > 0 ? (
            suggestions.map((item, idx) => (
              <button
                key={`${item.placeId}-${idx}`}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left px-3.5 py-2.5 text-xs border-b border-stone-100 last:border-0 hover:bg-emerald-50/60 focus:bg-emerald-50 focus:outline-none transition-colors"
              >
                <div className="font-semibold text-stone-900">{item.name}</div>
                <div className="text-stone-500 mt-0.5">{item.formatted}</div>
                <div className="text-[10px] text-stone-400 mt-0.5 font-mono">
                  {item.lat.toFixed(4)}°N, {item.lng.toFixed(4)}°E
                </div>
              </button>
            ))
          ) : (
            <div className="px-3.5 py-3 text-xs text-stone-500 text-center">
              No matching locations found in India
            </div>
          )}
        </div>
      )}
    </div>
  );
}

