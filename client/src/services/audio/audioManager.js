
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

let localStream = null;

const peerConnections = new Map();
const pendingCandidates = new Map();
const remoteAudioNodes = new Map();

const ROOM_ID = "proxispeak-main-room";

function createConnection(remoteId) {
  const peer = createPeerConnection();

  peerConnections.set(remoteId, peer);

  // Send the local microphone stream to the remote participant.
  addMicrophoneToConnection(peer, localStream);

  peer.onicecandidate = (event) => {
    if (event.candidate) {
      audioSocket.emit("webrtc-ice-candidate", {
        targetId: remoteId,
        candidate: event.candidate,
      });
    }
  };

  // Process incoming audio through a GainNode so its volume
  // can be adjusted independently for each remote participant.
  peer.ontrack = async (event) => {
    const remoteStream = event.streams[0];

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

      document.body.appendChild(audio);

      remoteAudioNodes.set(remoteId, {
        audioContext,
        gainNode,
        audio,
      });

      await audioContext.resume();
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
  if (peerConnections.has(remoteId)) {
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
  }
}

// Handle participants already in the room.
audioSocket.on("audio-room-participants", async (participants) => {
  for (const remoteId of participants) {
    // Only one participant initiates the connection.
    if (audioSocket.id < remoteId) {
      await makeOffer(remoteId);
    }
  }
});

// Handle a participant joining after us.
audioSocket.on("audio-participant-joined", async (remoteId) => {
  if (audioSocket.id < remoteId) {
    await makeOffer(remoteId);
  }
});

// Handle incoming WebRTC offers.
audioSocket.on("webrtc-offer", async ({ senderId, offer }) => {
  // The lower socket ID is responsible for initiating.
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
    console.error(
      "Could not answer WebRTC offer:",
      senderId,
      error
    );
  }
});

// Handle WebRTC answers.
audioSocket.on("webrtc-answer", async ({ senderId, answer }) => {
  try {
    const peer = peerConnections.get(senderId);

    if (!peer) {
      console.warn(
        "Ignoring answer: no peer connection for",
        senderId
      );
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

// Handle incoming ICE candidates.
audioSocket.on(
  "webrtc-ice-candidate",
  async ({ senderId, candidate }) => {
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
      console.error(
        "Could not add ICE candidate:",
        senderId,
        error
      );
    }
  }
);

// Start microphone capture and join the audio room.
export async function startAudio() {
  if (localStream) {
    return;
  }

  try {
    localStream = await getMicrophoneStream();

    audioSocket.connect();

    if (!audioSocket.connected) {
      await new Promise((resolve, reject) => {
        audioSocket.once("connect", resolve);
        audioSocket.once("connect_error", reject);
      });
    }

    audioSocket.emit("join-audio-room", ROOM_ID);

    console.log("Joined ProxiSpeak audio room.");
  } catch (error) {
    stopAudio();
    throw error;
  }
}

// Update each remote participant's volume using player coordinates.
// Positions should have the form { x: number, y: number }.
export function updateAudioPositions(localPosition, remotePositions) {
  if (
    !localPosition ||
    !Number.isFinite(localPosition.x) ||
    !Number.isFinite(localPosition.y) ||
    !remotePositions
  ) {
    return;
  }

  for (const [remoteId, audioNode] of remoteAudioNodes) {
    const remotePosition = remotePositions[remoteId];

    if (
      !remotePosition ||
      !Number.isFinite(remotePosition.x) ||
      !Number.isFinite(remotePosition.y)
    ) {
      continue;
    }

    const { distance, volume } = updateProximityVolume(
      audioNode.gainNode,
      localPosition,
      remotePosition
    );

    console.log(
      `Participant ${remoteId}: distance=${distance.toFixed(1)}, volume=${volume.toFixed(2)}`
    );
  }
}

// Stop connections, audio contexts, microphone tracks and signalling.
export function stopAudio() {
  for (const peer of peerConnections.values()) {
    closePeerConnection(peer);
  }

  peerConnections.clear();
  pendingCandidates.clear();

  for (const { audioContext, audio } of remoteAudioNodes.values()) {
    audio.pause();
    audio.srcObject = null;
    audio.remove();

    if (audioContext.state !== "closed") {
      audioContext.close().catch((error) => {
        console.warn("Could not close audio context:", error);
      });
    }
  }

  remoteAudioNodes.clear();

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  if (audioSocket.connected) {
    audioSocket.disconnect();
  }
}
