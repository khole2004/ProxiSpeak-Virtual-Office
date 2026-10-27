// Detect if user is speaking using Web Audio API

export class SpeechDetector {
  constructor(audioStream, onSpeechChange, threshold = 0.02) {
    // Create audio context and analyser node
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;

    // Connect microphone stream to analyser

    this.source = this.audioContext.createMediaStreamSource(audioStream);
    this.source.connect(this.analyser);

    // Buffer array to store frequency volume data

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.isSpeaking = false;
    this.threshold = threshold;
    this.onSpeechChange = onSpeechChange;
    this.active = true;

    // Start detecting speech

    this.detect();
  }

  // Calculate volume level and check if user is speaking

  detect = () => {
    if (!this.active) return;

    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate average volume

    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length / 255;
    const speakingNow = average > this.threshold;

    // Trigger callback when speaking status changes

    if (speakingNow !== this.isSpeaking) {
      this.isSpeaking = speakingNow;
      this.onSpeechChange(this.isSpeaking);
    }

    requestAnimationFrame(this.detect);
  };

  // Stop audio monitoring and close audio context
  
  stop() {
    this.active = false;
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }
  }
}