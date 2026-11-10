/**
 * ProxiSpeak Spatial Stereo & Binaural Audio Panner
 * Computes horizontal audio panning (-1.0 = 100% Left Ear, +1.0 = 100% Right Ear)
 * using trigonometry between local user avatar and remote peers in the virtual office.
 */

/**
 * Calculates normalized stereo pan value between -1.0 (left) and 1.0 (right).
 *
 * @param {{x: number, y: number}} localPos - Coordinate of the listening participant
 * @param {{x: number, y: number}} peerPos - Coordinate of the speaking peer
 * @param {number} maxPanDistance - Distance threshold for maximum ear separation (default: 400px)
 * @returns {number} Pan factor clamped strictly within [-1.0, 1.0]
 */
export function calculateStereoPan(localPos, peerPos, maxPanDistance = 400) {
  if (!localPos || !peerPos) return 0.0;

  const dx = peerPos.x - localPos.x;
  // Normalize delta x by maximum spatial width
  const rawPan = dx / maxPanDistance;

  // Clamp within standard Web Audio StereoPannerNode bounds [-1.0, 1.0]
  return Math.max(-1.0, Math.min(1.0, Number(rawPan.toFixed(3))));
}

/**
 * Attaches or configures a StereoPannerNode inside an active Web Audio routing graph.
 *
 * @param {AudioContext} audioCtx
 * @param {AudioNode} sourceNode - Remote media stream source node
 * @param {GainNode} gainNode - Distance attenuation gain node
 * @returns {StereoPannerNode|null}
 */
export function createSpatialPannerNode(audioCtx, sourceNode, gainNode) {
  if (!audioCtx || !sourceNode || !gainNode) return null;

  try {
    if (audioCtx.createStereoPanner) {
      const panner = audioCtx.createStereoPanner();
      panner.pan.setValueAtTime(0.0, audioCtx.currentTime);

      // Reconnect: Source -> Panner -> GainNode -> Destination
      sourceNode.disconnect();
      sourceNode.connect(panner);
      panner.connect(gainNode);

      return panner;
    }
  } catch (err) {
    console.warn("StereoPannerNode unsupported, falling back to mono spatial gain:", err);
  }

  return null;
}

/**
 * Smoothly ramps the stereo pan towards the target coordinate to prevent audible pops.
 *
 * @param {StereoPannerNode} pannerNode
 * @param {number} targetPan - Value in [-1.0, 1.0]
 * @param {AudioContext} audioCtx
 * @param {number} rampDuration - Transition time in seconds (default: 0.08s)
 */
export function updatePannerSmooth(pannerNode, targetPan, audioCtx, rampDuration = 0.08) {
  if (!pannerNode || !audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    pannerNode.pan.cancelScheduledValues(now);
    pannerNode.pan.linearRampToValueAtTime(targetPan, now + rampDuration);
  } catch {
    pannerNode.pan.value = targetPan;
  }
}
