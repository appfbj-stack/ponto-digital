/**
 * Cálculos geográficos.
 * Tudo em metros, usando a fórmula de Haversine.
 */
const EARTH_RADIUS_METERS = 6_371_000;
/**
 * Converte graus para radianos.
 */
function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}
/**
 * Calcula a distância em metros entre dois pontos (Haversine).
 * Precisão boa o suficiente para geocerca de raio < 1km.
 */
export function distanceInMeters(point1, point2) {
    const lat1 = toRadians(point1.latitude);
    const lat2 = toRadians(point2.latitude);
    const deltaLat = toRadians(point2.latitude - point1.latitude);
    const deltaLng = toRadians(point2.longitude - point1.longitude);
    const a = Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
}
/**
 * Verifica se um ponto está dentro do raio permitido de uma localização.
 */
export function isWithinRadius(current, center, radiusMeters) {
    return distanceInMeters(current, center) <= radiusMeters;
}
/**
 * Calcula a precisão do GPS em metros é considerada aceitável.
 * Ex: accuracy > 100m geralmente é ruim (GPS indoor, baixa cobertura).
 */
export function isAccuracyAcceptable(accuracyMeters, maxAccuracy = 100) {
    return accuracyMeters > 0 && accuracyMeters <= maxAccuracy;
}
/**
 * Valida coordenadas básicas.
 */
export function isValidLatLng(lat, lng) {
    return (typeof lat === 'number' &&
        typeof lng === 'number' &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180);
}
