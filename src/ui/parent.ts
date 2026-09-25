/**
 * 보호자 영역 (DOM, not canvas): adult multiplication gate → dashboard with progress, word/sentence
 * lists with audio, confusing words, printable word cards, time limit, recording settings, backup, reset.
 * Nothing here ever makes a network request.
 */
import { getWord, words as allWords } from '../core/content';
import { curriculumDay, createSave, type Retention } from '../core/progress';
import { confusedTop, gameAccuracy, learnedPatterns, learnedWords, todaySummary } from '../core/report';
import type { GameId } from '../core/types';
import { vid } from '../core/voice-ids';
import { music } from '../audio/music';
import { canRecord, playBlob } from '../audio/recorder';
import { voice } from '../audio/voice';
import { store } from '../state';
import { exportBackup, importBackup } from '../storage/backup';
import { applyRetention, clearRecordings, deleteRecording, listRecordings, wipeAll } from '../storage/db';
import privacy from '../data/privacy.json';
import { printWordCards } from './print';
import { nav } from '../flow';

const GAME_NAMES: Record<GameId, string> = {
  'word-garden': '단어 정원 (영어 단어)',
  'sound-butterfly': '소리 나비 (파닉스)',
  'hangul-pieces': '한글 조각',
  'number-fireflies': '숫자 반딧불',
  'pattern-path': '패턴 꽃길',
  'ant-path': '길 찾기 개미',
  'sentence-train': '문장 기차 (영어 문장)',
};

export let parentOpen = false;
let gateFails = 0;
/** lockout survives a reload (sessionStorage), so refreshing does not bypass it */
function getLock(): number {
  try {
    return Number(sessionStorage.getItem('sg-gate-lock') ?? 0);
  } catch {
    return 0;
  }
}
function setLock(until: number) {
  try {
    sessionStorage.setItem('sg-gate-lock', String(until));
  } catch {
    /* private mode */
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...kids: (Node | string)[]
) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else e.setAttribute(k, v);
  }
  for (const k of kids) e.append(k);
  return e;
}

function overlay(): HTMLElement {
  let o = document.getElementById('parent');
  if (!o) {
    o = el('div', { id: 'parent', role: 'dialog', 'aria-modal': 'true', 'aria-label': '보호자 메뉴' });
    document.body.append(o);
  }
  o.innerHTML = '';
  if (!gamePaused) {
    gamePaused = true;
    // entering: pause the game canvas (no rendering behind the dialog), hide it from VoiceOver
    lastFocus = document.activeElement as HTMLElement | null;
    setBackgroundInert(true);
    nav.game?.app.stop();
    document.addEventListener('keydown', onKey);
  }
  o.hidden = false;
  return o;
}

let lastFocus: HTMLElement | null = null;
let gamePaused = false;
function setBackgroundInert(on: boolean) {
  for (const id of ['app', 'boot']) {
    const e = document.getElementById(id);
    if (e) e.inert = on;
  }
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeParent();
}
function focusFirst(o: HTMLElement) {
  const t = o.querySelector<HTMLElement>('h1, .q');
  if (t) {
    t.tabIndex = -1;
    t.focus();
  }
}

export function closeParent() {
  const o = document.getElementById('parent');
  if (o) o.hidden = true;
  parentOpen = false;
  gamePaused = false;
  setBackgroundInert(false);
  document.removeEventListener('keydown', onKey);
  nav.game?.app.start();
  lastFocus?.focus?.();
}

export function openParent() {
  voice.cancel();
  parentOpen = true;
  const o = overlay();
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 12 + Math.floor(Math.random() * 8);
  let entry = '';
  const box = el('div', { class: 'gate' });
  const close = el('button', { class: 'x', 'aria-label': '닫기' }, '✕');
  close.onclick = closeParent;
  const q = el('p', { class: 'q' }, `보호자 확인: ${b} × ${a} = ?`);
  const hint = el('p', { class: 'hint', role: 'status' }, '어른만 들어갈 수 있어요. 답을 입력하세요.');
  const disp = el('output', { class: 'disp', 'aria-live': 'polite' }, '');
  const pad = el('div', { class: 'pad' });
  const now = Date.now();
  if (now < getLock()) {
    hint.textContent = `잠시 후 다시 시도하세요 (${Math.ceil((getLock() - now) / 1000)}초)`;
  }
  const submit = () => {
    if (Date.now() < getLock()) return;
    if (Number(entry) === a * b) {
      gateFails = 0;
      dashboard();
    } else {
      gateFails++;
      entry = '';
      disp.textContent = '';
      hint.textContent = '다시 한 번 계산해 주세요.';
      if (gateFails >= 3) {
        setLock(Date.now() + 30_000);
        gateFails = 0;
        hint.textContent = '30초 뒤에 다시 시도하세요.';
      }
    }
  };
  for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '확인']) {
    const btn = el('button', { class: k === '확인' ? 'ok' : '', 'aria-label': k === '⌫' ? '지우기' : k }, k);
    btn.onclick = () => {
      if (k === '⌫') entry = entry.slice(0, -1);
      else if (k === '확인') return submit();
      else if (entry.length < 4) entry += k;
      disp.textContent = entry;
    };
    pad.append(btn);
  }
  box.append(close, q, hint, disp, pad);
  o.append(box);
  focusFirst(o);
}

function section(title: string, ...kids: (Node | string)[]) {
  return el('section', {}, el('h2', {}, title), ...kids);
}

function speakBtn(id: string, label: string) {
  const b = el('button', { class: 'say', 'aria-label': `${label} 듣기` }, '🔊');
  b.onclick = () => void voice.sayNow(id);
  return b;
}

function dashboard() {
  const o = overlay();
  const s = store.save;
  const wrap = el('div', { class: 'dash' });
  const close = el('button', { class: 'x', 'aria-label': '닫기' }, '✕');
  close.onclick = closeParent;
  wrap.append(close, el('h1', {}, '🌙 별빛 정원 — 보호자 화면'));

  // 오늘
  const t = todaySummary(s);
  wrap.append(
    section(
      '오늘 한 것',
      el(
        'ul',
        { class: 'stats' },
        el('li', {}, `진행: ${Math.min(t.playDay, 30)} / 30일째${t.playDay > 30 ? ' (복습 정원)' : ''}`),
        el('li', {}, `오늘 플레이: ${t.minutes}분 / 제한 ${s.settings.dailyMinutes}분`),
        el('li', {}, `정거장: ${t.stationsDone} / ${t.stationsTotal}`),
        el('li', {}, `오늘 정답 ${t.correct} · 다시 해보기 ${t.wrong}`),
        el('li', {}, `만난 친구: ${s.friendsMet.length}마리 · 모은 별빛: ${s.starlightTotal}`),
      ),
    ),
  );

  // 정답률
  const acc = el('div', { class: 'bars' });
  for (const g of gameAccuracy(s)) {
    const pct = g.rate === null ? null : Math.round(g.rate * 100);
    const bar = el('div', { class: 'bar' }, el('span', { style: `width:${pct ?? 0}%` }));
    acc.append(
      el(
        'div',
        { class: 'row' },
        el('span', {}, GAME_NAMES[g.game]),
        bar,
        el('b', {}, pct === null ? '—' : `${pct}%`),
      ),
    );
  }
  wrap.append(section('게임별 정답률 (목표 70~85%: 적응형 난이도가 자동 조절)', acc));

  // 헷갈린 단어
  const conf = confusedTop(s, 5);
  const confList = el('ol', {});
  for (const c of conf)
    confList.append(
      el(
        'li',
        {},
        speakBtn(vid.word(c.id), c.word.en),
        ` ${c.word.en} — ${c.word.ko} (더 들어볼 말 · ${c.wrong}번 다시 들음)`,
      ),
    );
  wrap.append(
    section(
      '더 들어볼 말 Top 5 (퀴즈 대신 놀이로 한 번 써 봐 주세요)',
      conf.length ? confList : el('p', {}, '아직 없어요. 잘하고 있어요!'),
    ),
  );

  // 단어
  const lw = learnedWords(s);
  const wl = el('div', { class: 'words' });
  for (const w of lw) {
    wl.append(
      el(
        'div',
        { class: 'w' },
        speakBtn(vid.word(w.id), w.en),
        el('b', {}, w.en),
        el('span', {}, `${w.ko} · D${w.day} · ${w.exposures}회`),
      ),
    );
  }
  const printBtn = el('button', { class: 'wide' }, '🖨️ 인쇄용 단어 카드 만들기 (PDF로 저장 가능)');
  printBtn.onclick = () =>
    printWordCards(lw.length ? lw.map((w) => w.id) : allWords.slice(0, 10).map((w) => w.id));
  wrap.append(section(`배운 영어 단어 (${lw.length} / 150)`, printBtn, wl));

  // 문장
  const pl = el('ul', { class: 'sents' });
  for (const p of learnedPatterns(s))
    pl.append(
      el('li', {}, speakBtn(vid.sentence(p.example), p.example), ` D${p.day} ${p.frame} — 예: ${p.example}`),
    );
  wrap.append(section('배운 문장 패턴', pl));

  // 설정
  const set = el('div', { class: 'settings' });
  const minutes = el('select', { 'aria-label': '하루 제한 시간' });
  for (const m of [10, 15, 20, 30]) {
    const op = el('option', { value: String(m) }, `${m}분`);
    if (m === s.settings.dailyMinutes) op.setAttribute('selected', '');
    minutes.append(op);
  }
  minutes.onchange = () =>
    store.update((x) => ({
      ...x,
      settings: { ...x.settings, dailyMinutes: Number((minutes as HTMLSelectElement).value) },
    }));
  set.append(el('label', {}, '하루 제한 시간 ', minutes));

  const musicBox = el('input', { type: 'checkbox' }) as HTMLInputElement;
  musicBox.checked = s.settings.musicOn;
  musicBox.onchange = () => {
    store.update((x) => ({ ...x, settings: { ...x.settings, musicOn: musicBox.checked } }));
    music.setEnabled(musicBox.checked);
  };
  set.append(el('label', {}, musicBox, ' 배경 음악'));

  const recBox = el('input', { type: 'checkbox' }) as HTMLInputElement;
  recBox.checked = s.settings.recordingEnabled;
  recBox.disabled = !canRecord();
  recBox.onchange = async () => {
    if (recBox.checked) {
      try {
        // ask for mic permission now, while the adult is here
        const st = await navigator.mediaDevices.getUserMedia({ audio: true });
        st.getTracks().forEach((tr) => tr.stop());
      } catch {
        recBox.checked = false;
        alert('마이크 권한이 없어 녹음을 켤 수 없어요. 따라 말하기는 녹음 없이 계속할 수 있어요.');
      }
    } else {
      const n = (await listRecordings()).length;
      if (n && confirm(`저장된 녹음 ${n}개도 지울까요?`)) {
        await clearRecordings();
        void loadRecs();
      }
    }
    store.update((x) => ({ ...x, settings: { ...x.settings, recordingEnabled: recBox.checked } }));
  };
  set.append(
    el(
      'label',
      {},
      recBox,
      ` 따라 말하기 녹음 켜기 ${canRecord() ? '' : '(이 기기/브라우저에서는 사용 불가)'}`,
    ),
  );
  set.append(
    el('p', { class: 'note' }, '녹음은 이 기기에만 저장되며 채점하지 않고, 절대 외부로 전송되지 않아요.'),
  );

  const ret = el('select', { 'aria-label': '녹음 보관 기간' });
  for (const [v, label] of [
    ['session', '앱을 닫았다 켜면 삭제'],
    ['1d', '1일 뒤 삭제'],
    ['7d', '7일 뒤 삭제'],
    ['manual', '직접 삭제할 때까지'],
  ] as const) {
    const op = el('option', { value: v }, label);
    if (v === s.settings.recordingRetention) op.setAttribute('selected', '');
    ret.append(op);
  }
  ret.onchange = () => {
    const r = (ret as HTMLSelectElement).value as Retention;
    store.update((x) => ({ ...x, settings: { ...x.settings, recordingRetention: r } }));
    void applyRetention(r, Date.now());
  };
  set.append(el('label', {}, '녹음 보관 ', ret));
  const recList = el('div', { class: 'recs' });
  const loadRecs = async () => {
    recList.innerHTML = '';
    const rows = await listRecordings();
    if (!rows.length) recList.append(el('p', { class: 'note' }, '저장된 녹음이 없어요.'));
    else {
      const kb = Math.round(rows.reduce((a, r) => a + r.blob.size, 0) / 1024);
      recList.append(
        el('p', { class: 'note' }, `저장된 녹음 ${rows.length}개 · 약 ${kb}KB (최근 20개 표시)`),
      );
    }
    for (const r of rows.slice(-20).reverse()) {
      const b = el('button', {}, `▶ ${new Date(r.at).toLocaleString('ko-KR')} — ${r.sentence}`);
      b.onclick = () => void playBlob(r.blob);
      const del = el('button', { class: 'danger', 'aria-label': '이 녹음 삭제' }, '🗑️');
      del.onclick = async () => {
        await deleteRecording(r.id!);
        void loadRecs();
      };
      recList.append(el('div', { class: 'rec' }, b, del));
    }
  };
  void loadRecs();
  const delRec = el('button', { class: 'danger' }, '🗑️ 녹음 전체 삭제');
  delRec.onclick = async () => {
    if (confirm('저장된 녹음을 모두 삭제할까요?')) {
      await clearRecordings();
      void loadRecs();
    }
  };
  set.append(recList, delRec);
  wrap.append(section('설정', set));

  // 음성
  const vi = voice.voiceInfo();
  const vt = el('button', {}, '🔊 음성 테스트');
  vt.onclick = () => void voice.sayNow(vid.ko('welcome.today')).then(() => voice.say(vid.greet('sami')));
  wrap.append(
    section(
      '음성',
      el('p', {}, '영어: 게임에 들어 있는 녹음(오프라인에서도 재생) · 한국어: ' + vi.ko + ' (기기 음성)'),
      el(
        'p',
        { class: 'note' },
        '영어 음성 출처: Piper 음성 합성(MIT)과 LibriTTS 데이터(CC BY 4.0, openslr.org/60)로 만든 녹음입니다. 원어민 녹음으로 바꿀 수 있어요.',
      ),
      vt,
      el(
        'p',
        { class: 'note' },
        '더 자연스러운 목소리: iPhone 설정 → 손쉬운 사용 → 읽기 및 말하기 → 음성에서 "Samantha(향상됨)"와 "유나(향상됨)"를 내려받으세요. 무음 스위치가 켜져 있으면 소리가 작거나 안 들릴 수 있어요.',
      ),
    ),
  );

  // 백업
  const exp = el('button', {}, '💾 진도 백업 파일 저장');
  exp.onclick = () => {
    const blob = new Blob([exportBackup(store.save, Date.now())], { type: 'application/json' });
    const a = el('a', {
      href: URL.createObjectURL(blob),
      download: `starlight-garden-${new Date().toISOString().slice(0, 10)}.json`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.getAttribute('href')!), 1000);
  };
  const imp = el('input', {
    type: 'file',
    accept: 'application/json,.json',
    'aria-label': '백업 파일 불러오기',
  }) as HTMLInputElement;
  imp.onchange = async () => {
    const f = imp.files?.[0];
    if (!f) return;
    const r = importBackup(await f.text(), Date.now());
    if (!r.ok) return alert('백업 파일을 읽을 수 없어요.');
    if (confirm(`${r.save.playDay}일째 진도로 되돌릴까요?`)) {
      // a backup never switches recording on by itself (mic permission belongs to this device's adult)
      store.update(() => ({ ...r.save, settings: { ...r.save.settings, recordingEnabled: false } }));
      await store.flush();
      alert('진도를 불러왔어요. 녹음 기능은 필요하면 다시 켜 주세요.');
      location.reload();
    }
  };
  wrap.append(
    section(
      '백업 · 홈 화면',
      el(
        'p',
        { class: 'note' },
        'Safari에서는 7일 넘게 열지 않으면 저장된 진도가 지워질 수 있어요. 공유 버튼 → "홈 화면에 추가"로 설치하면 안전하고 전체 화면으로 즐길 수 있어요.',
      ),
      exp,
      el(
        'p',
        { class: 'note' },
        '백업 파일에는 학습 진도와 날짜만 들어 있고, 이름이나 녹음은 들어 있지 않아요.',
      ),
      el('label', {}, '백업 불러오기 ', imp),
    ),
  );

  // 초기화
  const reset = el('button', { class: 'danger' }, '진도 처음부터 다시 시작');
  reset.onclick = async () => {
    if (!confirm('정말 모든 진도를 지우고 1일째부터 다시 시작할까요?')) return;
    if (!confirm('한 번 더 확인할게요. 되돌릴 수 없어요.')) return;
    await wipeAll();
    store.update(() => createSave(Date.now()));
    await store.flush();
    location.reload();
  };
  wrap.append(section('진도 초기화', reset));
  wrap.append(
    section(
      '개인정보',
      el(
        'p',
        { class: 'note' },
        '이 앱은 광고, 결제, 외부 링크, 채팅, 분석 도구가 없고 어떤 정보도 기기 밖으로 보내지 않아요. 모든 기록은 이 기기의 앱 저장소에만 있고, 앱을 지우면 함께 지워져요.',
      ),
      privacyPolicy(),
      el(
        'p',
        { class: 'note' },
        `오늘 기준 학습일: ${curriculumDay(s)}일 · 오늘의 단어: ${allWords
          .filter((w) => w.day === curriculumDay(s))
          .map((w) => getWord(w.id).en)
          .join(', ')}`,
      ),
    ),
  );
  o.append(wrap);
  focusFirst(o);
}

/** Full privacy policy, shown in-app (no external link needed). */
function privacyPolicy(): HTMLElement {
  const d = el(
    'details',
    { class: 'policy' },
    el('summary', {}, `📄 ${privacy.title} (${privacy.effective})`),
  );
  for (const [h, p] of privacy.sections) d.append(el('h3', {}, h!), el('p', { class: 'note' }, p!));
  return d;
}
