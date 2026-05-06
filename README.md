# Speed Baccarat Pattern Analyzer Pro

수동 클릭으로 결과를 누적 입력하고, 최근 N개 패턴 기준으로 과거 동일 패턴 뒤에 가장 많이 나온 결과를 추천하는 웹 분석기입니다.

## 포함 기능

- 회원가입/로그인
- SQLite 서버 저장
- 브라우저 localStorage 자동 백업
- Banker / Player / Tie 수동 입력
- 최근 4~8개 패턴 선택
- 최근 데이터 가중치
- 최소 추천 신뢰도 필터
- 추천 정확도/승률 추적
- JSON 백업/복구

## 실행 방법

```bash
npm install
cp .env.example .env
npm start
```

브라우저에서 아래 주소 접속:

```text
http://localhost:3000
```

## 주의

이 도구는 직접 입력한 과거 데이터의 빈도를 분석하는 통계 도구입니다. 실제 승률을 보장하지 않습니다.
