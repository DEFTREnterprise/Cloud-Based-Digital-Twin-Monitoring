import React from 'react';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Clock,
    Info,
    Activity
} from 'lucide-react';

/**
 * Ortak KPI Kart Bileşeni - MATISSE Tasarım Sistemi v2
 * 
 * Özellikler:
 * - Beyaz arka plan, sol kenar çizgisi ile durum gösterimi
 * - Otomatik ikon seçimi (override edilebilir)
 * - Minimalist ve şık tasarım
 * 
 * @param {string} title - Kart başlığı
 * @param {string|number} value - Ana değer
 * @param {string} unit - Birim (opsiyonel)
 * @param {React.ComponentType} icon - Lucide icon bileşeni (opsiyonel, otomatik seçilir)
 * @param {string} status - 'normal' | 'warning' | 'critical' | 'success' | 'inactive'
 * @param {string} trend - 'up' | 'down' | 'stable' (opsiyonel)
 * @param {string} trendValue - Trend değeri metni (opsiyonel)
 * @param {string} subtitle - Alt bilgi metni (opsiyonel)
 * @param {string} className - Ek CSS sınıfları (opsiyonel)
 */

// Status bazlı varsayılan ikon mapping
const STATUS_ICONS = {
    success: CheckCircle2,
    warning: AlertTriangle,
    critical: XCircle,
    inactive: Clock,
    normal: Activity
};

// Status bazlı renk mapping
const STATUS_COLORS = {
    success: {
        border: 'border-l-success-500',
        icon: 'text-success-500',
        iconBg: 'bg-success-50',
    },
    warning: {
        border: 'border-l-warning-500',
        icon: 'text-warning-500',
        iconBg: 'bg-warning-50',
    },
    critical: {
        border: 'border-l-error-500',
        icon: 'text-error-500',
        iconBg: 'bg-error-50',
    },
    inactive: {
        border: 'border-l-neutral-300',
        icon: 'text-neutral-400',
        iconBg: 'bg-neutral-100',
    },
    normal: {
        border: 'border-l-primary-500',
        icon: 'text-primary-500',
        iconBg: 'bg-primary-50',
    }
};

const KPICard = ({
    title,
    value,
    unit,
    icon: CustomIcon,
    status = 'normal',
    trend,
    trendValue,
    subtitle,
    className = ''
}) => {
    // Status bazlı renk ve ikon bilgilerini al
    const colorScheme = STATUS_COLORS[status] || STATUS_COLORS.normal;

    // Eğer custom icon verilmişse onu kullan, yoksa status'e göre otomatik seç
    const Icon = CustomIcon || STATUS_ICONS[status] || STATUS_ICONS.normal;

    // Kart stilleri - beyaz arka plan, sol kenar çizgisi ile durum
    const cardStyles = `
        bg-white 
        rounded-xl 
        p-5 
        border 
        border-neutral-200
        border-l-4
        ${colorScheme.border}
        transition-all 
        duration-300 
        hover:shadow-soft-md
        hover:border-neutral-300
    `;

    // Trend ikonu
    const renderTrendIcon = () => {
        if (!trend) return null;

        const iconProps = { size: 14, strokeWidth: 2.5 };

        switch (trend) {
            case 'up':
                return <TrendingUp {...iconProps} />;
            case 'down':
                return <TrendingDown {...iconProps} />;
            default:
                return <Minus {...iconProps} />;
        }
    };

    // Trend rengi - semantik anlamlı
    const getTrendColor = () => {
        // Warning ve critical durumlarında trend yukarı kötü, aşağı iyi
        if (status === 'warning' || status === 'critical') {
            return trend === 'up' ? 'text-error-500' : 'text-success-500';
        }
        // Diğer durumlarda yukarı iyi, aşağı kötü
        if (trend === 'up') return 'text-success-500';
        if (trend === 'down') return 'text-error-500';
        return 'text-neutral-400';
    };

    return (
        <div className={`${cardStyles} ${className}`}>
            {/* Header: Başlık ve İkon */}
            <div className="flex items-start justify-between mb-3">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide leading-tight max-w-[75%]">
                    {title}
                </h3>
                <div className={`p-2 rounded-lg ${colorScheme.iconBg}`}>
                    <Icon size={18} strokeWidth={2} className={colorScheme.icon} />
                </div>
            </div>

            {/* Ana Değer */}
            <div className="text-3xl font-bold text-neutral-800 mb-1">
                {value}
                {unit && (
                    <span className="text-sm font-medium text-neutral-400 ml-1.5">
                        {unit}
                    </span>
                )}
            </div>

            {/* Footer: Alt bilgi ve Trend */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
                {subtitle ? (
                    <span className="text-xs text-neutral-500">
                        {subtitle}
                    </span>
                ) : (
                    <span></span>
                )}
                {trend && trendValue && (
                    <div className={`flex items-center gap-1 text-xs font-semibold ${getTrendColor()}`}>
                        {renderTrendIcon()}
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Dışarıdan erişim için status renk ve ikon bilgilerini export et
export { STATUS_ICONS, STATUS_COLORS };
export default KPICard;
