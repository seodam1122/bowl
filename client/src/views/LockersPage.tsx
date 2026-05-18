'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { api, Locker } from '@/lib/api';
import Modal from '@/components/Modal';

const TYPES = ['더블백', '트리플백', '기타'];
const STATUSES = ['대기', '사용중', '만료'];

const empty: Partial<Locker> = {
  locker_number: '',
  locker_type: '기타',
  user_name: '',
  contact: '',
  start_date: '',
  end_date: '',
  status: '대기',
  remarks: '',
};

export default function LockersPage() {
  const [list, setList] = useState<Locker[]>([]);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<Partial<Locker> | null>(null);

  const load = () => {
    const params: Record<string, string> = {};
    if (type) params.type = type;
    if (status) params.status = status;
    if (q) params.q = q;
    api.getLockers(params).then(setList);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!modal?.locker_number) return;
    if (modal.id) await api.updateLocker(modal.id, modal as Locker);
    else await api.createLocker(modal);
    setModal(null);
    load();
  };

  const del = async () => {
    if (!modal?.id || !confirm('삭제하시겠습니까?')) return;
    await api.deleteLocker(modal.id);
    setModal(null);
    load();
  };

  const statusClass = (s: string) =>
    s === '만료' ? 'status-expired' : s === '사용중' ? 'status-use' : 'status-waiting';

  return (
    <>
      <h1 className="page-title">볼링장 관리 - 락커관리</h1>
      <p className="page-desc">락커 등록·수정·삭제 및 상태(대기/사용중/만료) 관리</p>

      <div className="toolbar card" style={{ padding: 16 }}>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">락커종류 전체</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">상태 전체</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input placeholder="락커번호/이용자명" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn-secondary" onClick={load}>검색</button>
        <button type="button" className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setModal({ ...empty })}>등록</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>락커번호</th>
            <th>종류</th>
            <th>이용자</th>
            <th>연락처</th>
            <th>이용기간</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {list.map((row) => (
            <tr key={row.id}>
              <td>
                <button type="button" className="link-btn" onClick={() => setModal(row)}>
                  {row.locker_number}
                </button>
              </td>
              <td>{row.locker_type}</td>
              <td>{row.user_name}</td>
              <td>{row.contact}</td>
              <td>{row.start_date} ~ {row.end_date}</td>
              <td className={statusClass(row.status)}>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <Modal
          title={modal.id ? '락커 상세' : '락커등록'}
          onClose={() => setModal(null)}
          actions={
            <>
              {modal.id && <button type="button" className="btn-danger" onClick={del}>삭제</button>}
              <button type="button" className="btn-primary" onClick={save}>저장</button>
            </>
          }
        >
          <FormRow label="락커번호"><input value={modal.locker_number || ''} onChange={(e) => setModal({ ...modal, locker_number: e.target.value })} /></FormRow>
          <FormRow label="종류">
            <select value={modal.locker_type} onChange={(e) => setModal({ ...modal, locker_type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormRow>
          <FormRow label="이용자"><input value={modal.user_name || ''} onChange={(e) => setModal({ ...modal, user_name: e.target.value })} /></FormRow>
          <FormRow label="연락처"><input value={modal.contact || ''} onChange={(e) => setModal({ ...modal, contact: e.target.value })} /></FormRow>
          <FormRow label="시작일"><input type="date" value={modal.start_date || ''} onChange={(e) => setModal({ ...modal, start_date: e.target.value })} /></FormRow>
          <FormRow label="종료일"><input type="date" value={modal.end_date || ''} onChange={(e) => setModal({ ...modal, end_date: e.target.value })} /></FormRow>
          <FormRow label="상태">
            <select value={modal.status} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormRow>
          <FormRow label="비고"><textarea rows={3} value={modal.remarks || ''} onChange={(e) => setModal({ ...modal, remarks: e.target.value })} /></FormRow>
        </Modal>
      )}

      <style>{`.link-btn{background:none;color:var(--lane-active);padding:0;text-decoration:underline}`}</style>
    </>
  );
}

function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="form-row">
      <label>{label}</label>
      {children}
    </div>
  );
}
