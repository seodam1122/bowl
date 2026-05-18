'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Lane, LanePlayer } from '@/lib/api';
import Modal from '@/components/Modal';
import '@/views/LanesPage.css';

const FEE_TYPES = ['일반', '회원', '학생', '청소년', '경로'];
const SCORE_MODES = ['기본', '현재프레임', '369', '9핀'];

export default function LanesPage() {
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ player_count: 1, game_type: '일반', player_type: '일반' });
  const [competitionActive, setCompetitionActive] = useState(false);

  const load = useCallback(() => {
    api.getLanes().then((data) => {
      setLanes(data);
      setCompetitionActive(data.some((l) => l.competition_mode));
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectRange = () => {
    const ids = lanes.map((l) => l.id);
    if (selected.size === 0) setSelected(new Set(ids));
    else setSelected(new Set());
  };

  const bulk = async (action: string, payload?: Record<string, unknown>) => {
    const laneIds = selected.size ? [...selected] : lanes.map((l) => l.id);
    await api.bulkLanes({ laneIds, action, payload });
    setSelected(new Set());
    load();
  };

  const statusLabel = (s: string) => (s === 'waiting' ? '대기중' : s === 'paused' ? '일시정지' : '이용중');
  const statusClass = (s: string) => (s === 'waiting' ? 'lane-waiting' : s === 'paused' ? 'lane-paused' : 'lane-active');

  const addPlayer = async (laneId: number) => {
    await api.addPlayer(laneId, { name: '게스트', player_type: '일반' });
    load();
  };

  const updatePlayer = async (laneId: number, p: LanePlayer, patch: Partial<LanePlayer>) => {
    await api.patchPlayer(laneId, p.id, patch);
    load();
  };

  const removePlayer = async (laneId: number, playerId: number) => {
    await api.deletePlayer(laneId, playerId);
    load();
  };

  const endGame = async (laneId: number) => {
    if (!confirm('게임을 종료하시겠습니까?')) return;
    await api.endGame(laneId);
    load();
  };

  return (
    <>
      <h1 className="page-title">볼링장 관리 - 레인관리</h1>
      <p className="page-desc">플레이어·머신·점수·정산을 관리합니다. 회색=대기, 파랑=이용, 빨강=일시정지</p>

      <div className="lane-toolbar">
        <button type="button" className="tb tb-gray" onClick={selectRange}>전체선택</button>
        <button type="button" className="tb tb-blue" onClick={() => setAssignOpen(true)}>레인배정</button>
        <button type="button" className="tb tb-green" onClick={() => bulk('resume')}>플레이가능</button>
        <button type="button" className="tb tb-red" onClick={() => bulk('pause')}>일시정지</button>
        <button type="button" className="tb tb-yellow" onClick={() => bulk('power', { on: true })}>머신 ON</button>
        <button type="button" className="tb tb-gray" onClick={() => bulk('power', { on: false })}>머신 OFF</button>
        {competitionActive && (
          <button type="button" className="tb tb-red" onClick={async () => { await api.endCompetition(); load(); }}>
            대회모드 종료
          </button>
        )}
      </div>

      <div className="lane-grid">
        {lanes.map((lane) => (
          <article key={lane.id} className={`lane-card ${statusClass(lane.status)} ${lane.collapsed ? 'collapsed' : ''}`}>
            <header className="lane-header">
              <label>
                <input type="checkbox" checked={selected.has(lane.id)} onChange={() => toggleSelect(lane.id)} />
                <span>{lane.id}번레인</span>
              </label>
              <span className="lane-status">{statusLabel(lane.status)}</span>
              <button type="button" className="lane-mini" onClick={() => api.patchLane(lane.id, { collapsed: lane.collapsed ? 0 : 1 }).then(load)}>−</button>
            </header>

            {!lane.collapsed && (
              <>
                <div className="lane-meta">
                  <span>모드: {lane.score_mode}</span>
                  <span>{lane.game_type}</span>
                  <button
                    type="button"
                    className={`power-btn ${lane.power_on ? 'on' : ''}`}
                    onClick={() => api.patchLane(lane.id, { power_on: lane.power_on ? 0 : 1 }).then(load)}
                  >
                    전원
                  </button>
                </div>

                <ul className="player-list">
                  {lane.players.map((p) => (
                    <li key={p.id} className="player-row">
                      <input
                        className="player-name"
                        value={p.name}
                        onChange={(e) => updatePlayer(lane.id, p, { name: e.target.value })}
                        list={`members-${lane.id}`}
                      />
                      <datalist id={`members-${lane.id}`} />
                      <select
                        value={p.player_type}
                        onChange={(e) => updatePlayer(lane.id, p, { player_type: e.target.value })}
                      >
                        {FEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <label className="shoe-chk">
                        <input
                          type="checkbox"
                          checked={!!p.shoe_rental}
                          onChange={(e) => updatePlayer(lane.id, p, { shoe_rental: e.target.checked ? 1 : 0 })}
                        />
                        대화
                      </label>
                      <span className="game-cnt">{p.game_count}G</span>
                      <button type="button" className="btn-icon" onClick={() => updatePlayer(lane.id, p, { game_count: p.game_count + 1 })}>+</button>
                      <button type="button" className="btn-icon danger" onClick={() => removePlayer(lane.id, p.id)}>×</button>
                    </li>
                  ))}
                </ul>

                <footer className="lane-footer">
                  {lane.players.length < 6 && (
                    <button type="button" className="btn-secondary" onClick={() => addPlayer(lane.id)}>추가</button>
                  )}
                  <select
                    value={lane.score_mode}
                    onChange={(e) => api.patchLane(lane.id, { score_mode: e.target.value }).then(load)}
                  >
                    {SCORE_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {lane.status !== 'paused' ? (
                    <button type="button" className="btn-danger" onClick={() => api.patchLane(lane.id, { status: 'paused' }).then(load)}>일시정지</button>
                  ) : (
                    <button type="button" className="btn-success" onClick={() => api.patchLane(lane.id, { status: 'active' }).then(load)}>재개</button>
                  )}
                  <button type="button" className="btn-primary" onClick={() => endGame(lane.id)}>게임종료</button>
                </footer>
              </>
            )}
          </article>
        ))}
      </div>

      {assignOpen && (
        <Modal
          title="레인배정"
          onClose={() => setAssignOpen(false)}
          actions={
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                await bulk('assign', assignForm);
                setAssignOpen(false);
              }}
            >
              확인
            </button>
          }
        >
          <p style={{ marginBottom: 12, fontSize: 13 }}>선택된 {selected.size || 16}개 레인에 배정합니다.</p>
          <div className="form-row">
            <label>인원</label>
            <select value={assignForm.player_count} onChange={(e) => setAssignForm({ ...assignForm, player_count: +e.target.value })}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}명</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>게임종류</label>
            <select value={assignForm.game_type} onChange={(e) => setAssignForm({ ...assignForm, game_type: e.target.value })}>
              <option value="일반">일반</option>
              <option value="정기전">정기전</option>
              <option value="연습">연습</option>
            </select>
          </div>
          <div className="form-row">
            <label>요금구분</label>
            <select value={assignForm.player_type} onChange={(e) => setAssignForm({ ...assignForm, player_type: e.target.value })}>
              {FEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </Modal>
      )}
    </>
  );
}
