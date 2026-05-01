// Web Audio API — لا يحتاج ملفات صوتية خارجية
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  vol = 0.25,
  delay = 0
) {
  try {
    const c    = getCtx();
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(vol, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration);
  } catch {
    // Silent fail — المستخدم لم يتفاعل بعد مع الصفحة
  }
}

export function playSound(type: 'place' | 'move' | 'capture' | 'win' | 'lose') {
  switch (type) {
    case 'place':
      tone(440, 0.08);
      break;
    case 'move':
      tone(330, 0.06);
      break;
    case 'capture':
      tone(220, 0.15, 'sawtooth', 0.3);
      tone(180, 0.2,  'sawtooth', 0.2, 0.1);
      break;
    case 'win':
      tone(523, 0.12, 'sine', 0.3, 0);
      tone(659, 0.12, 'sine', 0.3, 0.15);
      tone(784, 0.25, 'sine', 0.3, 0.30);
      break;
    case 'lose':
      tone(300, 0.2, 'sawtooth', 0.25, 0);
      tone(220, 0.3, 'sawtooth', 0.2,  0.2);
      break;
  }
}
