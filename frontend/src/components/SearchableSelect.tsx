import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  sublabel?: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function SearchableSelect({ options, value, onChange, placeholder = 'Selecione...', className = '', disabled = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (opt.sublabel && opt.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full border border-slate-300 rounded px-2.5 py-1.5 text-sm flex items-center justify-between transition-colors ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-60' : 'bg-white cursor-pointer hover:border-slate-400'}`}
      >
        <span className={`truncate mr-2 ${selectedOption ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-80 animate-in fade-in zoom-in-95 duration-200 origin-top">
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-sm p-1 placeholder:text-slate-400"
              placeholder="Digite para filtrar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <X className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" onClick={() => setSearchTerm('')} />
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition-colors flex flex-col gap-0.5 ${value === opt.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.sublabel && (
                    <span className={`text-[10px] uppercase font-bold tracking-tight ${value === opt.id ? 'text-blue-500/70' : 'text-slate-400'}`}>
                      {opt.sublabel}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-slate-400 text-center italic">
                Nenhum resultado encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
