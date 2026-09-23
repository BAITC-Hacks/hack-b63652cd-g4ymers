import geometry from "./astana-map.json" with { type: "json" };

export type MapPoint = { x: number; y: number };
export type ReportPlace = MapPoint & { districtId: string; latitude: number; longitude: number };
export const districtNames: Record<string, string> = { esil: "Есиль", almaty: "Алматы", saryarka: "Сарыарка", baikonur: "Байконур", nura: "Нура" };
export const districtColors: Record<string, string> = { esil: "#5A82EC", almaty: "#5A82EC", saryarka: "#4F56B0", baikonur: "#78E2EA", nura: "#78E2EA" };
export const mapDistricts = geometry.districts.map(d => ({ ...d, name: districtNames[d.id], path: d.rings.map(r => `M${r.map(p => p.join(",")).join("L")}Z`).join(" ") }));
export const mapLandmarks = geometry.landmarks;

// The supplied SVG's osm2cdr-map-frame metadata specifies EPSG:3857 extents
// and its map rectangle in mm. Its source scale is 5.90496 SVG units per mm.
const frame = { left: 29.5248, top: 29.5248, width: 848.08444 * 5.90496, height: 1179 * 5.90496 };
const mercator = { west: 7927948.545349, south: 6596144.701122, east: 7991090.942014, north: 6683637.616858 };
const radius = 6378137;
export function mapToCoordinates(point: MapPoint) {
  const x = mercator.west + (point.x - frame.left) / frame.width * (mercator.east - mercator.west);
  const y = mercator.north - (point.y - frame.top) / frame.height * (mercator.north - mercator.south);
  return { latitude: Math.atan(Math.sinh(y / radius)) * 180 / Math.PI, longitude: x / radius * 180 / Math.PI };
}
export function coordinatesToMap(latitude: number, longitude: number): MapPoint {
  const x = longitude * Math.PI / 180 * radius;
  const y = Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360)) * radius;
  return { x: frame.left + (x - mercator.west) / (mercator.east - mercator.west) * frame.width,
    y: frame.top + (mercator.north - y) / (mercator.north - mercator.south) * frame.height };
}
function inside(point: MapPoint, ring: number[][]) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i], [bx, by] = ring[j];
    if ((ay > point.y) !== (by > point.y) && point.x < (bx - ax) * (point.y - ay) / (by - ay) + ax) hit = !hit;
  }
  return hit;
}
export function placeAtPoint(point: MapPoint): ReportPlace | undefined {
  const district = mapDistricts.find(d => d.rings.some(ring => inside(point, ring)));
  return district ? { ...point, districtId: district.id, ...mapToCoordinates(point) } : undefined;
}
