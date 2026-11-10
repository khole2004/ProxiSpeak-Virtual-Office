/**
 * WebRTC Peer Connection Configuration and Lifecycle Service
 * Part of ProxiSpeak Geospatial Audio Virtual Office
 */

const DEFAULT_ICE_SERVERS = [
  {
    urls: "stun:stun.l.google.com:19302",
  },
  {
    urls: "stun:stun1.l.google.com:19302",
  },
  // High-availability Metered TURN Relays for NAT/Firewall traversal
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

/**
 * Creates and initializes an RTCPeerConnection with STUN/TURN fallback
 * and connection health event handlers.
 * @param {Object} options
 * @param {Function} [options.onStateChange]
 * @param {Function} [options.onIceFailure]
 * @returns {RTCPeerConnection}
 */
export function createPeerConnection(options = {}) {
  const { onStateChange, onIceFailure } = options;

  const peerConnection = new RTCPeerConnection({
    iceServers: DEFAULT_ICE_SERVERS,
    iceCandidatePoolSize: 10,
  });

  // ICE Connection State Monitoring with Auto-recovery hooks
  peerConnection.oniceconnectionstatechange = () => {
    const state = peerConnection.iceConnectionState;
    console.log(`[WebRTC ICE State] -> ${state}`);

    if (state === "failed" || state === "disconnected") {
      console.warn(`[WebRTC] ICE connection ${state}, attempting recovery...`);
      if (typeof onIceFailure === "function") {
        onIceFailure(peerConnection, state);
      } else {
        restartIceConnection(peerConnection);
      }
    }

    if (typeof onStateChange === "function") {
      onStateChange("ice", state);
    }
  };

  // Peer Connection Overall State Monitoring
  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection.connectionState;
    console.log(`[WebRTC Connection State] -> ${state}`);

    if (state === "failed") {
      console.warn("[WebRTC] Connection failed. Restarting ICE candidates.");
      restartIceConnection(peerConnection);
    }

    if (typeof onStateChange === "function") {
      onStateChange("connection", state);
    }
  };

  return peerConnection;
}

/**
 * Restarts ICE candidates on an active peer connection to recover from network drops.
 * @param {RTCPeerConnection} peerConnection
 */
export function restartIceConnection(peerConnection) {
  if (!peerConnection || peerConnection.signalingState === "closed") {
    return;
  }

  try {
    if (typeof peerConnection.restartIce === "function") {
      peerConnection.restartIce();
      console.log("[WebRTC] Triggered peerConnection.restartIce()");
    }
  } catch (error) {
    console.warn("[WebRTC] Could not restart ICE automatically:", error);
  }
}

/**
 * Adds local microphone audio tracks to the peer connection.
 * @param {RTCPeerConnection} peerConnection
 * @param {MediaStream} stream
 */
export function addMicrophoneToConnection(peerConnection, stream) {
  if (!peerConnection || !stream) {
    return;
  }

  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });
}

/**
 * Safely closes and disposes an RTCPeerConnection.
 * @param {RTCPeerConnection} peerConnection
 */
export function closePeerConnection(peerConnection) {
  if (!peerConnection) {
    return;
  }

  try {
    peerConnection.onicecandidate = null;
    peerConnection.ontrack = null;
    peerConnection.oniceconnectionstatechange = null;
    peerConnection.onconnectionstatechange = null;
    peerConnection.close();
  } catch (error) {
    console.warn("[WebRTC] Error while closing peer connection:", error);
  }
}
