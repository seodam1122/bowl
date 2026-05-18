/** Vercel 런타임 env를 클라이언트에 전달 (NEXT_PUBLIC_* 빌드 시점 누락 대비) */
export default function SupabaseEnvScript() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!url || !key) return null;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__SUPABASE_ENV__=${JSON.stringify({ url, key })}`,
      }}
    />
  );
}
