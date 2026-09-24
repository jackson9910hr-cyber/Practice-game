# iOS: PWA 운영과 Capacitor 전환 · App Store Kids 제출 체크리스트

## 1. PWA로 운영할 때 (지금)

| 항목         | 상태 / 할 일                                                                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 홈 화면 설치 | 보호자 화면에 안내 문구가 있습니다. Safari 탭에서는 7일 넘게 열지 않으면 저장소가 지워질 수 있으니 설치를 권장하고, `storage.persist()`를 요청합니다            |
| 오디오       | 첫 탭("별을 눌러줘")에서 AudioContext와 음성 합성을 활성화합니다. 지원되는 기기에서는 `navigator.audioSession.type='playback'`으로 무음 스위치 영향을 줄입니다  |
| 음성 품질    | 설정 → 손쉬운 사용 → 읽기 및 말하기 → 음성에서 Samantha(향상됨)와 유나(향상됨)를 내려받게 안내합니다. 최종적으로는 녹음 파일로 교체합니다([audio.md](audio.md)) |
| 마이크       | 녹음은 기본 꺼짐입니다. 보호자 화면에서 켤 때 권한을 요청하고, 녹음할 때만 스트림을 열었다가 바로 닫습니다                                                      |
| 백업         | 보호자 화면 → 진도 백업 파일 저장/불러오기 (기기 로컬 JSON 파일)                                                                                                |

## 2. Capacitor 전환

```bash
npm i @capacitor/core @capacitor/ios && npm i -D @capacitor/cli
npx cap init "별빛 정원" com.example.starlightgarden --web-dir=dist
npm run build && npx cap add ios && npx cap sync ios
```

- `vite.config.ts`의 `base: './'`는 그대로 둡니다(상대 경로 필수).
- 서비스 워커는 앱 안에서는 필요 없습니다. `main.ts`의 등록 코드를 `Capacitor.isNativePlatform()`일 때 건너뛰도록 합니다.
- **TTS**: WKWebView의 speechSynthesis는 기기별로 동작이 불안정할 수 있습니다. `@capacitor-community/text-to-speech`를 쓰거나, 녹음 파일(권장)을 번들에 넣습니다.
- **오디오 세션**: 네이티브에서 `AVAudioSession`을 `.playback`으로 설정해 무음 스위치 문제를 없앱니다.
- **햅틱**(선택): `@capacitor/haptics`로 정답 진동을 줄 수 있습니다(웹에서는 iOS 미지원).
- `Info.plist` → `NSMicrophoneUsageDescription`: "보호자가 켠 경우에만, 아이가 영어 문장을 따라 말한 목소리를 이 기기에 저장해 다시 들려주기 위해 마이크를 사용합니다. 녹음은 외부로 전송되지 않습니다."
- **Privacy Manifest**(`PrivacyInfo.xcprivacy`): 추적 없음(`NSPrivacyTracking=false`), 수집 데이터 없음. Capacitor/플러그인이 쓰는 Required-Reason API(예: UserDefaults `CA92.1`, 파일 타임스탬프 `C617.1`)를 선언합니다.
- 화면 방향: 세로와 가로 모두 지원(iPad 멀티태스킹 대응).

## 3. App Store Kids 카테고리 제출 체크리스트

- [ ] 카테고리: Education, **Kids – 6~8세**
- [ ] 광고 없음, 인앱 결제 없음, 서드파티 분석/광고 SDK 없음 (현재 의존성: `pixi.js`, `idb`만 사용)
- [ ] 외부 링크 없음. 개인정보 처리방침 링크를 넣는다면 **보호자 게이트 뒤**에 둠
- [ ] 보호자 게이트: 어른용 곱셈 문제(2자리×1자리, 3회 실패 시 30초 잠금). 설정·녹음 켜기(권한 요청)·초기화·백업·인쇄를 모두 이 뒤에 둠
- [ ] 개인정보 라벨: **"데이터 수집 안 함(Data Not Collected)"** — 녹음과 진도는 기기 밖으로 나가지 않음
- [ ] 개인정보 처리방침 URL 필수(수집하지 않는다는 내용이라도 필요). 기기 로컬 저장, 녹음 보관과 삭제 방법, 문의처 기재
- [ ] 연령 등급 설문: 모든 항목 "없음" → 4+
- [ ] 스크린샷: iPhone 6.7"/6.5", iPad 13" (세로·가로)
- [ ] 심사 메모: 보호자 게이트 푸는 법("화면에 나온 곱셈의 답"), 녹음은 기본 꺼짐이라는 점, 네트워크를 쓰지 않는다는 점
- [ ] 캐릭터 이름과 모습의 독창성 재확인 (GDD §8.4)
- [ ] 한국 개인정보보호법(만 14세 미만): 수집이 없으므로 법정대리인 동의 대상 아님. 처리방침에 명시
