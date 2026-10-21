
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
  const dx = localPosition.x - remotePosition.x;
  const dy = localPosition.y - remotePosition.y;

  const distance = Math.sqrt(dx * dx + dy * dy);

  const R_FULL = 100;
  const R_MAX = 500;

  let volume;

  if (distance <= R_FULL) {
    volume = 1;
  } else if (distance >= R_MAX) {
    volume = 0;
  } else {
    volume = 1 - (distance - R_FULL) / (R_MAX - R_FULL);
  }

  const now = gainNode.context.currentTime;

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setTargetAtTime(volume, now, 0.05);

  return { distance, volume };
}