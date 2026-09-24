# CLAUDE.md — Starlight Garden (별빛 정원)

만 7세 한국 유치원생용 30일 학습 게임. 한글·수·사고력 + 영어(단어 150 / 문장 패턴 30 / 파닉스 A~Z).
iPhone/iPad Safari PWA 우선, 이후 Capacitor로 App Store Kids 카테고리 제출.
설계의 단일 기준: `docs/GDD.md`. 콘텐츠의 단일 기준: `src/data/*.json`.

## Commands (Stage 1 이후 유효)

```bash
npm run dev            # Vite 개발 서버
npm run build          # 타입체크 + 프로덕션 빌드
npm test               # Vitest
npm run test:cov       # 커버리지 (src/core ≥ 90%)
npm run lint           # ESLint
npm run format         # Prettier
npm run validate:data  # JSON 스키마 + 커리큘럼 불변식 검사
npm run gen:levels     # 게임별 레벨 JSON 생성 (각 30+)
npm run simulate       # 가상 아이 3명 × 30일 밸런스 리포트
```

## Architecture rules

- `src/core/` 는 **순수 TypeScript**. DOM, Pixi, Web Audio, IndexedDB import 금지. 시간·난수는 주입(`time.ts`, `rng.ts`)해서 테스트 결정적으로.
- 각 미니게임 = `games/<name>/logic.ts`(순수, 테스트 필수) + `view.ts`(Pixi). 문제 생성·정답 판정·힌트 단계는 logic에.
- 모든 콘텐츠(단어·문장·친구·레벨·칭찬·음성 문구)는 JSON. 코드에 학습 문자열 하드코딩 금지.
- 모든 음성은 `audio-manifest.json`의 ID로 호출. 녹음 파일이 있으면 파일, 없으면 Web Speech 폴백(en-US rate 0.8 / ko-KR).
- 세이브 스키마 변경 시 `schemaVersion` 증가 + `storage/migrations.ts`에 마이그레이션 + 테스트.
- 런타임 의존성 최소화: `pixi.js`, `idb` 외 추가 전에 이유를 PR/커밋에 남길 것. `zod`는 테스트·스크립트 전용.

## Child UX rules (위반 = 버그)

- 글을 못 읽어도 플레이 가능: 모든 지시는 **한국어 음성 + 아이콘**. 좌상단 귀 버튼으로 언제든 다시 듣기.
- 터치 히트박스 ≥ 64px, 드래그 스냅 반경 96px, 탭·한 손가락 드래그 외 제스처 금지.
- 실패 화면·감점·타이머 압박 없음. 오답 2회 → 힌트(재청취 + 정답 반짝임), 3회 → 같이 하기.
- 적응형: 게임별 최근 10문제 정답률 70~85% 유지. 한 판의 새 영어 단어 ≤ 30%.
- 한국어 문구는 짧고 다정한 반말("잘했어!", "같이 해볼까?"). 영어 칭찬은 로테이션, 같은 칭찬 연속 금지.
- 영어 학습 음성은 한국어 지시와 겹치지 않게 큐 직렬화(지시 종료 + 250ms).
- 영어 철자 쓰기 요구 금지. 따라 말하기는 녹음 → 다시 듣기만, 채점 금지.

## Privacy & store rules (Kids category)

- 광고, 인앱결제, 외부 링크, 채팅, 분석 SDK, 네트워크 요청 **금지**. 저장은 기기 로컬(IndexedDB)만.
- 녹음은 기본 OFF, 부모 게이트 뒤에서만 켬. 기기 밖으로 절대 전송하지 않음.
- 부모 게이트(어른용 곱셈) 뒤에만: 설정, 진도 초기화, 백업, 녹음 관리, 인쇄용 카드.
- 캐릭터·배경은 전부 코드 드로잉 오리지널. 기존 IP와 닮은 이름·실루엣 금지(GDD §8.4).

## Workflow

- Stage 단위 진행(GDD 참조). **각 Stage 끝에서 멈추고 사용자 승인**을 받는다.
- 코어 로직은 TDD: 실패하는 테스트 → 구현 → 리팩터.
- 의미 단위 커밋. 메시지는 `feat(core): ...`, `test(srs): ...`, `docs(gdd): ...` 형식.
- 불확실하면 추측하지 말고 질문한다.
