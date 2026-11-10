import React, { useState, useEffect, useRef } from "react";

/**
 * AudioSettingsModal Component
 * Provides users with interactive hardware microphone selection,
 * speaker volume calibration, visual audio meter, and WebRTC audio constraint toggles.
 */
export default function AudioSettingsModal({ isOpen, onClose, currentVolume = 1.0, onVolumeChange }) {
  const [devices, setDevices] = useState([]);
  const [selectedMic, setSelectedMic] = useState("");
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);

  // Enumerate connected audio devices
  useEffect(() => {
    if (!isOpen) return;

    async function loadDevices() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = deviceList.filter((d) => d.kind === "audioinput");
        setDevices(audioInputs);
        if (audioInputs.length > 0 && !selectedMic) {
          setSelectedMic(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.warn("Could not list audio hardware:", err);
      }
    }

    loadDevices();
  }, [isOpen, selectedMic]);

  // Live Microphone Test Level Meter
  const startMicTest = async () => {
    try {
      setIsTestingAudio(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedMic ? { exact: selectedMic } : undefined,
          echoCancellation,
          noiseSuppression,
        },
      });

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteFrequencyData(buffer);
        const sum = buffer.reduce((a, b) => a + b, 0);
        const avg = sum / buffer.length / 255;
        setAudioLevel(Math.min(100, Math.round(avg * 150)));
        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch (err) {
      console.error("Mic test error:", err);
      setIsTestingAudio(false);
    }
  };

  const stopMicTest = () => {
    setIsTestingAudio(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎙️</span>
            <h3 className="text-lg font-bold">Audio & Microphone Settings</h3>
          </div>
          <button
            onClick={() => {
              stopMicTest();
              onClose();
            }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Microphone Device Selection */}
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Microphone Input Device
            </label>
            <select
              value={selectedMic}
              onChange={(e) => setSelectedMic(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {devices.length > 0 ? (
                devices.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    {device.label || `Microphone ${idx + 1}`}
                  </option>
                ))
              ) : (
                <option value="">Default System Microphone</option>
              )}
            </select>
          </div>

          {/* Live Mic Test Meter */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs text-slate-400">
              <span>Input Level</span>
              <span>{audioLevel}%</span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-indigo-500 transition-all duration-75"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
            <div className="mt-2 flex justify-end">
              {!isTestingAudio ? (
                <button
                  type="button"
                  onClick={startMicTest}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md transition"
                >
                  Test Microphone
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopMicTest}
                  className="text-xs bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-md transition"
                >
                  Stop Test
                </button>
              )}
            </div>
          </div>

          {/* Master Output Volume */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs text-slate-400">
              <span>Master Spatial Voice Volume</span>
              <span>{Math.round((currentVolume || 1) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={currentVolume}
              onChange={(e) => onVolumeChange && onVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* WebRTC Audio Processing Toggles */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="flex items-center justify-between text-sm cursor-pointer text-slate-300">
              <span>Echo Cancellation</span>
              <input
                type="checkbox"
                checked={echoCancellation}
                onChange={(e) => setEchoCancellation(e.target.checked)}
                className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between text-sm cursor-pointer text-slate-300">
              <span>Noise Suppression</span>
              <input
                type="checkbox"
                checked={noiseSuppression}
                onChange={(e) => setNoiseSuppression(e.target.checked)}
                className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              stopMicTest();
              onClose();
            }}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
          >
            Done & Save
          </button>
        </div>
      </div>
    </div>
  );
}
