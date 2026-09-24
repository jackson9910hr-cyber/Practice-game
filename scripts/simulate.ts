/** Stage 4 balance report: 3 virtual children × 30 play days → docs/simulation.md */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { KIDS, simulateAll, simulateKid, wordLabel } from '../src/core/simulate';
import { words } from '../src/core/content';

const results = simulateAll();
const lines: string[] = [];
const P = (s = '') => lines.push(s);
P('# 밸런스 시뮬레이션 리포트 (Stage 4)');
P();
P(
  '> `npm run simulate`로 재생성. 실제 스케줄러·라운드 생성기·게임 로직·적응형 난이도·간격 반복 코드를 그대로 사용해 가상 아이 3명이 하루 15분씩 30일을 플레이한 결과입니다.',
);
P();
P('## 요약');
P();
P(
  '| 아이 | 첫 시도 정답률 | 평균 플레이(분) | 정거장 완료 | 단어 노출 최소 / 중앙값 | 노출 5회 미만 단어 | 놓친 복습 | 막힌 날 | 지루한 날 |',
);
P('|---|---|---|---|---|---|---|---|---|');
for (const r of results) {
  const tot = r.days.reduce((a, d) => ({ c: a.c + d.correct, w: a.w + d.wrong }), { c: 0, w: 0 });
  const ex = Object.values(r.exposures).sort((a, b) => a - b);
  const planned = r.days.reduce((a, d) => a + d.planned, 0);
  const done = r.days.reduce((a, d) => a + d.done, 0);
  const avgMin = r.days.reduce((a, d) => a + d.minutes, 0) / r.days.length;
  const under5 = Object.entries(r.exposures).filter(([, n]) => n < 5);
  P(
    `| ${r.kid.name} | ${Math.round((tot.c / (tot.c + tot.w)) * 100)}% | ${avgMin.toFixed(1)} | ${done}/${planned} | ${ex[0]} / ${ex[Math.floor(ex.length / 2)]} | ${under5.length} | ${r.missedReviews.length} | ${r.days.filter((d) => d.stuck.length).length} | ${r.days.filter((d) => d.bored.length).length} |`,
  );
}
P();
// robustness: the same metrics averaged over 10 random seeds
P();
P('### 10개 시드 평균 (우연 효과 제거)');
P();
P(
  '| 아이 | 첫 시도 정답률 | 평균 플레이(분) | 노출 최소(최악 시드) | 노출 5회 미만 단어(평균) | 놓친 복습(평균) | 막힌 날(평균) | 지루한 날(평균) |',
);
P('|---|---|---|---|---|---|---|---|');
KIDS.forEach((kid, k) => {
  const runs = Array.from({ length: 10 }, (_, i) => simulateKid(kid, 100 + i * 17 + k));
  const avg = (f: (r: (typeof runs)[number]) => number) => runs.reduce((a, r) => a + f(r), 0) / runs.length;
  const acc = avg((r) => {
    const t = r.days.reduce((a, d) => ({ c: a.c + d.correct, w: a.w + d.wrong }), { c: 0, w: 0 });
    return t.c / (t.c + t.w);
  });
  const minEx = Math.min(...runs.map((r) => Math.min(...Object.values(r.exposures))));
  P(
    `| ${kid.name} | ${Math.round(acc * 100)}% | ${avg((r) => r.days.reduce((a, d) => a + d.minutes, 0) / r.days.length).toFixed(1)} | ${minEx} | ${avg((r) => Object.values(r.exposures).filter((n) => n < 5).length).toFixed(1)} | ${avg((r) => r.missedReviews.length).toFixed(1)} | ${avg((r) => r.days.filter((d) => d.stuck.length).length).toFixed(1)} | ${avg((r) => r.days.filter((d) => d.bored.length).length).toFixed(1)} |`,
  );
});
P();
P(
  '- **첫 시도 정답률**: 적응형 난이도 목표(70~85%) 안에 있는지 확인. 힌트·같이 하기 후 정답은 분모에 "다시 해보기"로 포함.',
);
P('- **놓친 복습**: 1·3·7일 복습이 30일 안에 한 번도 게임에서 나오지 않은 (단어, 간격) 쌍의 수.');
P(
  '- **막힌 날**: 같은 게임·단계에서 첫 시도 정답률 60% 미만이 2회 연속이거나, 시간 부족으로 정거장을 못 끝낸 날. (힌트·같이 하기가 있어 실패 화면은 없음)',
);
P(
  '- **지루한 날**: 같은 게임·단계에서 95% 이상이 3회 연속(적응형이 도전을 못 주는 정체) 이거나, 어제와 정거장 구성이 같은 날.',
);
for (const r of results) {
  P();
  P(`## ${r.kid.name} — 일별`);
  P();
  P('| 일 | 분 | 정거장 | 정답/재시도 | 구성 | 막힘 | 지루함 |');
  P('|---|---|---|---|---|---|---|');
  for (const d of r.days)
    P(
      `| D${d.day} | ${d.minutes} | ${d.done}/${d.planned} | ${d.correct}/${d.wrong} | ${d.lineup} | ${d.stuck.join(', ')} | ${d.bored.join(', ')} |`,
    );
  P();
  P(
    '최종 적응형 레벨: ' +
      Object.entries(r.finalLevels)
        .map(([k, v]) => `${k}=${v}`)
        .join(', '),
  );
  const low = Object.entries(r.exposures)
    .filter(([, n]) => n < 5)
    .map(([id]) => wordLabel(id));
  P();
  P(`노출 5회 미만: ${low.length ? low.join(', ') : '없음 ✅'}`);
  if (r.missedReviews.length)
    P(
      `놓친 복습: ${r.missedReviews
        .slice(0, 30)
        .map((m) => `${wordLabel(m.word)}+${m.offset}`)
        .join(', ')}${r.missedReviews.length > 30 ? ' …' : ''}`,
    );
}
P();
P('## 단어별 노출 횟수 (보통 아이)');
P();
const normal = results[1]!;
P('| 일 | 단어 (노출 횟수) |');
P('|---|---|');
for (let d = 1; d <= 30; d++)
  P(
    `| D${d} | ${words
      .filter((w) => w.day === d)
      .map((w) => `${w.en} ${normal.exposures[w.id]}`)
      .join(' · ')} |`,
  );
writeFileSync(join(import.meta.dirname, '..', 'docs', 'simulation.md'), lines.join('\n') + '\n');
console.log(lines.slice(0, 12).join('\n'));
