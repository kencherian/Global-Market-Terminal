let audioCtx: AudioContext | null = null;

export function playTerminalTick(isBullish: boolean = true) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Subtle pitch: 880Hz for up, 440Hz for down
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isBullish ? 920 : 540, audioCtx.currentTime);

    // Very short decay (30ms), gentle volume
    gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
  } catch (err) {
    // Gracefully ignore audio errors if autoplay blocked
  }
}
