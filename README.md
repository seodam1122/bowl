# 온스코어링 (OnScoring)

볼링원(Bowling One) 스코어링 시스템 — **Next.js 15** + **Supabase**.

프론트엔드가 Supabase에 직접 연결됩니다. 별도 Express API 없이 **Vercel + Supabase**만으로 배포할 수 있습니다.

## 기능

- 볼링장 관리 (영업/레인/락커)
- 마감 관리 (요금/마감/통계)
- 대회·회원·환경설정

## Supabase 설정

1. Supabase 프로젝트 생성
2. SQL Editor에서 `server/supabase/schema.sql` 전체 실행
3. API 키: **Project URL**, **anon public**

## 로컬 실행

```bash
cd client
npm install
```

`client/.env.local` 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm run dev
```

http://localhost:3000

## Vercel 배포

Environment Variables:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public |

루트 `vercel.json`이 `client` 폴더의 Next.js 앱을 빌드합니다.

## 기술 스택

- **Next.js 15** (App Router)
- React 19, TypeScript
- Supabase, Recharts

## (선택) Express API

`server/` — 이전 백엔드. `npm run dev:legacy-api` (루트)
