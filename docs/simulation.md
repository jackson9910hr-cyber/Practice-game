# 밸런스 시뮬레이션 리포트 (Stage 4)

> `npm run simulate`로 재생성. 실제 스케줄러·라운드 생성기·게임 로직·적응형 난이도·간격 반복 코드를 그대로 사용해 가상 아이 3명이 하루 15분씩 30일을 플레이한 결과입니다.

## 요약

| 아이 | 첫 시도 정답률 | 평균 플레이(분) | 정거장 완료 | 단어 노출 최소 / 중앙값 | 노출 5회 미만 단어 | 놓친 복습 | 막힌 날 | 지루한 날 |
|---|---|---|---|---|---|---|---|---|
| 빠른 아이 | 81% | 8.7 | 146/146 | 5 / 9 | 0 | 2 | 0 | 1 |
| 보통 아이 | 77% | 10.7 | 146/146 | 5 / 8 | 0 | 16 | 2 | 4 |
| 느린 아이 | 71% | 13.8 | 145/146 | 5 / 9 | 0 | 24 | 4 | 1 |


### 10개 시드 평균 (우연 효과 제거)

| 아이 | 첫 시도 정답률 | 평균 플레이(분) | 노출 최소(최악 시드) | 노출 5회 미만 단어(평균) | 놓친 복습(평균) | 막힌 날(평균) | 지루한 날(평균) |
|---|---|---|---|---|---|---|---|
| 빠른 아이 | 83% | 8.6 | 5 | 0.0 | 6.1 | 0.5 | 9.7 |
| 보통 아이 | 78% | 10.7 | 5 | 0.0 | 10.0 | 1.0 | 5.0 |
| 느린 아이 | 70% | 13.8 | 5 | 0.0 | 25.7 | 7.5 | 0.8 |

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
| D8 | 8.8 | 5/5 | 31/6 | word-garden:2 number-fireflies:1 sound-butterfly:2 word-garden:1 sentence-train:1 |  |  |
| D9 | 8.7 | 5/5 | 29/6 | word-garden:2 hangul-pieces:2 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D10 | 8.7 | 5/5 | 30/5 | word-garden:3 pattern-path:1 sound-butterfly:2 word-garden:2 sentence-train:1 |  |  |
| D11 | 8.7 | 5/5 | 29/6 | word-garden:3 pattern-path:2 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D12 | 8.6 | 5/5 | 30/5 | word-garden:3 number-fireflies:2 sound-butterfly:2 word-garden:2 sentence-train:1 |  |  |
| D13 | 8.6 | 5/5 | 24/9 | word-garden:3 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:2 |  |  |
| D14 | 8.6 | 5/5 | 27/2 | chant:0 word-garden:3 pattern-path:3 word-garden:2 sentence-train:1 |  |  |
| D15 | 8.4 | 5/5 | 25/7 | word-garden:3 ant-path:1 sound-butterfly:3 word-garden:1 sentence-train:2 |  |  |
| D16 | 8.7 | 5/5 | 27/8 | word-garden:3 pattern-path:4 sound-butterfly:2 word-garden:2 sentence-train:1 |  |  |
| D17 | 8.6 | 5/5 | 30/5 | word-garden:3 number-fireflies:3 sound-butterfly:3 word-garden:1 sentence-train:2 |  |  |
| D18 | 8.7 | 5/5 | 29/6 | word-garden:3 hangul-pieces:3 sound-butterfly:2 word-garden:2 sentence-train:1 |  | word-garden:3 100%×3 |
| D19 | 8.6 | 5/5 | 27/7 | word-garden:3 ant-path:2 sound-butterfly:3 word-garden:1 sentence-train:2 |  |  |
| D20 | 9 | 5/5 | 24/11 | word-garden:3 pattern-path:1 sound-butterfly:2 word-garden:2 sentence-train:3 |  |  |
| D21 | 9.3 | 5/5 | 21/9 | chant:0 word-garden:3 number-fireflies:2 word-garden:1 sentence-train:1 |  |  |
| D22 | 8.5 | 5/5 | 26/7 | word-garden:3 ant-path:3 sound-butterfly:3 word-garden:2 sentence-train:3 |  |  |
| D23 | 8.7 | 5/5 | 30/6 | word-garden:3 number-fireflies:4 sound-butterfly:2 word-garden:1 sentence-train:1 |  |  |
| D24 | 9.1 | 5/5 | 35/4 | word-garden:4 hangul-pieces:2 sound-butterfly:3 word-garden:1 sentence-train:3 |  |  |
| D25 | 9.3 | 5/5 | 33/7 | word-garden:4 pattern-path:4 sound-butterfly:4 word-garden:2 sentence-train:1 |  |  |
| D26 | 8.6 | 5/5 | 34/3 | word-garden:4 ant-path:2 sound-butterfly:2 word-garden:1 sentence-train:4 |  |  |
| D27 | 10.4 | 6/6 | 33/7 | medley:0 word-garden:4 number-fireflies:3 sound-butterfly:4 word-garden:2 sentence-train:1 |  |  |
| D28 | 9.1 | 5/5 | 25/7 | chant:0 word-garden:4 hangul-pieces:3 word-garden:1 sentence-train:4 |  |  |
| D29 | 10.4 | 5/5 | 33/13 | word-garden:4 sound-butterfly:1 word-garden:2 sentence-train:3 pattern-path:3 |  |  |
| D30 | 11 | 4/4 | 25/10 | word-garden:4 word-garden:1 sentence-train:4 finale:0 |  |  |

최종 적응형 레벨: word-garden:1=29, sound-butterfly:1=17, hangul-pieces:1=8, sentence-train:1=18, word-garden:2=25, pattern-path:1=8, number-fireflies:1=3, sound-butterfly:2=13, hangul-pieces:2=7, word-garden:3=13, pattern-path:2=5, number-fireflies:2=5, sentence-train:2=7, pattern-path:3=7, ant-path:1=1, sound-butterfly:3=11, pattern-path:4=7, number-fireflies:3=6, hangul-pieces:3=7, ant-path:2=3, sentence-train:3=8, ant-path:3=1, number-fireflies:4=4, word-garden:4=12, sound-butterfly:4=7, sentence-train:4=5

노출 5회 미만: 없음 ✅
놓친 복습: run(D22)+7, fly(D22)+7

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
| D9 | 11.3 | 5/5 | 26/10 | word-garden:2 hangul-pieces:2 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D10 | 10.8 | 5/5 | 26/8 | word-garden:3 pattern-path:1 sound-butterfly:2 word-garden:2 sentence-train:1 |  | sentence-train:1 100%×3 |
| D11 | 10.9 | 5/5 | 25/9 | word-garden:3 pattern-path:2 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D12 | 10.5 | 5/5 | 30/4 | word-garden:3 number-fireflies:2 sound-butterfly:2 word-garden:2 sentence-train:1 |  |  |
| D13 | 10.7 | 5/5 | 25/8 | word-garden:3 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:2 | word-garden:3 33→33% |  |
| D14 | 10.5 | 5/5 | 22/6 | chant:0 word-garden:3 pattern-path:3 word-garden:2 sentence-train:1 |  |  |
| D15 | 10.2 | 5/5 | 27/5 | word-garden:3 ant-path:1 sound-butterfly:3 word-garden:1 sentence-train:2 |  |  |
| D16 | 10.6 | 5/5 | 29/6 | word-garden:3 pattern-path:4 sound-butterfly:2 word-garden:2 sentence-train:1 |  |  |
| D17 | 10.8 | 5/5 | 26/8 | word-garden:3 number-fireflies:3 sound-butterfly:3 word-garden:1 sentence-train:2 |  | sentence-train:2 100%×3 |
| D18 | 11.2 | 5/5 | 24/10 | word-garden:3 hangul-pieces:3 sound-butterfly:2 word-garden:2 sentence-train:1 |  | word-garden:3 100%×3 |
| D19 | 10.4 | 5/5 | 23/9 | word-garden:3 ant-path:2 sound-butterfly:3 word-garden:1 sentence-train:2 |  | sentence-train:2 100%×3 |
| D20 | 10.7 | 5/5 | 28/6 | word-garden:3 pattern-path:1 sound-butterfly:2 word-garden:2 sentence-train:3 |  |  |
| D21 | 10.9 | 5/5 | 21/8 | chant:0 word-garden:3 number-fireflies:2 word-garden:1 sentence-train:1 |  |  |
| D22 | 10.4 | 5/5 | 25/7 | word-garden:3 ant-path:3 sound-butterfly:3 word-garden:2 sentence-train:3 |  |  |
| D23 | 10.9 | 5/5 | 26/9 | word-garden:3 number-fireflies:4 sound-butterfly:2 word-garden:1 sentence-train:1 |  |  |
| D24 | 11.5 | 5/5 | 29/9 | word-garden:4 hangul-pieces:2 sound-butterfly:3 word-garden:1 sentence-train:3 |  |  |
| D25 | 11.9 | 5/5 | 31/9 | word-garden:4 pattern-path:4 sound-butterfly:4 word-garden:2 sentence-train:1 | sentence-train:1 50→50% |  |
| D26 | 11.2 | 5/5 | 30/7 | word-garden:4 ant-path:2 sound-butterfly:2 word-garden:1 sentence-train:4 |  |  |
| D27 | 12.8 | 6/6 | 32/8 | medley:0 word-garden:4 number-fireflies:3 sound-butterfly:4 word-garden:2 sentence-train:1 |  |  |
| D28 | 11.2 | 5/5 | 24/8 | chant:0 word-garden:4 hangul-pieces:3 word-garden:1 sentence-train:4 |  |  |
| D29 | 12.8 | 5/5 | 38/9 | word-garden:4 sound-butterfly:1 word-garden:2 sentence-train:3 pattern-path:3 |  |  |
| D30 | 12.5 | 4/4 | 29/6 | word-garden:4 word-garden:1 sentence-train:4 finale:0 |  |  |

최종 적응형 레벨: word-garden:1=18, sound-butterfly:1=5, hangul-pieces:1=1, sentence-train:1=9, word-garden:2=20, pattern-path:1=5, number-fireflies:1=2, sound-butterfly:2=11, hangul-pieces:2=1, word-garden:3=7, pattern-path:2=1, number-fireflies:2=4, sentence-train:2=7, pattern-path:3=5, ant-path:1=1, sound-butterfly:3=8, pattern-path:4=5, number-fireflies:3=4, hangul-pieces:3=4, ant-path:2=1, sentence-train:3=4, ant-path:3=1, number-fireflies:4=3, word-garden:4=10, sound-butterfly:4=7, sentence-train:4=1

노출 5회 미만: 없음 ✅
놓친 복습: hat(D18)+7, pants(D18)+7, shoes(D18)+7, socks(D18)+7, boots(D19)+7, rainy(D20)+7, windy(D20)+7, hot(D21)+7, cold(D21)+7, rainbow(D21)+7, owl(D21)+7, mushroom(D21)+7, run(D22)+7, swim(D22)+7, fly(D22)+7, brave(D26)+3

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
| D8 | 15 | 5/5 | 26/11 | word-garden:2 number-fireflies:1 sound-butterfly:2 word-garden:1 sentence-train:1 |  |  |
| D9 | 15.4 | 5/5 | 21/15 | word-garden:2 hangul-pieces:2 sound-butterfly:1 word-garden:1 sentence-train:1 |  |  |
| D10 | 15.2 | 5/5 | 18/16 | word-garden:3 pattern-path:1 sound-butterfly:2 word-garden:2 sentence-train:1 |  |  |
| D11 | 14.6 | 5/5 | 22/13 | word-garden:3 pattern-path:2 sound-butterfly:1 word-garden:1 sentence-train:1 |  | sentence-train:1 100%×3 |
| D12 | 14.1 | 5/5 | 26/9 | word-garden:3 number-fireflies:2 sound-butterfly:2 word-garden:2 sentence-train:1 |  |  |
| D13 | 13.5 | 5/5 | 24/9 | word-garden:3 hangul-pieces:1 sound-butterfly:1 word-garden:1 sentence-train:2 |  |  |
| D14 | 13.5 | 5/5 | 19/10 | chant:0 word-garden:3 pattern-path:3 word-garden:2 sentence-train:1 |  |  |
| D15 | 12.9 | 5/5 | 26/6 | word-garden:3 ant-path:1 sound-butterfly:3 word-garden:1 sentence-train:2 |  |  |
| D16 | 15.2 | 5/5 | 20/15 | word-garden:3 pattern-path:4 sound-butterfly:2 word-garden:2 sentence-train:1 | sentence-train:1 50→50% |  |
| D17 | 14.3 | 5/5 | 23/11 | word-garden:3 number-fireflies:3 sound-butterfly:3 word-garden:1 sentence-train:2 | word-garden:3 33→33% |  |
| D18 | 13.5 | 5/5 | 21/12 | word-garden:3 hangul-pieces:3 sound-butterfly:2 word-garden:2 sentence-train:1 | sentence-train:1 50→33% |  |
| D19 | 13.2 | 5/5 | 22/10 | word-garden:3 ant-path:2 sound-butterfly:3 word-garden:1 sentence-train:2 |  |  |
| D20 | 14.5 | 5/5 | 21/13 | word-garden:3 pattern-path:1 sound-butterfly:2 word-garden:2 sentence-train:3 |  |  |
| D21 | 12.8 | 5/5 | 20/8 | chant:0 word-garden:3 number-fireflies:2 word-garden:1 sentence-train:1 |  |  |
| D22 | 13.5 | 5/5 | 24/8 | word-garden:3 ant-path:3 sound-butterfly:3 word-garden:2 sentence-train:3 |  |  |
| D23 | 13 | 5/5 | 27/7 | word-garden:3 number-fireflies:4 sound-butterfly:2 word-garden:1 sentence-train:1 |  |  |
| D24 | 14.1 | 5/5 | 32/6 | word-garden:4 hangul-pieces:2 sound-butterfly:3 word-garden:1 sentence-train:3 |  |  |
| D25 | 15 | 5/5 | 29/10 | word-garden:4 pattern-path:4 sound-butterfly:4 word-garden:2 sentence-train:1 |  |  |
| D26 | 14.3 | 5/5 | 28/9 | word-garden:4 ant-path:2 sound-butterfly:2 word-garden:1 sentence-train:4 |  |  |
| D27 | 15.4 | 5/6 | 26/10 | medley:0 word-garden:4 number-fireflies:3 sound-butterfly:4 word-garden:2 sentence-train:1 | 시간 부족 5/6 |  |
| D28 | 13.6 | 5/5 | 25/7 | chant:0 word-garden:4 hangul-pieces:3 word-garden:1 sentence-train:1 |  |  |
| D29 | 16.9 | 5/5 | 38/9 | word-garden:4 sound-butterfly:1 word-garden:2 sentence-train:4 pattern-path:3 |  |  |
| D30 | 15.9 | 4/4 | 25/10 | word-garden:4 word-garden:1 sentence-train:3 finale:0 |  |  |

최종 적응형 레벨: word-garden:1=14, sound-butterfly:1=4, hangul-pieces:1=1, sentence-train:1=4, word-garden:2=2, pattern-path:1=1, number-fireflies:1=1, sound-butterfly:2=1, hangul-pieces:2=1, word-garden:3=2, pattern-path:2=1, number-fireflies:2=3, sentence-train:2=3, pattern-path:3=2, ant-path:1=1, sound-butterfly:3=1, pattern-path:4=1, number-fireflies:3=3, hangul-pieces:3=3, ant-path:2=1, sentence-train:3=2, ant-path:3=1, number-fireflies:4=2, word-garden:4=3, sound-butterfly:4=3, sentence-train:4=4

노출 5회 미만: 없음 ✅
놓친 복습: bread(D16)+7, egg(D16)+7, rice(D16)+7, cookie(D16)+7, carrot(D17)+7, corn(D17)+7, juice(D17)+7, pizza(D17)+7, hat(D18)+7, shirt(D18)+7, shoes(D18)+7, dress(D19)+7, coat(D19)+7, boots(D19)+7, sunny(D20)+7, rainy(D20)+7, cloudy(D20)+7, snowy(D20)+7, mushroom(D21)+7, run(D22)+7, jump(D22)+7, walk(D22)+7, fly(D22)+7, brave(D26)+3

## 단어별 노출 횟수 (보통 아이)

| 일 | 단어 (노출 횟수) |
|---|---|
| D1 | red 21 · blue 18 · yellow 19 · green 19 · pink 9 |
| D2 | flower 15 · tree 8 · leaf 10 · sun 11 · moon 14 |
| D3 | orange 8 · purple 23 · white 12 · black 7 · brown 6 |
| D4 | one 30 · two 42 · three 35 · four 26 · five 24 |
| D5 | circle 6 · square 10 · triangle 15 · heart 14 · star 19 |
| D6 | six 28 · seven 27 · eight 23 · nine 26 · ten 12 |
| D7 | big 22 · small 19 · cake 16 · ball 11 · balloon 10 |
| D8 | frog 16 · fish 11 · duck 12 · turtle 7 · bug 13 |
| D9 | cat 12 · dog 12 · rabbit 7 · bear 9 · pig 14 |
| D10 | lion 11 · monkey 9 · elephant 11 · horse 6 · cow 6 |
| D11 | mom 13 · dad 11 · baby 6 · sister 6 · brother 6 |
| D12 | head 8 · eye 6 · nose 10 · mouth 6 · ear 6 |
| D13 | hand 6 · foot 10 · arm 8 · leg 6 · finger 9 |
| D14 | water 8 · boat 7 · rock 8 · grandma 8 · grandpa 12 |
| D15 | apple 9 · banana 13 · grape 17 · strawberry 12 · lemon 10 |
| D16 | bread 6 · milk 12 · egg 6 · rice 6 · cookie 9 |
| D17 | carrot 10 · corn 9 · juice 5 · pizza 9 · candy 9 |
| D18 | hat 8 · shirt 10 · pants 6 · shoes 8 · socks 7 |
| D19 | dress 6 · coat 11 · bag 8 · umbrella 6 · boots 7 |
| D20 | sunny 11 · rainy 11 · cloudy 6 · snowy 6 · windy 10 |
| D21 | hot 9 · cold 6 · rainbow 8 · owl 7 · mushroom 6 |
| D22 | run 7 · jump 13 · walk 6 · swim 6 · fly 10 |
| D23 | sing 10 · dance 7 · clap 6 · sleep 6 · eat 7 |
| D24 | read 6 · draw 7 · play 11 · cook 8 · hide 9 |
| D25 | happy 13 · sad 11 · angry 7 · scared 6 · sleepy 5 |
| D26 | hungry 7 · thirsty 6 · tired 7 · brave 6 · shy 6 |
| D27 | park 7 · zoo 6 · beach 6 · store 6 · pool 7 |
| D28 | in 7 · on 6 · under 5 · box 7 · table 6 |
| D29 | sky 7 · cloud 7 · night 7 · bridge 8 · dream 7 |
| D30 | friend 7 · gift 5 · music 8 · light 8 · garden 7 |
