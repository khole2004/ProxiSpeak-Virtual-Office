
export const R_FULL = 100;
export const R_MAX = 500;

// Calculate the distance between two avatar positions.
export function calculateDistance(localPosition, remotePosition) {
  const dx = localPosition.x - remotePosition.x;
  const dy = localPosition.y - remotePosition.y;

  return Math.sqrt(dx * dx + dy * dy);
}

// Calculate volume based on distance.
export function calculateProximityVolume(distance) {
  if (distance <= R_FULL) {
    return 1;
  }

  if (distance >= R_MAX) {
    return 0;
  }

  return 1 - (distance - R_FULL) / (R_MAX - R_FULL);
}

export function createProximityAudio(audioStream) {
  const audioContext = new AudioContext();

  const source = audioContext.createMediaStreamSource(audioStream);
  const gainNode = audioContext.createGain();
  const destination = audioContext.createMediaStreamDestination();

  source.connect(gainNode);
  gainNode.connect(destination);

  return {
    audioContext,
    gainNode,
    processedStream: destination.stream,
  };
}

export function updateProximityVolume(
  gainNode,
  localPosition,
  remotePosition
) {
  const distance = calculateDistance(localPosition, remotePosition);
  const volume = calculateProximityVolume(distance);

  const now = gainNode.context.currentTime;

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setTargetAtTime(volume, now, 0.05);

  return { distance, volume };
}
