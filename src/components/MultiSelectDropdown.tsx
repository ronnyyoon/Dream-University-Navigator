import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Search, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MultiSelectDropdownProps {
  label: string;
  selected: string[];
  options: string[];
  onChange: (newSelected: string[]) => void;
  placeholder?: string;
}

export function MultiSelectDropdown({
  label,
  selected,
  options,
  onChange,
  placeholder = "검색어 입력..."
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search query
  const queryTrimmed = searchQuery.trim().toLowerCase();
  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(queryTrimmed)
  );
  const filteredOptionsWithoutAll = options.filter(opt => 
    opt !== '전체' && opt.toLowerCase().includes(queryTrimmed)
  );

  // Specific selected items excluding '전체'
  const specificSelected = selected.filter(item => item !== '전체');

  // Close dropdown when clicking outside and auto-select matching items if user typed a search word without manually clicking individual items
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isOpen) {
          if (queryTrimmed && filteredOptionsWithoutAll.length > 0) {
            // If user typed a search word and didn't manually pick an item from the filtered list, auto-select all matching items
            const hasManualSelection = filteredOptionsWithoutAll.some(m => selected.includes(m));
            if (!hasManualSelection || selected.includes('전체') || selected.length === 0) {
              onChange(filteredOptionsWithoutAll);
            }
          }
          setIsOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, queryTrimmed, filteredOptionsWithoutAll, selected, onChange]);

  const handleToggleOption = (opt: string) => {
    if (opt === '전체') {
      onChange(['전체']);
      return;
    }

    let newSelected: string[];
    if (selected.includes(opt)) {
      newSelected = selected.filter(item => item !== opt);
      if (newSelected.length === 0) {
        newSelected = ['전체'];
      }
    } else {
      const withoutAll = selected.filter(item => item !== '전체');
      newSelected = [...withoutAll, opt];
    }
    onChange(newSelected);
  };

  const handleRemoveChip = (opt: string) => {
    const newSelected = selected.filter(item => item !== opt);
    if (newSelected.length === 0) {
      onChange(['전체']);
    } else {
      onChange(newSelected);
    }
  };

  // Determine display chips
  const visibleChips = isExpanded ? specificSelected : specificSelected.slice(0, 3);
  const hiddenCount = specificSelected.length - 3;

  return (
    <div className={`flex flex-col gap-1.5 relative ${isOpen ? 'z-50' : 'z-10'}`} ref={containerRef}>
      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest pl-1">
        {label}
      </label>

      {/* Control Box */}
      <div 
        onClick={() => {
          setIsOpen(prev => !prev);
          if (!isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`w-full bg-white/5 border ${isOpen ? 'border-primary' : 'border-white/10'} rounded-lg px-3 py-2 text-xs font-bold text-white flex items-center justify-between cursor-pointer hover:border-white/20 transition-all min-h-[38px]`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
          <Search size={14} className="text-text-dim shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (queryTrimmed && filteredOptionsWithoutAll.length > 0) {
                  onChange(filteredOptionsWithoutAll);
                  setIsOpen(false);
                }
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isOpen) setIsOpen(true);
            }}
            placeholder={
              specificSelected.length > 0 
                ? `${specificSelected.length}개 선택됨 (${placeholder})`
                : `${label} 검색/선택 (전체)`
            }
            className="w-full bg-transparent text-xs font-bold text-white placeholder:text-text-dim/60 outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
              }}
              className="text-text-dim hover:text-white p-0.5"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <ChevronDown 
          size={14} 
          className={`text-text-dim transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-primary' : ''}`} 
        />
      </div>

      {/* Dropdown Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 bg-zinc-950/95 backdrop-blur-md border border-white/15 rounded-xl shadow-2xl p-1.5 z-50 max-h-56 overflow-y-auto custom-scrollbar"
          >
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-text-dim">
                검색 결과가 없습니다.
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {queryTrimmed && filteredOptionsWithoutAll.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(filteredOptionsWithoutAll);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-black bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 transition-all flex items-center justify-between mb-1 cursor-pointer"
                  >
                    <span className="truncate">"{searchQuery.trim()}" 포함 {label} 전체 선택</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary text-white font-black shrink-0">
                      {filteredOptionsWithoutAll.length}개
                    </span>
                  </button>
                )}
                {filteredOptions.map((opt, idx) => {
                  const isAllOpt = opt === '전체';
                  const isSelected = isAllOpt 
                    ? (selected.length === 0 || selected.includes('전체'))
                    : selected.includes(opt);

                  return (
                    <button
                      key={`${opt}-${idx}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleOption(opt);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-primary/15 text-primary' 
                          : 'text-white/80 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{opt}</span>
                      {isSelected && <Check size={14} className="text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Items Badges / Chips list below dropdown */}
      {specificSelected.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {visibleChips.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30 max-w-full"
            >
              <span className="truncate max-w-[120px]">{item}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveChip(item);
                }}
                className="p-0.5 hover:bg-primary/20 rounded text-primary/70 hover:text-primary transition-colors cursor-pointer"
                title={`${item} 삭제`}
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {/* Expand / Collapse Button if > 3 items */}
          {specificSelected.length > 3 && (
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className="inline-flex items-center gap-1 text-[11px] font-black text-primary hover:text-primary/80 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md transition-all cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <span>접기</span>
                  <ChevronUp size={12} />
                </>
              ) : (
                <>
                  <span>+{hiddenCount}개 더보기</span>
                  <ChevronDown size={12} />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
