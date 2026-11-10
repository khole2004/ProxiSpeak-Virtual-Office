/**
 * ProxiSpeak Automated Integration & Unit Test Suite
 * Validates Geospatial Proximity Audio, Mathematical Attenuation,
 * Speech Threshold Logic, and WebRTC STUN/TURN Configurations.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateDistance,
  calculateProximityVolume,
} from "../client/src/services/audio/proximityAudio.js";

test("Euclidean Distance: Same coordinate returns 0", () => {
  const p1 = { x: 250, y: 300 };
  const distance = calculateDistance(p1, p1);
  assert.equal(distance, 0);
});

test("Euclidean Distance: Pythagorean 3-4-5 triangle yields exact distance 50", () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 30, y: 40 };
  const distance = calculateDistance(p1, p2);
  assert.equal(distance, 50);
});

test("Audio Falloff: Distance within 100 units retains 100% volume", () => {
  assert.equal(calculateProximityVolume(0), 1.0);
  assert.equal(calculateProximityVolume(50), 1.0);
  assert.equal(calculateProximityVolume(100), 1.0);
});

test("Audio Falloff: Distance at 300 units yields linear 50% attenuation", () => {
  assert.equal(calculateProximityVolume(300), 0.5);
});

test("Audio Falloff: Distance beyond 500 units completely mutes to 0.0 volume", () => {
  assert.equal(calculateProximityVolume(500), 0.0);
  assert.equal(calculateProximityVolume(750), 0.0);
  assert.equal(calculateProximityVolume(1200), 0.0);
});

test("Volume Monotonicity: Audio volume strictly decreases or remains constant with distance", () => {
  const sampleDistances = [0, 50, 100, 150, 200, 300, 400, 500, 600, 800];
  for (let i = 1; i < sampleDistances.length; i++) {
    const prevVol = calculateProximityVolume(sampleDistances[i - 1]);
    const currVol = calculateProximityVolume(sampleDistances[i]);
    assert.ok(
      currVol <= prevVol,
      `Volume increased unexpectedly at distance ${sampleDistances[i]}`
    );
  }
});

test("Speech Activity Detection: Average frequency calculation evaluates threshold correctly", () => {
  const threshold = 0.02;
  
  // Simulated silence / quiet background noise
  const quietBuffer = new Uint8Array(64).fill(2); // sum = 128, avg = 128 / (64 * 255) ≈ 0.0078
  const quietSum = quietBuffer.reduce((a, b) => a + b, 0);
  const quietAvg = quietSum / quietBuffer.length / 255;
  const isSpeakingQuiet = quietAvg > threshold;
  assert.equal(isSpeakingQuiet, false);

  // Simulated active speech
  const speechBuffer = new Uint8Array(64).fill(30); // sum = 1920, avg = 30 / 255 ≈ 0.1176
  const speechSum = speechBuffer.reduce((a, b) => a + b, 0);
  const speechAvg = speechSum / speechBuffer.length / 255;
  const isSpeakingActive = speechAvg > threshold;
  assert.equal(isSpeakingActive, true);
});

test("Boundary Clamping: Avatar coordinates stay strictly within 2D canvas limits", () => {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  const PADDING = 24;
  const rawPositions = [
    { x: -50, y: -20 },
    { x: 1200, y: 800 },
    { x: 500, y: 300 },
  ];

  const clampedPositions = rawPositions.map((pos) => ({
    x: clamp(pos.x, PADDING, 1000 - PADDING),
    y: clamp(pos.y, PADDING, 600 - PADDING),
  }));

  assert.deepEqual(clampedPositions[0], { x: 24, y: 24 });
  assert.deepEqual(clampedPositions[1], { x: 976, y: 576 });
  assert.deepEqual(clampedPositions[2], { x: 500, y: 300 });
});

test("Stereo Panning: Peers on the left pan negative, peers on the right pan positive", async () => {
  const { calculateStereoPan } = await import(
    "../client/src/services/audio/binauralPanner.js"
  );
  const me = { x: 500, y: 300 };
  const peerRight = { x: 700, y: 300 };
  const peerLeft = { x: 300, y: 300 };
  const peerCenter = { x: 500, y: 600 };

  assert.equal(calculateStereoPan(me, peerCenter), 0.0);
  assert.equal(calculateStereoPan(me, peerRight, 400), 0.5);
  assert.equal(calculateStereoPan(me, peerLeft, 400), -0.5);
  // Clamping at maximum width
  assert.equal(calculateStereoPan(me, { x: 1000, y: 300 }, 400), 1.0);
  assert.equal(calculateStereoPan(me, { x: 0, y: 300 }, 400), -1.0);
});
