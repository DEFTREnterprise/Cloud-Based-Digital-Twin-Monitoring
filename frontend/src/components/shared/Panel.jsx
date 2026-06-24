import React from 'react';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PANEL - Ortak Konteyner Bileşeni
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Kullanım Örnekleri:
 *   <Panel>İçerik</Panel>
 *   <Panel title="Başlık">İçerik</Panel>
 *   <Panel title="Başlık" icon={Settings} headerAction={<button>Aksiyon</button>}>İçerik</Panel>
 *   <Panel variant="elevated" padding="lg">İçerik</Panel>
 * 
 * Props:
 * @param {string} title - Panel başlığı (opsiyonel)
 * @param {React.Component} icon - Başlık ikonu (opsiyonel)
 * @param {React.Node} headerAction - Başlık sağına eklenecek aksiyon butonları (opsiyonel)
 * @param {React.Node} badge - Başlık yanına badge (opsiyonel)
 * @param {string} variant - 'default' | 'elevated' | 'bordered' | 'ghost'
 * @param {string} padding - 'none' | 'sm' | 'md' | 'lg' (varsayılan: 'md')
 * @param {boolean} fullHeight - h-full uygulansın mı?
 * @param {string} className - Ek CSS sınıfları
 * @param {React.Node} children - Panel içeriği
 */

// Variant stilleri
const VARIANT_STYLES = {
    default: 'bg-white border border-neutral-200 shadow-soft',
    elevated: 'bg-white border border-neutral-200 shadow-soft-md',
    bordered: 'bg-white border-2 border-neutral-300',
    ghost: 'bg-neutral-50/50 border border-dashed border-neutral-200',
};

// Padding stilleri
const PADDING_STYLES = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
};

// Header padding stilleri
const HEADER_PADDING_STYLES = {
    none: 'px-4 py-3',
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
};

const Panel = ({
    title,
    icon: Icon,
    headerAction,
    badge,
    variant = 'default',
    padding = 'md',
    fullHeight = false,
    className = '',
    children
}) => {
    const hasHeader = title || headerAction;

    // Ana konteyner stilleri
    const containerStyles = `
        rounded-xl 
        ${VARIANT_STYLES[variant] || VARIANT_STYLES.default}
        ${fullHeight ? 'h-full flex flex-col' : ''}
        ${className}
    `;

    // Header stilleri
    const headerStyles = `
        flex items-center justify-between
        ${HEADER_PADDING_STYLES[padding]}
        bg-neutral-50/80
        border-b border-neutral-100
    `;

    // Content stilleri
    const contentStyles = `
        ${!hasHeader ? (PADDING_STYLES[padding] || PADDING_STYLES.md) : ''}
        ${fullHeight && hasHeader ? 'flex-1' : ''}
    `;

    // Body wrapper stilleri (header varsa padding buraya)
    const bodyStyles = hasHeader ? (PADDING_STYLES[padding] || PADDING_STYLES.md) : '';

    return (
        <div className={containerStyles}>
            {/* Header (opsiyonel) */}
            {hasHeader && (
                <div className={headerStyles}>
                    <div className="flex items-center gap-2">
                        {Icon && (
                            <Icon size={16} className="text-neutral-500" />
                        )}
                        {title && (
                            <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">
                                {title}
                            </h3>
                        )}
                        {badge && badge}
                    </div>
                    {headerAction && (
                        <div className="flex items-center gap-2">
                            {headerAction}
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            <div className={contentStyles}>
                {hasHeader ? (
                    <div className={bodyStyles}>
                        {children}
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

// Sub-components for advanced usage
Panel.Header = ({ children, className = '' }) => (
    <div className={`flex items-center justify-between px-4 py-3 bg-neutral-50/80 border-b border-neutral-100 ${className}`}>
        {children}
    </div>
);

Panel.Body = ({ children, className = '', padding = 'md' }) => (
    <div className={`${PADDING_STYLES[padding]} ${className}`}>
        {children}
    </div>
);

Panel.Footer = ({ children, className = '' }) => (
    <div className={`flex items-center justify-between px-4 py-3 bg-neutral-50/50 border-t border-neutral-100 ${className}`}>
        {children}
    </div>
);

// Export
export { VARIANT_STYLES, PADDING_STYLES };
export default Panel;
