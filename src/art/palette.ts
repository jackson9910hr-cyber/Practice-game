/** Art tokens (GDD §8.1). */
export const C = {
  indigo: 0x23305e,
  gold: 0xffd166,
  pink: 0xff8fab,
  mint: 0x5ed3a2,
  sky: 0x7cc6fe,
  cream: 0xfff7e8,
  ink: 0x1b1b2f,
  white: 0xffffff,
  shadow: 0x151c3a,
} as const;

export const FONT_KO = '-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';
export const FONT_EN =
  '"Avenir Next Rounded", "Avenir Next", "Nunito", -apple-system, "Segoe UI", sans-serif';
/** Kid-friendly letter shapes for phonics (single-storey a where available). */
export const FONT_LETTER =
  '"Chalkboard SE", "Comic Sans MS", "Avenir Next Rounded", -apple-system, sans-serif';
export const FONT_EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export function hex(s: string): number {
  return parseInt(s.replace('#', ''), 16);
}

export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255,
    ag = (a >> 8) & 255,
    ab = a & 255;
  const br = (b >> 16) & 255,
    bg = (b >> 8) & 255,
    bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Wilted version of a colour: desaturated and darker (GDD: -60% saturation, -20% value). */
export function wilt(color: number, amount: number): number {
  const r = (color >> 16) & 255,
    g = (color >> 8) & 255,
    b = color & 255;
  const grey = Math.round(r * 0.3 + g * 0.59 + b * 0.11);
  const desat = mix(color, (grey << 16) | (grey << 8) | grey, 0.6 * amount);
  return mix(desat, 0x000000, 0.2 * amount);
}

export const COLOR_WORDS: Record<string, number> = {
  red: 0xe63946,
  blue: 0x3a86ff,
  yellow: 0xffd60a,
  green: 0x2dc653,
  pink: 0xff8fab,
  orange: 0xfb8500,
  purple: 0x8e44ad,
  white: 0xffffff,
  black: 0x22223b,
  brown: 0x8d5524,
};
