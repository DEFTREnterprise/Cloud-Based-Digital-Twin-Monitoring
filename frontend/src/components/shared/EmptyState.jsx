import React from 'react';
import { Search, Info } from 'lucide-react';

/**
 * EmptyState Bileşeni
 * Veri olmadığında veya seçim yapılmadığında gösterilecek standart boş durum bileşeni.
 * 
 * @param {string} title - Başlık
 * @param {string} description - Açıklama metni
 * @param {React.ComponentType} icon - Gösterilecek ikon (Varsayılan: Search)
 * @param {React.ReactNode} action - Opsiyonel aksiyon butonu/linki
 * @param {string} className - Ek stiller
 */
const EmptyState = ({
    title = 'No Data Available',
    description,
    icon: Icon = Search,
    action,
    className = ''
}) => {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center h-full min-h-[200px] ${className}`}>
            <div className="bg-neutral-50 p-4 rounded-full mb-4 ring-1 ring-neutral-100">
                <Icon size={32} className="text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-1">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-neutral-500 max-w-sm mx-auto mb-6">
                    {description}
                </p>
            )}
            {action && (
                <div>
                    {action}
                </div>
            )}
        </div>
    );
};

export default EmptyState;
