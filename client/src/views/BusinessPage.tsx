'use client';

import { useEffect, useState } from 'react';
import { api, BusinessDay } from '@/lib/api';
import Modal from '@/components/Modal';

export default function BusinessPage() {
  const [day, setDay] = useState<BusinessDay | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BusinessDay | null>(null);

  const load = () => api.getBusinessDay().then(setDay);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form) return;
    await api.putBusinessDay(form);
    setOpen(false);
    load();
  };

  return (
    <>
      <h1 className="page-title">볼링장 관리 - 영업관리</h1>
      <p className="page-desc">영업일 정보를 등록하고 오전/오후/야간 시간을 설정합니다. (마감관리 → 요금관리와 연동)</p>

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ fontSize: 18 }}>{day?.date}</strong>
          <span style={{ marginLeft: 12, color: 'var(--gray-600)' }}>{day?.day_type}</span>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--gray-600)' }}>
            오전 {day?.am_start} · 오후 {day?.pm_start} · 야간 {day?.night_start}
          </div>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setForm(day || { date: new Date().toISOString().slice(0, 10), day_type: '평일', am_start: '09:00', pm_start: '14:00', night_start: '18:00' });
            setOpen(true);
          }}
        >
          영업일 정보
        </button>
      </div>

      <div className="card">
        <p style={{ color: 'var(--gray-600)', fontSize: 14 }}>
          레인관리 메뉴에서 플레이어·머신·점수를 관리할 수 있습니다. 상단 메뉴의 <strong>레인관리</strong>로 이동하세요.
        </p>
      </div>

      {open && form && (
        <Modal
          title={`${form.date} 영업정보 등록`}
          onClose={() => setOpen(false)}
          actions={<button type="button" className="btn-primary" onClick={save}>확인</button>}
        >
          <div className="form-row">
            <label>영업일 종류</label>
            <select value={form.day_type} onChange={(e) => setForm({ ...form, day_type: e.target.value })}>
              <option value="평일">평일</option>
              <option value="주말">주말</option>
              <option value="특일">특일</option>
            </select>
          </div>
          <div className="form-row">
            <label>오전 시작</label>
            <input type="time" value={form.am_start} onChange={(e) => setForm({ ...form, am_start: e.target.value })} />
          </div>
          <div className="form-row">
            <label>오후 시작</label>
            <input type="time" value={form.pm_start} onChange={(e) => setForm({ ...form, pm_start: e.target.value })} />
          </div>
          <div className="form-row">
            <label>야간 시작</label>
            <input type="time" value={form.night_start} onChange={(e) => setForm({ ...form, night_start: e.target.value })} />
          </div>
        </Modal>
      )}
    </>
  );
}
