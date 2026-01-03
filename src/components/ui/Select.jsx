import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export function Select({
    label,
    value,
    onChange,
    options = [],
    placeholder = 'Select...',
    error,
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (ref.current && !ref.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={`form-group ${className}`} ref={ref}>
            {label && <label className="form-label">{label}</label>}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`input flex items-center justify-between ${error ? 'border-red-500' : ''}`}
                >
                    <span className={selectedOption ? 'text-white' : 'text-zinc-500'}>
                        {selectedOption?.label || placeholder}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-dark-secondary border border-dark-border rounded-lg shadow-xl overflow-hidden animate-fade-in">
                        <div className="max-h-60 overflow-y-auto">
                            {options.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-dark-tertiary transition-colors
                    ${option.value === value ? 'bg-accent-primary/10 text-accent-primary' : 'text-white'}
                  `}
                                >
                                    <span>{option.label}</span>
                                    {option.value === value && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="form-error">{error}</p>}
        </div>
    );
}
