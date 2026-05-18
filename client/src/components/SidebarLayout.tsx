'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './Layout.css';

const nav = [
  {
    label: '볼링장 관리',
    items: [
      { href: '/bowling/business', label: '영업관리' },
      { href: '/bowling/lanes', label: '레인관리' },
      { href: '/bowling/lockers', label: '락커관리' },
    ],
  },
  {
    label: '마감 관리',
    items: [
      { href: '/closing/fees', label: '요금관리' },
      { href: '/closing/daily', label: '마감관리' },
      { href: '/closing/stats', label: '마감통계' },
    ],
  },
  {
    label: '대회 관리',
    items: [
      { href: '/tournaments/manage', label: '대회관리' },
      { href: '/tournaments/scores', label: '점수집계' },
    ],
  },
  {
    label: '회원 관리',
    items: [
      { href: '/members/list', label: '회원관리' },
      { href: '/members/stats', label: '회원통계' },
      { href: '/members/clubs', label: '클럽관리' },
      { href: '/members/club-stats', label: '클럽통계' },
    ],
  },
  {
    label: '환경설정',
    items: [
      { href: '/settings/basic', label: '기본설정' },
      { href: '/settings/notices', label: '공지관리' },
      { href: '/settings/skins', label: '스킨관리' },
      { href: '/settings/license', label: '라이선스' },
    ],
  },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">●</span>
          <div>
            <strong>볼링원</strong>
            <small>온스코어링</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          {nav.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={pathname === item.href ? 'nav-link active' : 'nav-link'}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">www.bowlingone.com</div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
