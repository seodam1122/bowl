# 온스코어링 (OnScoring)

볼링원(Bowling One) 스코어링 시스템 사용자 매뉴얼 기반 볼링장 관리 웹 애플리케이션입니다.

## 기능

- **볼링장 관리**: 영업일 설정, 16레인 관리, 락커 관리
- **마감 관리**: 요금표, 일일 마감, 통계 차트
- **대회 관리**: 대회 등록·레인배정·점수집계
- **회원 관리**: 회원/클럽 CRUD, 통계
- **환경설정**: 기본설정, 공지, 스킨, 라이선스

## 실행

```bash
# 루트에서 의존성 설치
npm install
cd server && npm install
cd ../client && npm install
cd ..

# 개발 서버 (API :3001, UI :5173)
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다.

## 기술 스택

- Frontend: React 19, TypeScript, Vite, React Router, Recharts
- Backend: Express, better-sqlite3 (SQLite)

## 참고

실제 핀셋터·오버헤드 모니터 연동은 하드웨어 API가 필요합니다. 본 프로젝트는 매뉴얼 UI/업무 흐름을 구현한 관리자 데모입니다.
