import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

/**
 * DROPDOWN ORTAK BİLEŞENİ
 * Tüm modüllerde kullanılabilecek tekrar kullanılabilir dropdown bileşeni.
 *
 * Props:
 * @param {string}   label        - Dropdown üst etiketi (opsiyonel)
 * @param {string}   value        - Seçili değer
 * @param {Array}    options      - Seçenek listesi (string[] veya { value, label }[])
 * @param {Function} onChange     - Seçim değiştiğinde çağrılacak fonksiyon (value) => void
 * @param {string}   placeholder  - Henüz seçim yokken gösterilecek metin (opsiyonel)
 * @param {string}   minWidth     - Minimum genişlik (opsiyonel, ör: '150px')
 * @param {string}   className    - Dış wrapper'a eklenecek ek className (opsiyonel)
 * @param {React.ElementType} icon - Sol tarafa konacak ikon bileşeni (opsiyonel)
 * @param {string}   variant      - 'default' | 'minimal' — stil varyantı (opsiyonel)
 * @param {boolean}  disabled     - Devre dışı bırakma (opsiyonel)
 */
const Dropdown = ({
    label,
    value,
    options = [],
    onChange,
    placeholder = 'Select...',
    minWidth = '120px',
    className = '',
    icon: Icon,
    variant = 'default',
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    const menuRef = useRef(null);

    // Normalize options: her zaman { value, label } formatına çevir
    const normalizedOptions = options.map((opt) =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    // Seçili öğenin label'ını bul
    const selectedLabel =
        normalizedOptions.find((opt) => opt.value === value)?.label || placeholder;

    // Menü pozisyonunu hesapla
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    }, [isOpen]);

    // Dışarı tıklanınca kapat (Escape tuşu, click outside, scroll detection)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };

        const handleClickOutside = (e) => {
            // Eğer tıklama hem button hem de menu'nun dışındaysa kapat
            const clickedOutsideButton = dropdownRef.current && !dropdownRef.current.contains(e.target);
            const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(e.target);
            
            if (clickedOutsideButton && clickedOutsideMenu) {
                setIsOpen(false);
            }
        };

        const handleScroll = (e) => {
            // Eğer scroll dropdown menüsünün içindeyse kapatma
            if (menuRef.current && menuRef.current.contains(e.target)) {
                return;
            }
            // Sayfa scroll edildiğinde dropdown'ı kapat
            setIsOpen(false);
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true); // capture phase'de dinle (tüm scroll olaylarını yakala)

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const toggleOpen = () => {
        if (!disabled) setIsOpen((prev) => !prev);
    };

    // ── Stil varyantları ──
    const buttonStyles = {
        default:
            'flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-lg hover:border-neutral-400 transition-colors',
        minimal:
            'flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors',
    };

    const activeItemStyles = {
        default: 'bg-primary-50 text-primary-600 font-medium',
        minimal: 'bg-blue-50 text-blue-600 font-medium',
    };

    const menuItemBase =
        'w-full text-left px-4 py-2 hover:bg-neutral-100 transition-colors text-sm';

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Label */}
            {label && (
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    {label}
                </label>
            )}

            {/* Trigger Button */}
            <button
                ref={buttonRef}
                type="button"
                onClick={toggleOpen}
                disabled={disabled}
                className={`w-full justify-between ${buttonStyles[variant] || buttonStyles.default} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                style={{ minWidth }}
            >
                {Icon && <Icon size={18} className="text-neutral-500 shrink-0" />}
                <span className="flex-1 text-left truncate">{selectedLabel}</span>
                <ChevronDown
                    size={18}
                    className={`text-neutral-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                        }`}
                />
            </button>

            {/* Dropdown Menu - Rendered in Portal */}
            {isOpen && createPortal(
                <div 
                    ref={menuRef}
                    className="fixed bg-white rounded-lg shadow-lg border border-neutral-200 z-50 py-1 max-h-60 overflow-y-auto"
                    style={{
                        top: `${menuPosition.top + 4}px`,
                        left: `${menuPosition.left}px`,
                        width: `${menuPosition.width}px`,
                    }}
                >
                        {normalizedOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                className={`${menuItemBase} ${value === opt.value
                                    ? activeItemStyles[variant] || activeItemStyles.default
                                    : ''
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}

                    {normalizedOptions.length === 0 && (
                        <div className="px-4 py-3 text-sm text-neutral-400 text-center">
                            No options available
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default Dropdown;
