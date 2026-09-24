# 밸런스 시뮬레이션 리포트 (Stage 4)

> `npm run simulate`로 재생성. 실제 스케줄러·라운드 생성기·게임 로직·적응형 난이도·간격 반복 코드를 그대로 사용해 가상 아이 3명이 하루 15분씩 30일을 플레이한 결과입니다.

## 요약

| 아이 | 첫 시도 정답률 | 평균 플레이(분) | 정거장 완료 | 단어 노출 최소 / 중앙값 | 노출 5회 미만 단어 | 놓친 복습 | 막힌 날 | 지루한 날 |
|---|---|---|---|---|---|---|---|---|
| 빠른 아이 | 82% | 8.7 | 146/146 | 6 / 8 | 0 | 8 | 0 | 17 |
| 보통 아이 | 77% | 10.7 | 146/146 | 5 / 8 | 0 | 15 | 2 | 7 |
| 느린 아이 | 70% | 13.7 | 144/146 | 5 / 8 | 0 | 38 | 7 | 4 |


### 10개 시드 평균 (우연 효과 제거)

| 아이 | 첫 시도 정답률 | 평균 플레이(분) | 노출 최소(최악 시드) | 노출 5회 미만 단어(평균) | 놓친 복습(평균) | 막힌 날(평균) | 지루한 날(평균) |
|---|---|---|---|---|---|---|---|
| 빠른 아이 | 83% | 8.6 | 5 | 0.0 | 4.4 | 0.3 | 11.1 |
| 보통 아이 | 78% | 10.7 | 5 | 0.0 | 11.9 | 1.3 | 3.6 |
| 느린 아이 | 70% | 13.7 | 5 | 0.0 | 22.6 | 6.0 | 2.1 |

- **첫 시도 정답률**: 적응형 난이도 목표(70~85%) 안에 있는지 확인. 힌트·같이 하기 후 정답은 분모에 "다시 해보기"로 포함.
- **놓친 복습**: 1·3·7일 복습이 30일 안에 한 번도 게임에서 나오지 않은 (단어, 간격) 쌍의 수.
- **막힌 날**: 같은 게임·단계에서 첫 시도 정답률 60% 미만이 2회 연속이거나, 시간 부족으로 정거장을 못 끝낸 날. (힌트·같이 하기가 있어 실패 화면은 없음)
- **지루한 날**: 같은 게임·단계에서 95% 이상이 3회 연속(적응형이 도전을 못 주는 정체) 이거나, 어제와 정거장 구성이 같은 날.

## 빠른 아이 — 일별

| 일 | 분 | 정거장 | 정답/재시도 | 구성 | 막힘 | 지루함 |
|---|---|---|---|---|---|---|
| D1 | 4.9 | 2/2 | 11/3 | word-garden:1 sound-butterfly:1 |  |  |
| D2 | 7 | 4/4 | 25/2 | word-garden:1 hangul-pieces:1 sound-butterfly:1 word-garden:1 |  |  |
| D3 | 8.1 | 5/5 | 24/6 | word-garden:1 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D4 | 8.1 | 5/5 | 25/6 | word-garden:2 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D5 | 8.3 | 5/5 | 29/4 | word-garden:2 pattern-path:1 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D6 | 7.6 | 5/5 | 27/2 | word-garden:2 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D7 | 8.5 | 5/5 | 17/8 | chant:0 word-garden:2 pattern-path:1 word-garden:1 sentence-train:1 |  |  |
| D8 | 8.7 | 5/5 | 33/4 | word-garden:2 number-fireflies:1 sound-butterfly:2 word-garden:1 sentence-train:1 |  |  |
| D9 | 8.8 | 5/5 | 29/6 | word-garden:2 hangul-pieces:2 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D10 | 8.4 | 5/5 | 33/2 | word-garden:3 number-fireflies:1 sound-butterfly:2 word-garden:2 sentence-train:1 |  | sentence-train:1 100%×3 |
| D11 | 8.5 | 5/5 | 30/5 | word-garden:3 pattern-path:2 sound-butterfly:1 word-garden:1 sentence-train:1 |  | sentence-train:1 100%×3 |
| D12 | 8.7 | 5/5 | 28/7 | word-garden:3 number-fireflies:2 sound-butterfly:2 word-garden:2 sentence-train:1 |  | sentence-train:1 100%×3 |
| D13 | 8.7 | 5/5 | 24/9 | word-garden:3 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:2 |  | hangul-pieces:1 100%×3 |
| D14 | 8.7 | 5/5 | 25/4 | chant:0 word-garden:3 pattern-path:3 word-garden:2 sentence-train:1 |  | sentence-train:1 100%×3 |
| D15 | 8 | 5/5 | 29/3 | word-garden:3 ant-path:1 sound-butterfly:3 word-garden:1 sentence-train:2 |  | word-garden:3 100%×3 |
| D16 | 8.9 | 5/5 | 29/6 | word-garden:3 pattern-path:4 sound-butterfly:2 word-garden:2 sentence-train:1 |  | sentence-train:1 100%×3 |
| D17 | 8.8 | 5/5 | 29/7 | word-garden:3 number-fireflies:3 sound-butterfly:3 word-garden:1 sentence-train:2 |  |  |
| D18 | 8.5 | 5/5 | 30/5 | word-garden:3 hangul-pieces:3 sound-butterfly:2 word-garden:2 sentence-train:1 |  | sentence-train:1 100%×3 |
| D19 | 8.7 | 5/5 | 24/10 | word-garden:3 ant-path:2 sound-butterfly:3 word-garden:1 sentence-train:2 |  | sentence-train:2 100%×3 |
| D20 | 8.7 | 5/5 | 29/6 | word-garden:3 number-fireflies:1 sound-butterfly:2 word-garden:2 sentence-train:3 |  | number-fireflies:1 100%×3 |
| D21 | 8.7 | 5/5 | 25/4 | chant:0 word-garden:3 hangul-pieces:2 word-garden:1 sentence-train:1 |  | sentence-train:1 100%×3 |
| D22 | 8.2 | 5/5 | 30/3 | word-garden:3 ant-path:3 sound-butterfly:3 word-garden:2 sentence-train:3 |  |  |
| D23 | 8.8 | 5/5 | 31/5 | word-garden:3 number-fireflies:4 sound-butterfly:2 word-garden:1 sentence-train:1 |  | sentence-train:1 100%×3 |
| D24 | 9.4 | 5/5 | 31/9 | word-garden:4 pattern-path:3 sound-butterfly:3 word-garden:1 sentence-train:3 |  | sentence-train:3 100%×3 |
| D25 | 9.3 | 5/5 | 31/8 | word-garden:4 hangul-pieces:3 sound-butterfly:4 word-garden:2 sentence-train:1 |  | sentence-train:1 100%×3 |
| D26 | 9.2 | 5/5 | 32/7 | word-garden:4 number-fireflies:1 sound-butterfly:2 word-garden:1 sentence-train:4 |  | number-fireflies:1 100%×3 |
| D27 | 10.3 | 6/6 | 29/9 | medley:0 word-garden:4 ant-path:2 sound-butterfly:4 word-garden:2 sentence-train:1 |  | sentence-train:1 100%×3 |
| D28 | 9.4 | 5/5 | 24/8 | chant:0 word-garden:4 hangul-pieces:2 word-garden:1 sentence-train:4 |  |  |
| D29 | 10.5 | 5/5 | 39/9 | word-garden:4 sound-butterfly:1 word-garden:2 sentence-train:3 number-fireflies:4 |  | sentence-train:3 100%×3 |
| D30 | 11.2 | 4/4 | 25/11 | word-garden:4 word-garden:1 sentence-train:4 finale:0 |  |  |

최종 적응형 레벨: word-garden:1=25, sound-butterfly:1=16, hangul-pieces:1=7, sentence-train:1=22, word-garden:2=20, pattern-path:1=4, number-fireflies:1=9, sound-butterfly:2=14, hangul-pieces:2=5, word-garden:3=16, pattern-path:2=4, number-fireflies:2=5, sentence-train:2=9, pattern-path:3=6, ant-path:1=1, sound-butterfly:3=12, pattern-path:4=4, number-fireflies:3=5, hangul-pieces:3=7, ant-path:2=1, sentence-train:3=9, ant-path:3=1, number-fireflies:4=6, word-garden:4=14, sound-butterfly:4=10, sentence-train:4=6

노출 5회 미만: 없음 ✅
놓친 복습: sunny(D20)+7, hot(D21)+7, cold(D21)+7, run(D22)+7, walk(D22)+7, swim(D22)+7, fly(D22)+7, box(D28)+1

## 보통 아이 — 일별

| 일 | 분 | 정거장 | 정답/재시도 | 구성 | 막힘 | 지루함 |
|---|---|---|---|---|---|---|
| D1 | 6 | 2/2 | 8/6 | word-garden:1 sound-butterfly:1 |  |  |
| D2 | 8.9 | 4/4 | 22/5 | word-garden:1 hangul-pieces:1 sound-butterfly:1 word-garden:1 |  |  |
| D3 | 10.3 | 5/5 | 20/10 | word-garden:1 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D4 | 10.4 | 5/5 | 26/7 | word-garden:2 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D5 | 9.9 | 5/5 | 28/4 | word-garden:2 pattern-path:1 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D6 | 10.1 | 5/5 | 21/8 | word-garden:2 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D7 | 10.6 | 5/5 | 21/7 | chant:0 word-garden:2 pattern-path:1 word-garden:1 sentence-train:1 |  |  |
| D8 | 11.2 | 5/5 | 28/9 | word-garden:2 number-fireflies:1 sound-butterfly:2 word-garden:1 sentence-train:1 |  |  |
| D9 | 11.4 | 5/5 | 24/12 | word-garden:2 hangul-pieces:2 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D10 | 10.7 | 5/5 | 26/8 | word-garden:3 number-fireflies:1 sound-butterfly:2 word-garden:2 sentence-train:1 |  |  |
| D11 | 10.8 | 5/5 | 25/9 | word-garden:3 pattern-path:2 sound-butterfly:1 word-garden:1 sentence-train:1 |  | sentence-train:1 100%×3 |
| D12 | 10.9 | 5/5 | 25/9 | word-garden:3 number-fireflies:2 sound-butterfly:2 word-garden:2 sentence-train:1 |  |  |
| D13 | 10.4 | 5/5 | 25/8 | word-garden:3 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:2 |  |  |
| D14 | 10.3 | 5/5 | 21/7 | chant:0 word-garden:3 pattern-path:3 word-garden:2 sentence-train:1 |  |  |
| D15 | 10.3 | 5/5 | 25/7 | word-garden:3 ant-path:1 sound-butterfly:3 word-garden:1 sentence-train:2 |  |  |
| D16 | 11.1 | 5/5 | 24/10 | word-garden:3 pattern-path:4 sound-butterfly:2 word-garden:2 sentence-train:1 | sentence-train:1 33→33% |  |
| D17 | 10.8 | 5/5 | 27/7 | word-garden:3 number-fireflies:3 sound-butterfly:3 word-garden:1 sentence-train:2 |  |  |
| D18 | 10.8 | 5/5 | 24/9 | word-garden:3 hangul-pieces:3 sound-butterfly:2 word-garden:2 sentence-train:1 | sentence-train:1 33→33% |  |
| D19 | 10.2 | 5/5 | 26/6 | word-garden:3 ant-path:2 sound-butterfly:3 word-garden:1 sentence-train:2 |  | sentence-train:2 100%×3 |
| D20 | 11.1 | 5/5 | 25/9 | word-garden:3 number-fireflies:1 sound-butterfly:2 word-garden:2 sentence-train:3 |  |  |
| D21 | 10.1 | 5/5 | 22/5 | chant:0 word-garden:3 hangul-pieces:2 word-garden:1 sentence-train:1 |  |  |
| D22 | 10.5 | 5/5 | 22/10 | word-garden:3 ant-path:3 sound-butterfly:3 word-garden:2 sentence-train:3 |  | word-garden:3 100%×3 |
| D23 | 10.1 | 5/5 | 31/3 | word-garden:3 number-fireflies:4 sound-butterfly:2 word-garden:1 sentence-train:1 |  | word-garden:3 100%×3 |
| D24 | 12.1 | 5/5 | 28/11 | word-garden:4 pattern-path:3 sound-butterfly:3 word-garden:1 sentence-train:3 |  |  |
| D25 | 10.9 | 5/5 | 33/5 | word-garden:4 hangul-pieces:3 sound-butterfly:4 word-garden:2 sentence-train:1 |  | sentence-train:1 100%×3 |
| D26 | 11.6 | 5/5 | 30/9 | word-garden:4 number-fireflies:1 sound-butterfly:2 word-garden:1 sentence-train:4 |  | number-fireflies:1 100%×3 |
| D27 | 12.7 | 6/6 | 27/10 | medley:0 word-garden:4 ant-path:2 sound-butterfly:4 word-garden:2 sentence-train:1 |  |  |
| D28 | 11.6 | 5/5 | 21/11 | chant:0 word-garden:4 hangul-pieces:2 word-garden:1 sentence-train:4 |  |  |
| D29 | 12.4 | 5/5 | 43/4 | word-garden:4 sound-butterfly:1 word-garden:2 sentence-train:3 number-fireflies:4 |  |  |
| D30 | 12.6 | 4/4 | 29/6 | word-garden:4 word-garden:1 sentence-train:4 finale:0 |  | sentence-train:4 100%×3 |

최종 적응형 레벨: word-garden:1=20, sound-butterfly:1=7, hangul-pieces:1=1, sentence-train:1=5, word-garden:2=18, pattern-path:1=4, number-fireflies:1=8, sound-butterfly:2=2, hangul-pieces:2=1, word-garden:3=9, pattern-path:2=1, number-fireflies:2=3, sentence-train:2=4, pattern-path:3=5, ant-path:1=1, sound-butterfly:3=8, pattern-path:4=3, number-fireflies:3=4, hangul-pieces:3=4, ant-path:2=3, sentence-train:3=2, ant-path:3=1, number-fireflies:4=5, word-garden:4=6, sound-butterfly:4=8, sentence-train:4=3

노출 5회 미만: 없음 ✅
놓친 복습: hat(D18)+7, shirt(D18)+7, shoes(D18)+7, dress(D19)+7, sunny(D20)+7, rainy(D20)+7, windy(D20)+7, hot(D21)+7, cold(D21)+7, rainbow(D21)+7, mushroom(D21)+7, run(D22)+7, swim(D22)+7, fly(D22)+7, thirsty(D26)+3

## 느린 아이 — 일별

| 일 | 분 | 정거장 | 정답/재시도 | 구성 | 막힘 | 지루함 |
|---|---|---|---|---|---|---|
| D1 | 7.5 | 2/2 | 9/5 | word-garden:1 sound-butterfly:1 |  |  |
| D2 | 11 | 4/4 | 21/6 | word-garden:1 hangul-pieces:1 sound-butterfly:1 word-garden:1 |  |  |
| D3 | 13.3 | 5/5 | 19/11 | word-garden:1 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D4 | 12.8 | 5/5 | 25/7 | word-garden:2 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D5 | 14.1 | 5/5 | 24/10 | word-garden:2 pattern-path:1 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D6 | 13 | 5/5 | 26/7 | word-garden:2 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D7 | 12.7 | 5/5 | 17/8 | chant:0 word-garden:2 pattern-path:1 word-garden:1 sentence-train:1 |  |  |
| D8 | 14.8 | 5/5 | 28/9 | word-garden:2 number-fireflies:1 sound-butterfly:2 word-garden:1 sentence-train:1 |  | sentence-train:1 100%×3 |
| D9 | 14.4 | 5/5 | 27/9 | word-garden:2 hangul-pieces:2 sound-butterfly:1 word-garden:1 sentence-train:1 |  | sentence-train:1 100%×3 |
| D10 | 14.1 | 5/5 | 25/10 | word-garden:3 number-fireflies:1 sound-butterfly:2 word-garden:2 sentence-train:1 |  |  |
| D11 | 14.3 | 5/5 | 26/9 | word-garden:3 pattern-path:2 sound-butterfly:1 word-garden:1 sentence-train:1 | sentence-train:1 50→50% |  |
| D12 | 15.4 | 5/5 | 16/18 | word-garden:3 number-fireflies:2 sound-butterfly:2 word-garden:2 sentence-train:1 | sentence-train:1 50→33% |  |
| D13 | 13.5 | 5/5 | 24/9 | word-garden:3 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:2 |  |  |
| D14 | 13 | 5/5 | 21/7 | chant:0 word-garden:3 pattern-path:3 word-garden:2 sentence-train:1 | sentence-train:1 33→33% |  |
| D15 | 12.5 | 5/5 | 26/6 | word-garden:3 ant-path:1 sound-butterfly:3 word-garden:1 sentence-train:2 |  |  |
| D16 | 14.1 | 5/5 | 22/12 | word-garden:3 pattern-path:4 sound-butterfly:2 word-garden:2 sentence-train:1 | sound-butterfly:2 50→33% |  |
| D17 | 14.1 | 5/5 | 21/13 | word-garden:3 number-fireflies:3 sound-butterfly:3 word-garden:1 sentence-train:2 |  |  |
| D18 | 13.6 | 5/5 | 22/11 | word-garden:3 hangul-pieces:3 sound-butterfly:2 word-garden:2 sentence-train:1 |  | word-garden:3 100%×3 |
| D19 | 13.9 | 5/5 | 19/13 | word-garden:3 ant-path:2 sound-butterfly:3 word-garden:1 sentence-train:2 | word-garden:1 56→50% | word-garden:3 100%×3 |
| D20 | 13.6 | 5/5 | 25/9 | word-garden:3 number-fireflies:1 sound-butterfly:2 word-garden:2 sentence-train:3 |  |  |
| D21 | 12.6 | 5/5 | 19/8 | chant:0 word-garden:3 hangul-pieces:2 word-garden:1 sentence-train:1 |  |  |
| D22 | 13.4 | 5/5 | 22/10 | word-garden:3 ant-path:3 sound-butterfly:3 word-garden:2 sentence-train:3 |  |  |
| D23 | 14 | 5/5 | 25/9 | word-garden:3 number-fireflies:4 sound-butterfly:2 word-garden:1 sentence-train:1 |  |  |
| D24 | 13.9 | 5/5 | 35/4 | word-garden:4 pattern-path:3 sound-butterfly:3 word-garden:1 sentence-train:3 |  |  |
| D25 | 14.6 | 5/5 | 29/9 | word-garden:4 hangul-pieces:3 sound-butterfly:4 word-garden:2 sentence-train:1 |  |  |
| D26 | 15.4 | 5/5 | 27/12 | word-garden:4 number-fireflies:1 sound-butterfly:2 word-garden:1 sentence-train:4 |  |  |
| D27 | 15.3 | 6/6 | 29/8 | medley:0 word-garden:4 ant-path:2 sound-butterfly:4 word-garden:2 sentence-train:1 |  |  |
| D28 | 14.3 | 5/5 | 21/11 | chant:0 word-garden:4 hangul-pieces:2 word-garden:1 sentence-train:4 | sentence-train:4 33→33% |  |
| D29 | 15.2 | 3/5 | 22/16 | word-garden:4 sound-butterfly:1 word-garden:2 sentence-train:3 number-fireflies:4 | 시간 부족 3/5 |  |
| D30 | 16.5 | 4/4 | 21/14 | word-garden:4 word-garden:1 sentence-train:3 finale:0 |  |  |

최종 적응형 레벨: word-garden:1=5, sound-butterfly:1=3, hangul-pieces:1=1, sentence-train:1=1, word-garden:2=1, pattern-path:1=1, number-fireflies:1=7, sound-butterfly:2=1, hangul-pieces:2=3, word-garden:3=6, pattern-path:2=3, number-fireflies:2=3, sentence-train:2=3, pattern-path:3=5, ant-path:1=1, sound-butterfly:3=1, pattern-path:4=4, number-fireflies:3=3, hangul-pieces:3=1, ant-path:2=1, sentence-train:3=3, ant-path:3=1, number-fireflies:4=1, word-garden:4=1, sound-butterfly:4=1, sentence-train:4=1

노출 5회 미만: 없음 ✅
놓친 복습: head(D12)+7, eye(D12)+7, mouth(D12)+7, foot(D13)+7, arm(D13)+7, finger(D13)+7, boat(D14)+7, grandma(D14)+7, grandpa(D14)+7, apple(D15)+7, banana(D15)+7, grape(D15)+7, strawberry(D15)+7, lemon(D15)+7, bread(D16)+7, milk(D16)+7, rice(D16)+7, cookie(D16)+7, carrot(D17)+7, corn(D17)+7, juice(D17)+7, pizza(D17)+7, candy(D17)+7, hat(D18)+7, shirt(D18)+7, shoes(D18)+7, socks(D18)+7, bag(D19)+7, umbrella(D19)+7, boots(D19)+7 …

## 단어별 노출 횟수 (보통 아이)

| 일 | 단어 (노출 횟수) |
|---|---|
| D1 | red 17 · blue 16 · yellow 14 · green 14 · pink 10 |
| D2 | flower 13 · tree 10 · leaf 10 · sun 12 · moon 14 |
| D3 | orange 8 · purple 14 · white 11 · black 7 · brown 6 |
| D4 | one 20 · two 20 · three 19 · four 16 · five 15 |
| D5 | circle 9 · square 20 · triangle 18 · heart 10 · star 21 |
| D6 | six 9 · seven 10 · eight 9 · nine 16 · ten 13 |
| D7 | big 14 · small 9 · cake 8 · ball 11 · balloon 11 |
| D8 | frog 12 · fish 17 · duck 10 · turtle 9 · bug 8 |
| D9 | cat 13 · dog 11 · rabbit 10 · bear 7 · pig 10 |
| D10 | lion 12 · monkey 12 · elephant 12 · horse 13 · cow 9 |
| D11 | mom 10 · dad 9 · baby 12 · sister 6 · brother 8 |
| D12 | head 10 · eye 9 · nose 13 · mouth 7 · ear 8 |
| D13 | hand 10 · foot 11 · arm 6 · leg 7 · finger 8 |
| D14 | water 9 · boat 7 · rock 6 · grandma 10 · grandpa 8 |
| D15 | apple 7 · banana 12 · grape 21 · strawberry 5 · lemon 7 |
| D16 | bread 8 · milk 7 · egg 8 · rice 10 · cookie 11 |
| D17 | carrot 9 · corn 7 · juice 6 · pizza 6 · candy 6 |
| D18 | hat 12 · shirt 7 · pants 6 · shoes 6 · socks 6 |
| D19 | dress 10 · coat 9 · bag 12 · umbrella 6 · boots 6 |
| D20 | sunny 9 · rainy 8 · cloudy 6 · snowy 6 · windy 6 |
| D21 | hot 9 · cold 7 · rainbow 7 · owl 6 · mushroom 8 |
| D22 | run 7 · jump 13 · walk 7 · swim 6 · fly 8 |
| D23 | sing 8 · dance 10 · clap 8 · sleep 7 · eat 6 |
| D24 | read 5 · draw 7 · play 6 · cook 6 · hide 6 |
| D25 | happy 10 · sad 6 · angry 6 · scared 10 · sleepy 6 |
| D26 | hungry 6 · thirsty 6 · tired 5 · brave 6 · shy 5 |
| D27 | park 8 · zoo 8 · beach 8 · store 6 · pool 6 |
| D28 | in 7 · on 6 · under 6 · box 7 · table 6 |
| D29 | sky 7 · cloud 6 · night 7 · bridge 8 · dream 8 |
| D30 | friend 8 · gift 6 · music 5 · light 8 · garden 7 |
