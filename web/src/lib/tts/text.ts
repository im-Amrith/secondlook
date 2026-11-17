// Text preparation for speech: tidy symbols that read badly and split into sentence-sized chunks
// (short chunks start playing sooner).

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

/** Make text pleasant to hear: no emoji, no placeholder brackets, no bare URLs. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(EMOJI, "")
    .replace(/https?:\/\/\S+/g, " link ")
    .replace(/\[([A-Z]+)_\d+\]/g, (_, t: string) => t.toLowerCase())
    .replace(/[“”«»"]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

const SENTENCE = /[^.!?।॥\n]+(?:[.!?।॥]+|\n|$)/gu;

/** Cleaned sentences. */
export function sentences(text: string): string[] {
  const clean = cleanForSpeech(text);
  return clean ? (clean.match(SENTENCE) ?? [clean]).map((s) => s.trim()).filter(Boolean) : [];
}

/**
 * Split into chunks of at most `max` characters, on sentence ends where possible. The first chunk
 * is kept to one sentence so speech starts quickly; the rest are synthesized while it plays.
 */
export function chunkForSpeech(text: string, max = 220): string[] {
  const out: string[] = [];
  let cur = "";
  const push = () => {
    if (cur.trim()) out.push(cur.trim());
    cur = "";
  };
  for (const s of sentences(text)) {
    if (s.length > max) {
      push();
      let piece = "";
      for (const word of s.split(/\s+/)) {
        if ((piece + " " + word).trim().length > max) {
          if (piece) out.push(piece);
          piece = word;
        } else piece = piece ? `${piece} ${word}` : word;
      }
      cur = piece;
      continue;
    }
    if ((cur + " " + s).trim().length > max || (out.length === 0 && cur)) push();
    cur = cur ? `${cur} ${s}` : s;
  }
  push();
  return out;
}
