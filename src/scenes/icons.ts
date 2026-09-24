import type { StationPlan } from '../core/types';

export function stationIcon(p: StationPlan): string {
  switch (p.game ?? p.kind) {
    case 'word-garden':
      return '🌷';
    case 'sound-butterfly':
      return '🦋';
    case 'hangul-pieces':
      return '🧩';
    case 'number-fireflies':
      return '🔢';
    case 'pattern-path':
      return '🌼';
    case 'ant-path':
      return '🐜';
    case 'sentence-train':
      return '🚂';
    case 'chant':
      return '🎵';
    case 'medley':
      return '👋';
    case 'finale':
      return '🎆';
    default:
      return '⭐';
  }
}

export const DECORATIONS = [
  { id: 'lantern', icon: '🏮', price: 5 },
  { id: 'pot', icon: '🪴', price: 5 },
  { id: 'fountain', icon: '⛲', price: 12 },
  { id: 'chime', icon: '🎐', price: 8 },
  { id: 'kite', icon: '🪁', price: 8 },
  { id: 'star', icon: '🌟', price: 15 },
] as const;
