# 🌟 별빛 정원 · Starlight Garden

만 7세 한국 어린이를 위한 **30일 학습 게임**(PWA)입니다. 하루 10~15분, 매일 새 정원 친구가 찾아와 한글·수·사고력과 영어(단어 150개 · 문장 패턴 30개 · 파닉스 A~Z)를 가르쳐 줍니다.

- 광고·결제·외부 링크·채팅·데이터 수집이 **없습니다**. 모든 기록은 기기에만 저장됩니다.
- 글을 못 읽어도 할 수 있습니다: 모든 지시는 한국어 음성과 아이콘으로 나옵니다.
- 틀려도 실패 화면이 없습니다: 2번 틀리면 힌트, 3번 틀리면 같이 풀어 줍니다.

## 바로 해보기 (iPhone / iPad)

1. Safari로 배포 주소를 엽니다(GitHub Pages).
2. **공유 → 홈 화면에 추가**를 누릅니다. 전체 화면으로 실행되고, 7일 넘게 열지 않아도 진도가 지워지지 않습니다.
3. 별을 누르면 시작합니다. 소리가 안 들리면 무음 스위치를 확인하세요.
4. 보호자 메뉴는 정원 화면 오른쪽 위 ⚙️에 있고, 곱셈 문제를 풀어야 들어갈 수 있습니다.

## 개발

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # Vitest (코어 로직 커버리지 ≥ 90%)
npm run check          # lint + format + 데이터 검증 + 커버리지 + 빌드
npm run simulate       # 가상 아이 3명 × 30일 → docs/simulation.md
npm run gen:levels     # 게임별 32단계 난이도 JSON 생성
npm run gen:audio      # 음성 매니페스트 재생성 (녹음 파일 경로는 보존)
```

## 구조

| 경로                | 내용                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/core/`         | 순수 TS 로직: 적응형 난이도, 간격 반복(1·3·7일), 플레이일 진행, 스케줄러, 시뮬레이터                                    |
| `src/data/`         | 커리큘럼·단어·문장·친구·파닉스·한글·챈트·음성 문구 JSON (단일 진실 원천)                                                |
| `src/games/<게임>/` | `logic.ts`(순수, 테스트) + `view.ts`(PixiJS)                                                                            |
| `src/scenes/`       | 정원 허브, 친구 등장, 잘 자 인사, 도감, 챈트, 챕터 전환, 피날레                                                         |
| `src/audio/`        | Web Audio 효과음·음악, 음성 큐(녹음 파일 → Web Speech 폴백), 따라 말하기 녹음                                           |
| `src/ui/`           | 보호자 게이트·대시보드·인쇄용 단어 카드 (DOM)                                                                           |
| `docs/`             | [GDD](docs/GDD.md) · [시뮬레이션](docs/simulation.md) · [iOS/앱스토어](docs/ios.md) · [원어민 녹음 교체](docs/audio.md) |

## 배포

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 테스트 후 빌드해 `gh-pages` 브랜치로 배포합니다 (Settings → Pages → Deploy from a branch → `gh-pages` / root). 주소: https://jackson9910hr-cyber.github.io/Practice-game/
