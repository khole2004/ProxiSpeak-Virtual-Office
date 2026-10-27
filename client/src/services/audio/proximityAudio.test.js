
import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateDistance,
  calculateProximityVolume,
  updateProximityVolume,
} from "./proximityAudio.js";

test("distance is zero for the same position", () => {
  assert.equal(
    calculateDistance({ x: 10, y: 20 }, { x: 10, y: 20 }),
    0
  );
});

test("distance uses both x and y coordinates", () => {
  assert.equal(
    calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 }),
    5
  );
});

test("volume is full within the full-volume radius", () => {
  assert.equal(calculateProximityVolume(0), 1);
  assert.equal(calculateProximityVolume(100), 1);
});

test("volume fades linearly between the two radii", () => {
  assert.equal(calculateProximityVolume(200), 0.75);
  assert.equal(calculateProximityVolume(300), 0.5);
  assert.equal(calculateProximityVolume(400), 0.25);
});

test("volume is zero at and beyond the maximum radius", () => {
  assert.equal(calculateProximityVolume(500), 0);
  assert.equal(calculateProximityVolume(600), 0);
});

test("volume never increases as distance increases", () => {
  const distances = [0, 100, 200, 300, 400, 500, 600];

  for (let i = 1; i < distances.length; i++) {
    assert.ok(
      calculateProximityVolume(distances[i]) <=
        calculateProximityVolume(distances[i - 1])
    );
  }
});

test("audio gain updates smoothly using a 50 ms time constant", () => {
  let scheduledVolume;
  let scheduledTimeConstant;

  const gainNode = {
    context: { currentTime: 10 },
    gain: {
      cancelScheduledValues(time) {
        assert.equal(time, 10);
      },
      setTargetAtTime(volume, time, timeConstant) {
        scheduledVolume = volume;
        scheduledTimeConstant = timeConstant;
        assert.equal(time, 10);
      },
    },
  };

  const result = updateProximityVolume(
    gainNode,
    { x: 0, y: 0 },
    { x: 300, y: 0 }
  );

  assert.equal(result.distance, 300);
  assert.equal(result.volume, 0.5);
  assert.equal(scheduledVolume, 0.5);
  assert.equal(scheduledTimeConstant, 0.05);
});
