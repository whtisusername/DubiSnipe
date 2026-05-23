// Dubizzle Snipe Pro - Offscreen Audio Helper Script (Manifest V3)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'PLAY_CHIME') {
    try {
      playCustomAudio();
    } catch (err) {
      console.error('Audio playback failed:', err);
    }
  }
});

function playCustomAudio() {
  const audio = new Audio('task_completed_sound_%232-1779533040830.mp3');
  audio.play().catch(err => {
    console.error('Custom audio playback failed, falling back to synthesized chime:', err);
    playSynthesizedChime();
  });
}

// Programmatic chime synthesizer using Web Audio API (eliminates external asset loading issues)
function playSynthesizedChime() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Resume AudioContext if suspended (browser security autoplay policies)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  
  const now = ctx.currentTime;
  
  // Dual-tone high-frequency crystal chime synthesis
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  // Pure sine oscillator at A5, sweeping quickly up to A6 for a positive "ping" sound
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now); // A5
  osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.12); // Sweep up to A6
  
  // Harmonic triangle oscillator at E6 (perfect fifth) to add warmth and depth
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(1320, now); // E6
  
  // Volume envelope: extremely rapid swell, long decay
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.35, now + 0.04); // Fast swell
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.0); // Elegant decay
  
  // Connect routing
  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Fire synthesized tones
  osc1.start(now);
  osc2.start(now);
  
  // Schedule silence and cleanup
  osc1.stop(now + 1.0);
  osc2.stop(now + 1.0);
}
