/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RUN SELECTION BACKEND - Run Seçim Servisi
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * RunSelection bileşeni için veri filtreleme ve hazırlama servisi.
 * Vehicle listesi, run filtreleme ve durum ikonu gibi işlemleri yapar.
 * 
 * Gerçek backend hazır olduğunda, bu fonksiyonların içi API çağrılarıyla değiştirilecek.
 */


/**
 * Session listesinden benzersiz vehicle (araç/şase) listesini döndürür.
 * @param {Array} sessions - Tüm session listesi
 * @returns {string[]}
 */
export const fetchVehicles = (sessions) => {
    return [...new Set(sessions.map(s => s.vehicleId))];
};


/**
 * Run'ları vehicle, status ve tarih filtresine göre filtreler.
 * @param {Array}  sessions     - Tüm session listesi
 * @param {string} vehicleId    - Filtrelenecek vehicle
 * @param {string} statusFilter - 'ALL' | 'SUCCESS' | 'FAIL'
 * @param {string} dateFilter   - 'ALL' | '24H'
 * @returns {Array} - Filtrelenmiş run listesi
 */
export const fetchFilteredRuns = (sessions, vehicleId, statusFilter, dateFilter) => {
    let filtered = sessions.filter(s => s.vehicleId === vehicleId);

    if (statusFilter !== 'ALL') {
        filtered = filtered.filter(s => (s.status || 'success').toUpperCase() === statusFilter);
    }

    if (dateFilter === '24H') {
        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;
        filtered = filtered.filter(s => {
            const d = new Date(s.date || s.startTime);
            return (now - d) < oneDayMs;
        });
    }

    return filtered;
};


/**
 * Run durumuna göre status ikonu döndürür.
 * @param {string} status - Run durumu
 * @returns {string} - Emoji ikon
 */
export const getRunStatusIcon = (status) => {
    return status === 'success' ? '✅' : '❌';
};
