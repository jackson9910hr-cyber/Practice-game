/** Printable picture word cards (print → "PDF로 저장" on iOS/macOS). Opens in an in-page view. */
import { getWord } from '../core/content';

function picHtml(pic: string): string {
  if (!pic.startsWith('draw:')) return `<span class="emoji">${pic}</span>`;
  const [, kind, arg = ''] = pic.split(':');
  if (kind === 'color') return `<span class="swatch" style="background:${arg}"></span>`;
  if (kind === 'num') return `<span class="num">${arg}</span>`;
  if (kind === 'shape') {
    const shapes: Record<string, string> = { circle: '●', square: '■', triangle: '▲', heart: '♥', star: '★' };
    return `<span class="shape">${shapes[arg] ?? '●'}</span>`;
  }
  if (kind === 'combo') return `<span class="emoji">${pic.slice('draw:combo:'.length)}</span>`;
  const map: Record<string, string> = {
    'mark:head': '🧒',
    'act:jump': '🤸',
    'place:pool': '🏊',
    'place:sky': '🌤️',
    'prep:in': '📦🐱',
    'prep:on': '🐱📦',
    'prep:under': '📦⬇️🐱',
    'thing:table': '🪑',
  };
  return `<span class="emoji">${map[`${kind}:${arg}`] ?? '⭐'}</span>`;
}

export function printWordCards(ids: string[]) {
  let v = document.getElementById('print-view');
  if (!v) {
    v = document.createElement('div');
    v.id = 'print-view';
    document.body.append(v);
  }
  const cards = ids
    .map((id) => getWord(id))
    .map((w) => `<div class="pcard">${picHtml(w.pic)}<b>${w.en}</b><small>${w.ko}</small></div>`)
    .join('');
  v.innerHTML = `<div class="ptools"><button id="pgo">🖨️ 인쇄 / PDF 저장</button><button id="pclose">닫기</button></div><div class="pgrid">${cards}</div>`;
  v.hidden = false;
  document.body.classList.add('printing');
  document.getElementById('pgo')!.onclick = () => window.print();
  document.getElementById('pclose')!.onclick = () => {
    v!.hidden = true;
    document.body.classList.remove('printing');
  };
}
