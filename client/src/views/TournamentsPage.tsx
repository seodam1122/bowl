'use client';

import { useEffect, useState } from 'react';
import { api, Tournament, TournamentParticipant } from '@/lib/api';

export default function TournamentsPage() {
  const [list, setList] = useState<Tournament[]>([]);
  const [sel, setSel] = useState<Tournament | null>(null);
  const [basic, setBasic] = useState({ name: '', type: '개인', round_num: 1, game_count: 3 });
  const [round, setRound] = useState({ participant_count: 0, lane_from: 1, lane_to: 16, lane_movement: '우측' });
  const [parts, setParts] = useState<TournamentParticipant[]>([]);
  const [step, setStep] = useState(0);

  const load = () => api.getTournaments().then(setList);
  useEffect(() => { load(); }, []);

  const selectT = async (t: Tournament) => {
    setSel(t);
    setBasic({ name: t.name, type: t.type, round_num: t.round_num, game_count: t.game_count });
    setRound({
      participant_count: t.participant_count,
      lane_from: t.lane_from,
      lane_to: t.lane_to,
      lane_movement: t.lane_movement,
    });
    const p = await api.getParticipants(t.id);
    setParts(p.length ? p : [{ name: '', handicap: 0, team_name: '', lane_order: 0, scores: [] }]);
    setStep(2);
  };

  const saveBasic = async () => {
    if (sel) await api.updateTournament(sel.id, { ...sel, ...basic, ...round, status: 'draft' });
    else {
      const r = await api.createTournament({ ...basic, ...round, status: 'draft' }) as { id: number };
      const t = await api.getTournaments();
      const created = t.find((x) => x.id === r.id);
      if (created) setSel(created);
    }
    load();
    setStep(1);
  };

  const saveRound = async () => {
    if (!sel) return;
    await api.updateTournament(sel.id, { ...sel, ...basic, ...round });
    setStep(2);
  };

  const saveParts = async () => {
    if (!sel) return;
    await api.saveParticipants(sel.id, parts.filter((p) => p.name.trim()));
    alert('저장되었습니다.');
  };

  const assignLanes = async () => {
    if (!sel) return;
    await api.assignLanes(sel.id);
    alert('레인배정 완료. 레인관리에서 대회모드가 활성화됩니다.');
    load();
  };

  return (
    <>
      <h1 className="page-title">대회 관리 - 대회관리</h1>
      <p className="page-desc">대회 등록 → 차수 설정 → 참가자 입력 → 레인배정</p>

      <div className="card">
        <table>
          <thead><tr><th>번호</th><th>대회명</th><th>상태</th></tr></thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => selectT(t)}>
                <td>{t.id}</td>
                <td>{t.name}</td>
                <td>{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn-primary" style={{ marginTop: 12 }} onClick={() => { setSel(null); setStep(0); setBasic({ name: '', type: '개인', round_num: 1, game_count: 3 }); }}>등록</button>
      </div>

      {step >= 0 && (
        <div className="card">
          <h3>기본정보</h3>
          <div className="form-row"><label>대회명</label><input value={basic.name} onChange={(e) => setBasic({ ...basic, name: e.target.value })} /></div>
          <div className="form-row"><label>종류</label>
            <select value={basic.type} onChange={(e) => setBasic({ ...basic, type: e.target.value })}>
              <option value="개인">개인</option><option value="단체">단체</option>
            </select>
          </div>
          <div className="form-row"><label>게임 수</label><input type="number" value={basic.game_count} onChange={(e) => setBasic({ ...basic, game_count: +e.target.value })} /></div>
          <button type="button" className="btn-primary" onClick={saveBasic}>저장</button>
        </div>
      )}

      {step >= 1 && (
        <div className="card">
          <h3>차수정보</h3>
          <div className="form-row"><label>참가자 수</label><input type="number" value={round.participant_count} onChange={(e) => setRound({ ...round, participant_count: +e.target.value })} /></div>
          <div className="form-row"><label>사용레인</label>
            <input type="number" style={{ width: 60 }} value={round.lane_from} onChange={(e) => setRound({ ...round, lane_from: +e.target.value })} />
            ~ <input type="number" style={{ width: 60 }} value={round.lane_to} onChange={(e) => setRound({ ...round, lane_to: +e.target.value })} />
          </div>
          <div className="form-row"><label>레인이동</label>
            <select value={round.lane_movement} onChange={(e) => setRound({ ...round, lane_movement: e.target.value })}>
              <option value="우측">우측</option><option value="크로스">크로스</option>
            </select>
          </div>
          <button type="button" className="btn-primary" onClick={saveRound}>저장</button>
        </div>
      )}

      {step >= 2 && sel && (
        <div className="card">
          <h3>참가자 정보</h3>
          {parts.map((p, i) => (
            <div key={i} className="toolbar" style={{ marginBottom: 8 }}>
              <input placeholder="이름" value={p.name} onChange={(e) => { const n = [...parts]; n[i] = { ...n[i], name: e.target.value }; setParts(n); }} />
              <input placeholder="팀명" value={p.team_name} onChange={(e) => { const n = [...parts]; n[i] = { ...n[i], team_name: e.target.value }; setParts(n); }} />
              <input type="number" placeholder="핸디" style={{ width: 60 }} value={p.handicap} onChange={(e) => { const n = [...parts]; n[i] = { ...n[i], handicap: +e.target.value }; setParts(n); }} />
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={() => setParts([...parts, { name: '', handicap: 0, team_name: '', lane_order: 0, scores: [] }])}>행 추가</button>
          <button type="button" className="btn-primary" onClick={saveParts}>저장</button>
          <button type="button" className="btn-accent" onClick={assignLanes}>레인배정</button>
        </div>
      )}
    </>
  );
}
