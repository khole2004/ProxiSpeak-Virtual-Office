
export function createPeerConnection() {
  const peerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
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
