'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const STANDBY = [1, 2, 3, 4, 5, 6];
const SCORE = [1, 2, 3, 4, 5, 6];

export default function SkinsPage() {
  const [standby, setStandby] = useState('1');
  const [score, setScore] = useState('1');

  useEffect(() => {
    api.getSettings().then((s) => {
      setStandby(s.standby_skin || '1');
      setScore(s.score_skin || '1');
    });
  }, []);

  const pick = async (key: string, val: string) => {
    await api.putSettings({ [key]: val });
    if (key === 'standby_skin') setStandby(val);
    else setScore(val);
  };

  return (
    <>
      <h1 className="page-title">환경설정 - 스킨관리</h1>
      <p className="page-desc">대기화면·점수화면 스킨 선택 (즉시 모니터 반영)</p>

      <h3 style={{ marginBottom: 8 }}>대기화면</h3>
      <div className="skin-grid card">
        {STANDBY.map((n) => (
          <button key={n} type="button" className={`skin-tile ${standby === String(n) ? 'active' : ''}`} onClick={() => pick('standby_skin', String(n))}>
            <span>스킨{n}</span>
            <small>I AM Bowling</small>
          </button>
        ))}
      </div>

      <h3 style={{ margin: '20px 0 8px' }}>점수화면</h3>
      <div className="skin-grid card">
        {SCORE.map((n) => (
          <button key={n} type="button" className={`skin-tile score ${score === String(n) ? 'active' : ''}`} onClick={() => pick('score_skin', String(n))}>
            <span>스킨{n}</span>
            <small>1 LANE · 10 frames</small>
          </button>
        ))}
      </div>

      <style>{`
        .skin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 16px; }
        .skin-tile { padding: 24px; border: 2px solid var(--gray-200); border-radius: 8px; background: var(--navy); color: white; text-align: center; }
        .skin-tile.score { background: #1e3a5f; }
        .skin-tile.active { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
        .skin-tile small { display: block; margin-top: 8px; opacity: 0.7; font-size: 11px; }
      `}</style>
    </>
  );
}
