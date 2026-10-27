
export async function getMicrophoneStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    console.log("Microphone access granted!");
    return stream;
  } catch (error) {
    console.error("Could not access microphone:", error);
    throw error;
  }
}
