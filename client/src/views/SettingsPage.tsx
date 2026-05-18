'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [s, setS] = useState<Record<string, string>>({});

  useEffect(() => { api.getSettings().then(setS); }, []);

  const save = async () => {
    await api.putSettings(s);
    alert('저장되었습니다.');
  };

  const set = (k: string, v: string) => setS((prev) => ({ ...prev, [k]: v }));

  return (
    <>
      <h1 className="page-title">환경설정 - 기본설정</h1>
      <p className="page-desc">오버헤드 모니터 스코어보드 스킨·점수 초기화 등</p>
      <div className="card">
        <div className="form-row"><label>비밀번호</label><input type="password" value={s.password || ''} onChange={(e) => set('password', e.target.value)} /></div>
        <div className="form-row"><label>오픈시각</label><input type="time" value={s.opening_time || '09:00'} onChange={(e) => set('opening_time', e.target.value)} /></div>
        <div className="form-row"><label>점수초기화</label>
          <select value={s.score_reset || ''} onChange={(e) => set('score_reset', e.target.value)}>
            <option value="게임완료 즉시">게임완료 즉시</option>
            <option value="게임완료 6초 후">게임완료 6초 후</option>
            <option value="다음게임 초구점수 입력시">다음게임 초구점수 입력시</option>
          </select>
        </div>
        <div className="form-row"><label>그래픽 노출</label>
          <select value={s.graphic_exposure || '노출'} onChange={(e) => set('graphic_exposure', e.target.value)}>
            <option value="노출">노출</option><option value="비노출">비노출</option>
          </select>
        </div>
        <div className="form-row"><label>프레임 점수 테두리</label>
          <select value={s.frame_border || '노출'} onChange={(e) => set('frame_border', e.target.value)}>
            <option value="노출">노출</option><option value="비노출">비노출</option>
          </select>
        </div>
        <button type="button" className="btn-primary" onClick={save}>저장</button>
      </div>
      <div className="card score-preview">
        <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>점수화면 미리보기 (1 LANE · 10프레임)</p>
        <div className="preview-board">
          <span>1 LANE</span>
          <div className="frames">{Array.from({ length: 10 }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
          <div className="preview-bar">Open · 파울라인을 밟지 마세요!</div>
        </div>
      </div>
    </>
  );
}
