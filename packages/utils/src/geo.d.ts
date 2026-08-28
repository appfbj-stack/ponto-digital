/**
 * Cálculos geográficos.
 * Tudo em metros, usando a fórmula de Haversine.
 */
export interface LatLng {
    latitude: number;
    longitude: number;
}
/**
 * Calcula a distância em metros entre dois pontos (Haversine).
 * Precisão boa o suficiente para geocerca de raio < 1km.
 */
export declare function distanceInMeters(point1: LatLng, point2: LatLng): number;
/**
 * Verifica se um ponto está dentro do raio permitido de uma localização.
 */
export declare function isWithinRadius(current: LatLng, center: LatLng, radiusMeters: number): boolean;
/**
 * Calcula a precisão do GPS em metros é considerada aceitável.
 * Ex: accuracy > 100m geralmente é ruim (GPS indoor, baixa cobertura).
 */
export declare function isAccuracyAcceptable(accuracyMeters: number, maxAccuracy?: number): boolean;
/**
 * Valida coordenadas básicas.
 */
export declare function isValidLatLng(lat: number, lng: number): boolean;
//# sourceMappingURL=geo.d.ts.map