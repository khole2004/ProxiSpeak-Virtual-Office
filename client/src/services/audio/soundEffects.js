/**
 * ProxiSpeak Procedural Sound Effects Synthesizer
 * Generates lightweight, pleasant UI sound cues using pure Web Audio API oscillators.
 * Zero external audio assets required; avoids CORS, latency, and asset load issues.
 */

let sharedAudioCtx = null;

function getAudioContext() {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Play a warm ascending two-tone chime when a user joins the room/office.
 */
export function playJoinRoomChime(masterVolume = 0.3) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // C5 (523.25 Hz) -> G5 (783.99 Hz)
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);

    gain.gain.setValueAtTime(masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch (err) {
    console.debug("Audio effect bypassed:", err.message);
  }
}

/**
 * Play a subtle descending tone when a user leaves the room/office.
 */
export function playLeaveRoomChime(masterVolume = 0.25) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // G5 (783.99 Hz) -> E4 (329.63 Hz)
    osc.frequency.setValueAtTime(783.99, now);
    osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.15);

    gain.gain.setValueAtTime(masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.29);
  } catch (err) {
    console.debug("Audio effect bypassed:", err.message);
  }
}

/**
 * Play a crisp click feedback tone on microphone mute / unmute toggle.
 * @param {boolean} isMuted
 */
export function playMuteToggleSound(isMuted, masterVolume = 0.2) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    const freq = isMuted ? 320 : 640;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch (err) {
    console.debug("Audio effect bypassed:", err.message);
  }
}

/**
 * Play an ethereal harmonic ripple when an avatar enters another participant's hearing perimeter.
 */
export function playProximityGreeting(masterVolume = 0.2) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [659.25, 830.61, 987.77]; // E5, G#5, B5 (E Major triad)
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(masterVolume / 2, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.26);
    });
  } catch (err) {
    console.debug("Audio effect bypassed:", err.message);
  }
}
