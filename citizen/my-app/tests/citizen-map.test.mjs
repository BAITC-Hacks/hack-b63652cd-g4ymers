import test from "node:test";
import assert from "node:assert/strict";
import { coordinatesToMap, mapToCoordinates, mapDistricts, placeAtPoint } from "../lib/citizen-map.ts";

test("SVG frame places Bayterek at its geographic location", () => {
  const position = mapToCoordinates({ x: 1905.514, y: 3182.14 });
  assert.ok(Math.abs(position.latitude - 51.128287) < .00001);
  assert.ok(Math.abs(position.longitude - 71.430456) < .00001);
  assert.equal(placeAtPoint({ x: 1905.514, y: 3182.14 })?.districtId, "esil");
});

test("map coordinates round trip without moving report pins", () => {
  for (const point of [{ x: 0, y: 0 }, { x: 5067, y: 7021 }, { x: 1905.514, y: 3182.14 }, { x: 1825.932, y: 3683.01 }]) {
    const coordinates = mapToCoordinates(point);
    const result = coordinatesToMap(coordinates.latitude, coordinates.longitude);
    assert.ok(Math.abs(result.x - point.x) < .000001);
    assert.ok(Math.abs(result.y - point.y) < .000001);
  }
});

test("district selection uses supplied polygons including separate areas", () => {
  for (const district of mapDistricts) {
    assert.equal(placeAtPoint({ x: district.label[0], y: district.label[1] })?.districtId, district.id);
  }
  assert.equal(placeAtPoint({ x: 900, y: 1100 })?.districtId, "baikonur");
  assert.equal(placeAtPoint({ x: 0, y: 0 }), undefined);
  assert.equal(placeAtPoint({ x: 2196.882, y: 3255.031 }), undefined, "The Palace of Peace is outside the five project districts");
});
