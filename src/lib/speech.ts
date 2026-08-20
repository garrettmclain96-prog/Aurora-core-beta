// Hands-free mode. Aurora reads her diagnosis aloud so you can keep your hands
// in the unit and the phone on the workbench. Uses the browser's built-in
// speech synthesis — no key, no network, works on iPhone Safari.

const KEY = 'aurora_handsfree'

export function handsFreeOn(): boolean {
  return localStorage.getItem(KEY) === '1'
}
export function setHandsFree(on: boolean): void {
  localStorage.setItem(KEY, on ? '1' : '0')
  if (!on) stopSpeaking()
}

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

let voice: SpeechSynthesisVoice | null = null
function pickVoice(): SpeechSynthesisVoice | null {
  if (!supported) return null
  if (voice) return voice
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  // Prefer a natural en-US voice; fall back to any English, then anything.
  voice =
    voices.find(v => /en[-_]US/i.test(v.lang) && /(Samantha|Aaron|Ava|Siri|Natural|Google US)/i.test(v.name)) ||
    voices.find(v => /en[-_]US/i.test(v.lang)) ||
    voices.find(v => /^en/i.test(v.lang)) ||
    voices[0]
  return voice
}
if (supported) window.speechSynthesis.onvoiceschanged = () => { voice = null; pickVoice() }

// Strip things that sound bad read aloud: emojis, markdown, extra whitespace.
function cleanForSpeech(text: string): string {
  return text
    .replace(/[*_`#>]/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}⬀-⯿️]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Unlock speech on iOS — must be called from a user gesture (the toggle tap). */
export function primeSpeech(): void {
  if (!supported) return
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  window.speechSynthesis.speak(u)
}

export function speak(text: string, safety?: string | null): void {
  if (!supported || !handsFreeOn()) return
  const body = safety ? `${text}. Safety note: ${safety}` : text
  const clean = cleanForSpeech(body)
  if (!clean) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(clean)
  const v = pickVoice()
  if (v) u.voice = v
  u.rate = 1.02
  u.pitch = 1
  window.speechSynthesis.speak(u)
}

export function stopSpeaking(): void {
  if (supported) window.speechSynthesis.cancel()
}

export const speechSupported = supported
