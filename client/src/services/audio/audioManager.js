
import { audioSocket } from "./audioSocket";
import { getMicrophoneStream } from "./microphone";
import {
  createPeerConnection,
  addMicrophoneToConnection,
  closePeerConnection,
} from "./webrtc";
import {
  createProximityAudio,
  updateProximityVolume,
} from "./proximityAudio";

const ROOM_ID = "proxispeak-main-room";
const INITIAL_POSITION = { x: 500, y: 460 };

let localStream = null;
let lastLocalPosition = { ...INITIAL_POSITION };
let lastRemotePositions = {};

const peerConnections = new Map();
const pendingCandidates = new Map();
const remoteAudioNodes = new Map();

function applyVolume(remoteId, audioNode) {
  const remotePosition = lastRemotePositions[remoteId];

  if (!remotePosition) return;

  const { distance, volume } = updateProximityVolume(
    audioNode.gainNode,
    lastLocalPosition,
    remotePosition
  );

  console.log(
    `Participant ${remoteId}: distance=${distance.toFixed(1)}, volume=${volume.toFixed(2)}`
  );
}

function removeRemoteParticipant(remoteId) {
  const peer = peerConnections.get(remoteId);

  if (peer) {
    closePeerConnection(peer);
    peerConnections.delete(remoteId);
  }

  pendingCandidates.delete(remoteId);

  const audioNode = remoteAudioNodes.get(remoteId);

  if (audioNode) {
    audioNode.audio.pause();
    audioNode.audio.srcObject = null;
    audioNode.audio.remove();

    if (audioNode.audioContext.state !== "closed") {
      audioNode.audioContext.close().catch((error) => {
        console.warn("Could not close remote audio context:", error);
      });
    }

    remoteAudioNodes.delete(remoteId);
  }

  delete lastRemotePositions[remoteId];
}

// Create and configure a WebRTC connection for one participant.
function createConnection(remoteId) {
  const peer = createPeerConnection();

  peerConnections.set(remoteId, peer);

  addMicrophoneToConnection(peer, localStream);

  peer.onicecandidate = (event) => {
    if (event.candidate) {
      audioSocket.emit("webrtc-ice-candidate", {
        targetId: remoteId,
        candidate: event.candidate,
      });
    }
  };

  peer.ontrack = async (event) => {
    const remoteStream = event.streams?.[0];

    if (!remoteStream || remoteAudioNodes.has(remoteId)) {
      return;
    }

    let audioContext = null;
    let audio = null;

    try {
      const proximityAudio = createProximityAudio(remoteStream);

      audioContext = proximityAudio.audioContext;

      const { gainNode, processedStream } = proximityAudio;

      audio = document.createElement("audio");
      audio.id = `remote-audio-${remoteId}`;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.srcObject = processedStream;

      // Keep each participant's audio independent.
      document.body.appendChild(audio);

      const audioNode = { audioContext, gainNode, audio };
      remoteAudioNodes.set(remoteId, audioNode);

      await audioContext.resume();

      // Apply the latest known position immediately. This handles
      // the case where the avatar moved before the audio arrived.
      applyVolume(remoteId, audioNode);

      await audio.play();
    } catch (error) {
      console.error(
        "Could not set up proximity audio:",
        remoteId,
        error
      );

      remoteAudioNodes.delete(remoteId);

      if (audio) {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      }

      if (audioContext && audioContext.state !== "closed") {
        await audioContext.close().catch(() => {});
      }
    }
  };

  return peer;
}

async function makeOffer(remoteId) {
  if (!remoteId || peerConnections.has(remoteId)) {
    return;
  }

  const peer = createConnection(remoteId);

  try {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    audioSocket.emit("webrtc-offer", {
      targetId: remoteId,
      offer: peer.localDescription,
    });
  } catch (error) {
    console.error("Could not create WebRTC offer:", remoteId, error);
    removeRemoteParticipant(remoteId);
  }
}

// Participants already present when we join.
audioSocket.on("audio-room-participants", async (participants) => {
  if (!Array.isArray(participants)) return;

  for (const remoteId of participants) {
    // Only one participant initiates each connection.
    if (audioSocket.id < remoteId) {
      await makeOffer(remoteId);
    }
  }
});

// A participant joins after us.
audioSocket.on("audio-participant-joined", async (remoteId) => {
  if (audioSocket.id < remoteId) {
    await makeOffer(remoteId);
  }
});

// Receive an offer from the participant responsible for initiating.
audioSocket.on("webrtc-offer", async ({ senderId, offer } = {}) => {
  if (!senderId || !offer) return;

  if (audioSocket.id < senderId) {
    console.warn("Ignoring unexpected offer from:", senderId);
    return;
  }

  let peer = peerConnections.get(senderId);

  try {
    if (!peer) {
      peer = createConnection(senderId);
    }

    if (peer.signalingState !== "stable") {
      console.warn(
        "Peer is not ready for an offer:",
        senderId,
        peer.signalingState
      );
      return;
    }

    await peer.setRemoteDescription(offer);

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    audioSocket.emit("webrtc-answer", {
      targetId: senderId,
      answer: peer.localDescription,
    });

    const candidates = pendingCandidates.get(senderId) || [];

    for (const candidate of candidates) {
      await peer.addIceCandidate(candidate);
    }

    pendingCandidates.delete(senderId);
  } catch (error) {
    console.error("Could not answer WebRTC offer:", senderId, error);
  }
});

// Receive the answer to our offer.
audioSocket.on("webrtc-answer", async ({ senderId, answer } = {}) => {
  try {
    const peer = peerConnections.get(senderId);

    if (!peer) {
      console.warn("Ignoring answer: no peer connection for", senderId);
      return;
    }

    if (peer.signalingState !== "have-local-offer") {
      console.warn(
        "Ignoring unexpected WebRTC answer from:",
        senderId,
        "Signaling state:",
        peer.signalingState
      );
      return;
    }

    await peer.setRemoteDescription(answer);

    const candidates = pendingCandidates.get(senderId) || [];

    for (const candidate of candidates) {
      await peer.addIceCandidate(candidate);
    }

    pendingCandidates.delete(senderId);
  } catch (error) {
    console.error("Could not apply WebRTC answer:", error);
  }
});

// ICE candidates can arrive before the remote description.
audioSocket.on(
  "webrtc-ice-candidate",
  async ({ senderId, candidate } = {}) => {
    if (!senderId || !candidate) return;

    try {
      const peer = peerConnections.get(senderId);

      if (peer?.remoteDescription) {
        await peer.addIceCandidate(candidate);
      } else {
        const candidates = pendingCandidates.get(senderId) || [];

        candidates.push(candidate);
        pendingCandidates.set(senderId, candidates);
      }
    } catch (error) {
      console.error("Could not add ICE candidate:", senderId, error);
    }
  }
);

// Remove one participant's audio when they leave.
// This expects the server to emit their socket ID as the event payload.
audioSocket.on("audio-participant-left", (remoteId) => {
  if (typeof remoteId === "string") {
    removeRemoteParticipant(remoteId);
  }
});

function waitForSocketConnection() {
  if (audioSocket.connected) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      audioSocket.off("connect", handleConnect);
      audioSocket.off("connect_error", handleError);
    };

    const handleConnect = () => {
      cleanup();
      resolve();
    };

    const handleError = (error) => {
      cleanup();
      reject(error);
    };

    // Register listeners before connecting to avoid missing the event.
    audioSocket.once("connect", handleConnect);
    audioSocket.once("connect_error", handleError);

    audioSocket.connect();

    // Handle a connection that completed immediately.
    if (audioSocket.connected) {
      cleanup();
      resolve();
    }
  });
}

// Start microphone capture and join the room.
export async function startAudio() {
  if (localStream) return;

  try {
    localStream = await getMicrophoneStream();

    await waitForSocketConnection();

    audioSocket.emit("join-audio-room", ROOM_ID);

    console.log("Joined ProxiSpeak audio room.");
  } catch (error) {
    stopAudio();
    throw error;
  }
}

// Cache the latest positions, even when remote audio has not arrived yet.
export function updateAudioPositions(localPosition, remotePositions) {
  if (
    !localPosition ||
    !Number.isFinite(localPosition.x) ||
    !Number.isFinite(localPosition.y) ||
    !remotePositions
  ) {
    return;
  }

  lastLocalPosition = { ...localPosition };
  lastRemotePositions = { ...remotePositions };

  for (const [remoteId, audioNode] of remoteAudioNodes) {
    applyVolume(remoteId, audioNode);
  }
}

// Stop all connections, audio contexts, tracks and signaling.
export function stopAudio() {
  for (const remoteId of [...peerConnections.keys()]) {
    removeRemoteParticipant(remoteId);
  }

  peerConnections.clear();
  pendingCandidates.clear();
  remoteAudioNodes.clear();

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  lastLocalPosition = { ...INITIAL_POSITION };
  lastRemotePositions = {};

  if (audioSocket.connected) {
    audioSocket.disconnect();
  }
}
// Toggle microphone mute state
export function toggleLocalMute() {
  if (!localStream) return false;
  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    return !audioTrack.enabled; // true = muted, false = unmuted
  }
  return false;
}

// Get the active local microphone stream
export function getLocalAudioStream() {
  return localStream;
}
