'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function LicensePage() {
  const [s, setS] = useState<Record<string, string>>({});
  useEffect(() => { api.getSettings().then(setS); }, []);

  return (
    <>
      <h1 className="page-title">환경설정 - 라이선스</h1>
      <p className="page-desc">시스템 인증서 · 미등록 시 사용 불가</p>
      <div className="card license-cert">
        <h2>시스템 인증서</h2>
        <dl>
          <dt>고객명</dt><dd>{s.license_customer}</dd>
          <dt>제품명</dt><dd>볼링원 온스코어링 시스템</dd>
          <dt>인증키</dt><dd>{s.license_key}</dd>
          <dt>라이선스</dt><dd className="status-ok">{s.license_status}</dd>
        </dl>
        <p className="cert-footer">
          본 인증서는 볼링원 온스코어링 시스템의 정품 사용 권한을 증명합니다.
        </p>
      </div>
      <style>{`
        .license-cert { max-width: 480px; border: 2px solid var(--navy); }
        .license-cert h2 { text-align: center; margin-bottom: 20px; color: var(--navy); }
        .license-cert dl { display: grid; grid-template-columns: 100px 1fr; gap: 8px; font-size: 14px; }
        .license-cert dt { font-weight: 600; color: var(--gray-600); }
        .status-ok { color: var(--success); font-weight: 700; }
        .cert-footer { margin-top: 24px; font-size: 12px; color: var(--gray-600); text-align: center; }
      `}</style>
    </>
  );
}
