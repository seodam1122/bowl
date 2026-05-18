'use client';

import { useEffect, useState } from 'react';
import { api, Club } from '@/lib/api';
import Modal from '@/components/Modal';

export default function ClubsPage() {
  const [list, setList] = useState<Club[]>([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<Partial<Club> | null>(null);

  const load = () => api.getClubs(q).then(setList);
  useEffect(() => { load(); }, []);

  return (
    <>
      <h1 className="page-title">회원 관리 - 클럽관리</h1>
      <p className="page-desc">클럽 등록·수정·삭제</p>
      <div className="toolbar card" style={{ padding: 16 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="클럽명" />
        <button type="button" className="btn-secondary" onClick={load}>검색</button>
        <button type="button" className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setModal({ name: '', remarks: '' })}>등록</button>
      </div>
      <table>
        <thead><tr><th>번호</th><th>클럽명</th><th>회원수</th><th>비고</th><th>등록일</th></tr></thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td><button type="button" className="link-btn" onClick={() => setModal(c)}>{c.name}</button></td>
              <td>{c.member_count}</td>
              <td>{c.remarks}</td>
              <td>{c.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && (
        <Modal title={modal.id ? '클럽상세' : '클럽등록'} onClose={() => setModal(null)}
          actions={
            <>
              {modal.id && <button type="button" className="btn-danger" onClick={async () => { await api.deleteClub(modal.id!); setModal(null); load(); }}>삭제</button>}
              <button type="button" className="btn-primary" onClick={async () => { if (modal.id) await api.updateClub(modal.id, modal); else await api.createClub(modal); setModal(null); load(); }}>저장</button>
            </>
          }>
          <div className="form-row"><label>클럽명</label><input value={modal.name || ''} onChange={(e) => setModal({ ...modal, name: e.target.value })} /></div>
          <div className="form-row"><label>비고</label><textarea value={modal.remarks || ''} onChange={(e) => setModal({ ...modal, remarks: e.target.value })} /></div>
        </Modal>
      )}
      <style>{`.link-btn{background:none;color:var(--lane-active)}`}</style>
    </>
  );
}
