export function createPeerConnection() {
  const peerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      //  Added TURN Relay Servers
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
    ],
  });

  peerConnection.oniceconnectionstatechange = () => {
    console.log(
      "ICE connection state:",
      peerConnection.iceConnectionState
    );
  };

  return peerConnection;
}

export function addMicrophoneToConnection(peerConnection, stream) {
  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });
}

export function closePeerConnection(peerConnection) {
  if (peerConnection) {
    peerConnection.close();
  }
}