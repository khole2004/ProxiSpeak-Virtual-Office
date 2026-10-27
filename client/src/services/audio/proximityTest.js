import { updateProximityVolume } from "./proximityAudio";

export function runProximityTest() {
  const gainNode = {
    context: { currentTime: 0 },
    gain: {
      value: 1,
      cancelScheduledValues() {},
      setTargetAtTime(value) {
        this.value = value;
      },
    },
  };

  const distances = [0, 100, 300, 500, 600];

  return distances.map((distance) => {
    const result = updateProximityVolume(
      gainNode,
      { x: 0, y: 0 },
      { x: distance, y: 0 }
    );

    return {
      distance,
      volume: result.volume,
    };
  });
}