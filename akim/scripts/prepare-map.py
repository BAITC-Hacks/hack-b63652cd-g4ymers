"""Build the local basemap and interactive geometry from the supplied osm2cdr SVG.

Usage: python scripts/prepare-map.py path/to/astana.svg
No network access, coordinate reprojection, or hand-drawn district boundaries.
"""
import hashlib
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

SOURCE = Path(sys.argv[1])
ROOT = Path(__file__).resolve().parents[1]
SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)
tree = ET.parse(SOURCE)
root = tree.getroot()
elements = {e.get("id"): e for e in root.iter() if e.get("id")}
paths = list(elements["Границы"].iter(f"{{{SVG}}}path"))


def points(index):
    d = paths[index].get("d")
    assert not re.search(r"[ACHQSTVZachqstvyz]", d), "Unexpected boundary commands"
    return [list(map(float, xy)) for xy in re.findall(r"([\d.-]+),([\d.-]+)", d)]


def ring(indices):
    result = []
    for index in indices:
        part = points(index)
        if result:
            assert result[-1] == part[0], f"Disconnected boundary {index}"
            result.extend(part[1:])
        else:
            result = part
    assert result[0] == result[-1], "Open district boundary"
    # All district paths have this transform in the source SVG.
    return [[round(x * .999907, 3), round(y * .999907, 3)] for x, y in result]


# Source boundary order, cross-checked against named OSM district anchor points.
# Split paths join at identical endpoints; separate rings preserve exclaves.
spec = [
    ("nura", "Нұра_ауданы", [[0]], [1050, 3330]),
    ("saryarka", "Сарыарқа_ауданы", [[14]], [1190, 2350]),
    ("baikonur", "Байқоңыр_ауданы", [[10, 12], [11], [13]], [2280, 2190]),
    ("almaty", "Алматы_ауданы", [[15], [16]], [3000, 2800]),
    ("esil", "Есіл_ауданы", [[17, 18]], [2400, 4080]),
]


def inside(point, polygon):
    x, y = point
    value = False
    for (ax, ay), (bx, by) in zip(polygon, polygon[1:]):
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            value = not value
    return value


districts = []
for id, source_id, indices, label in spec:
    rings = [ring(indices_) for indices_ in indices]
    marker = elements[source_id]
    anchor = [float(marker.get("cx")), float(marker.get("cy"))]
    assert any(inside(anchor, r) for r in rings), f"Wrong district: {id}"
    assert any(inside(label, r) for r in rings), f"Label outside district: {id}"
    districts.append({"id": id, "rings": rings, "label": label,
                      "osm": marker.find(f"{{{SVG}}}desc").text})

landmark_spec = [
    ("baiterek", "Байтерек", "Бәйтерек", -12, -25),
    ("expo", "EXPO", "EXPO", 20, -16),
    ("mega", "MEGA Silk Way", "Mega_Silk_Way", -20, 22),
    ("keruen", "Керуен", "Керуен", -25, 10),
    ("plaza", "Abu Dhabi Plaza", "Abu_Dhabi_Plaza", 20, 22),
    ("khan", "Хан Шатыр", "Хан_Шатыр", -18, -20),
    ("opera", "Астана Опера", "Астана_Опера", 15, -25),
    ("akorda", "Акорда", "Ақорда_резиденциясы", 18, -10),
    ("pyramid", "Дворец мира", "Бейбітшілік_және_келісім_сарайы", 18, 18),
]
landmarks = []
for id, name, source_id, dx, dy in landmark_spec:
    marker = elements[source_id]
    position = [float(marker.get("cx")), float(marker.get("cy"))]
    matches = [d["id"] for d in districts if any(inside(position, r) for r in d["rings"])]
    assert len(matches) <= 1, f"Overlapping districts at {name}"
    landmarks.append({"id": id, "name": name, "position": position,
                      "district": matches[0] if matches else None, "offset": [dx, dy]})

# Retain cartographic geometry and road names; remove invisible object metadata,
# all administrative labels and old outlines (the app draws only the five in TZ).
remove_ids = {"Названия_объектов", "Границы", "Подписи_Границы", "Подписи_Населённые_пункты"}
allowed = {"svg", "g", "defs", "clipPath", "path", "rect", "circle", "text"}


def clean(element):
    for child in list(element):
        tag = child.tag.rsplit("}", 1)[-1]
        if tag not in allowed or child.get("id") in remove_ids:
            element.remove(child)
        else:
            clean(child)
            if tag in {"g", "defs"} and len(child) == 0:
                element.remove(child)
    has_text = any(e.tag == f"{{{SVG}}}text" for e in element.iter())
    for key in list(element.attrib):
        if key.startswith("{") or key.startswith("data-") or key.startswith("on") or key in {"href", "style"}:
            del element.attrib[key]
        elif key == "id" and element.get(key) != "area_mask":
            del element.attrib[key]
        elif not has_text and key.startswith("font-"):
            del element.attrib[key]
    element.tail = None
    if element.tag != f"{{{SVG}}}text":
        element.text = None
    # Merge consecutive groups with identical presentation; never reorder layers.
    previous = None
    for child in list(element):
        if previous is not None and child.tag == previous.tag == f"{{{SVG}}}g" and child.attrib == previous.attrib:
            previous.extend(list(child))
            element.remove(child)
        else:
            previous = child


clean(root)
root.set("width", "5067")
root.set("height", "7021")
output = ROOT / "public/maps"
output.mkdir(parents=True, exist_ok=True)
ET.SubElement(root, f"{{{SVG}}}metadata").text = "Derived from user-supplied astana.svg / osm2cdr; map data © OpenStreetMap contributors (ODbL)."
tree.write(output / "astana.svg", encoding="utf-8", xml_declaration=True)
data = {"sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "viewBox": [0, 0, 5067, 7021], "districts": districts, "landmarks": landmarks}
(ROOT / "lib/astana-map.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Basemap: {SOURCE.stat().st_size:,} -> {(output / 'astana.svg').stat().st_size:,} bytes")
print("Districts:", ", ".join(d["id"] for d in districts))
print("Landmarks:", [(l["id"], l["district"]) for l in landmarks])
