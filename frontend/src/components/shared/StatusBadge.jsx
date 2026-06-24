import React from 'react';
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Clock,
    Loader2,
    Info,
    HelpCircle
} from 'lucide-react';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STATUS BADGE - Ortak Durum Gösterge Bileşeni
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Kullanım Örnekleri:
 *   <StatusBadge status="success" />
 *   <StatusBadge status="warning" label="Pending" />
 *   <StatusBadge status="critical" size="lg" showIcon={false} />
 * 
 * Props:
 * @param {string} status - 'success' | 'warning' | 'critical' | 'info' | 'inactive' | 'running'
 * @param {string} label - Özel metin (varsayılan: status adı)
 * @param {string} size - 'sm' | 'md' | 'lg' (varsayılan: 'md')
 * @param {boolean} showIcon - İkon gösterilsin mi? (varsayılan: true)
 * @param {boolean} pulse - Animasyonlu mı? (varsayılan: running durumunda true)
 * @param {string} className - Ek CSS sınıfları
 */

// Status konfigürasyonları - MATISSE renk paletine uyumlu
const STATUS_CONFIG = {
    success: {
        label: 'Success',
        icon: CheckCircle2,
        colors: 'bg-success-50 text-success-700 border-success-200',
        iconColor: 'text-success-500'
    },
    warning: {
        label: 'Warning',
        icon: AlertTriangle,
        colors: 'bg-warning-50 text-warning-700 border-warning-200',
        iconColor: 'text-warning-500'
    },
    critical: {
        label: 'Critical',
        icon: XCircle,
        colors: 'bg-error-50 text-error-700 border-error-200',
        iconColor: 'text-error-500'
    },
    error: {
        label: 'Error',
        icon: XCircle,
        colors: 'bg-error-50 text-error-700 border-error-200',
        iconColor: 'text-error-500'
    },
    fail: {
        label: 'Fail',
        icon: XCircle,
        colors: 'bg-error-50 text-error-700 border-error-200',
        iconColor: 'text-error-500'
    },
    info: {
        label: 'Info',
        icon: Info,
        colors: 'bg-primary-50 text-primary-700 border-primary-200',
        iconColor: 'text-primary-500'
    },
    inactive: {
        label: 'Inactive',
        icon: HelpCircle,
        colors: 'bg-neutral-100 text-neutral-500 border-neutral-200',
        iconColor: 'text-neutral-400'
    },
    running: {
        label: 'Running',
        icon: Loader2,
        colors: 'bg-secondary-50 text-secondary-700 border-secondary-200',
        iconColor: 'text-secondary-500'
    },
    pending: {
        label: 'Pending',
        icon: Clock,
        colors: 'bg-warning-50 text-warning-700 border-warning-200',
        iconColor: 'text-warning-500'
    }
};

// Boyut konfigürasyonları
const SIZE_CONFIG = {
    sm: {
        padding: 'px-1.5 py-0.5',
        text: 'text-[10px]',
        icon: 10,
        gap: 'gap-1'
    },
    md: {
        padding: 'px-2 py-1',
        text: 'text-xs',
        icon: 12,
        gap: 'gap-1.5'
    },
    lg: {
        padding: 'px-3 py-1.5',
        text: 'text-sm',
        icon: 14,
        gap: 'gap-2'
    }
};

const StatusBadge = ({
    status = 'inactive',
    label,
    size = 'md',
    showIcon = true,
    pulse,
    className = ''
}) => {
    // Konfigürasyonları al
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
    const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
    const Icon = config.icon;

    // Varsayılan label
    const displayLabel = label || config.label;

    // Running durumunda otomatik pulse
    const shouldPulse = pulse !== undefined ? pulse : status === 'running';

    return (
        <span
            className={`
                inline-flex items-center ${sizeConfig.gap}
                ${sizeConfig.padding}
                ${sizeConfig.text}
                font-semibold
                rounded-full
                border
                ${config.colors}
                ${className}
            `}
        >
            {showIcon && (
                <Icon
                    size={sizeConfig.icon}
                    className={`
                        ${config.iconColor}
                        ${shouldPulse ? 'animate-spin' : ''}
                    `}
                />
            )}
            {displayLabel}
        </span>
    );
};

// Dışarıdan erişim için config'leri export et
export { STATUS_CONFIG, SIZE_CONFIG };
export default StatusBadge;
