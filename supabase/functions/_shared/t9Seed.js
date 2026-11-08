// חיבור המפענח החדש למילון המערכת: שמות בתי העסק, תוויות הקטגוריות ומדריך המילים
// נכנסים כולם למילון אחד של המפענח. אין כאן ניחוש חופשי של מילים.
import { decode, addWords } from './hebrewKeypadDecoder.js';
import { getVocab } from './t9Vocab.js';

let seeded = false;

export function decodeKeypad(keys) {
  if (!seeded) {
    addWords(getVocab().entries.map((e) => e.term));
    seeded = true;
  }
  const res = decode(keys);
  const single = res.parts.length === 1 && res.parts[0].mode === 'hebrew';
  const options = [];
  if (single) {
    const max = Math.max(1, ...res.alternatives.map((a) => a.length));
    for (let k = 0; k < max; k++) {
      const t = res.alternatives.map((a) => a[k] ?? a[0]).join(' ');
      if (!options.includes(t)) options.push(t);
    }
  } else if (res.text) options.push(res.text);
  return { text: res.text, confidence: res.confidence, alternatives: res.alternatives, options };
}