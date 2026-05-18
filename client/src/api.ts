const BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json();
}

export const api = {
  getBusinessDay: () => request<BusinessDay>('/business-day'),
  putBusinessDay: (data: BusinessDay) =>
    request('/business-day', { method: 'PUT', body: JSON.stringify(data) }),

  getLanes: () => request<Lane[]>('/lanes'),
  patchLane: (id: number, data: Partial<Lane>) =>
    request(`/lanes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addPlayer: (laneId: number, data: Partial<LanePlayer>) =>
    request(`/lanes/${laneId}/players`, { method: 'POST', body: JSON.stringify(data) }),
  patchPlayer: (laneId: number, playerId: number, data: Partial<LanePlayer>) =>
    request(`/lanes/${laneId}/players/${playerId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePlayer: (laneId: number, playerId: number) =>
    request(`/lanes/${laneId}/players/${playerId}`, { method: 'DELETE' }),
  endGame: (laneId: number) => request(`/lanes/${laneId}/end-game`, { method: 'POST' }),
  bulkLanes: (data: { laneIds: number[]; action: string; payload?: Record<string, unknown> }) =>
    request('/lanes/bulk', { method: 'POST', body: JSON.stringify(data) }),

  getLockers: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return request<Locker[]>(`/lockers${q ? `?${q}` : ''}`);
  },
  createLocker: (data: Partial<Locker>) =>
    request('/lockers', { method: 'POST', body: JSON.stringify(data) }),
  updateLocker: (id: number, data: Partial<Locker>) =>
    request(`/lockers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLocker: (id: number) => request(`/lockers/${id}`, { method: 'DELETE' }),

  getFees: () => request<FeeSetting[]>('/fees'),
  putFees: (data: { fees: FeeSetting[]; shoe_fee?: number }) =>
    request('/fees', { method: 'PUT', body: JSON.stringify(data) }),

  getClosing: (date?: string) =>
    request<ClosingData>(`/closing${date ? `?date=${date}` : ''}`),
  postClosing: (date?: string) =>
    request('/closing', { method: 'POST', body: JSON.stringify({ date }) }),
  getClosingStats: () => request<ClosingStats>('/closing/stats'),

  getMembers: (q?: string) => request<Member[]>(`/members${q ? `?q=${q}` : ''}`),
  createMember: (data: Partial<Member>) =>
    request('/members', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id: number, data: Partial<Member>) =>
    request(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id: number) => request(`/members/${id}`, { method: 'DELETE' }),
  getMemberStats: (month?: string) =>
    request<MemberStat[]>(`/members/stats${month ? `?month=${month}` : ''}`),
  searchMembers: (q: string) => request<{ id: number; name: string; category: string }[]>(`/members/search?q=${q}`),

  getClubs: (q?: string) => request<Club[]>(`/clubs${q ? `?q=${q}` : ''}`),
  createClub: (data: Partial<Club>) =>
    request('/clubs', { method: 'POST', body: JSON.stringify(data) }),
  updateClub: (id: number, data: Partial<Club>) =>
    request(`/clubs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClub: (id: number) => request(`/clubs/${id}`, { method: 'DELETE' }),
  getClubStats: (month?: string) =>
    request<ClubStat[]>(`/clubs/stats${month ? `?month=${month}` : ''}`),

  getTournaments: () => request<Tournament[]>('/tournaments'),
  createTournament: (data: Partial<Tournament>) =>
    request('/tournaments', { method: 'POST', body: JSON.stringify(data) }),
  updateTournament: (id: number, data: Partial<Tournament>) =>
    request(`/tournaments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getParticipants: (id: number) => request<TournamentParticipant[]>(`/tournaments/${id}/participants`),
  saveParticipants: (id: number, participants: TournamentParticipant[]) =>
    request(`/tournaments/${id}/participants`, {
      method: 'POST',
      body: JSON.stringify({ participants }),
    }),
  assignLanes: (id: number) => request(`/tournaments/${id}/assign-lanes`, { method: 'POST' }),
  endCompetition: () => request('/tournaments/end-competition', { method: 'POST' }),

  getSettings: () => request<Record<string, string>>('/settings'),
  putSettings: (data: Record<string, string>) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getNotices: () => request<{ id: number; content: string }[]>('/notices'),
  putNotices: (notices: string[]) =>
    request('/notices', { method: 'PUT', body: JSON.stringify({ notices }) }),
};

export interface BusinessDay {
  date: string;
  day_type: string;
  am_start: string;
  pm_start: string;
  night_start: string;
}

export interface LanePlayer {
  id: number;
  lane_id: number;
  name: string;
  player_type: string;
  shoe_rental: number;
  game_count: number;
  settled: number;
  sort_order: number;
}

export interface Lane {
  id: number;
  status: 'waiting' | 'active' | 'paused';
  game_type: string;
  power_on: number;
  score_mode: string;
  collapsed: number;
  competition_mode: number;
  players: LanePlayer[];
}

export interface Locker {
  id: number;
  locker_number: string;
  locker_type: string;
  user_name: string;
  contact: string;
  start_date: string;
  end_date: string;
  status: string;
  remarks: string;
}

export interface FeeSetting {
  id?: number;
  name: string;
  payment_type: string;
  game_count: number;
  shoe_fee?: number;
  pricing: {
    weekday: { morning: number; afternoon: number; night: number };
    weekend: { morning: number; afternoon: number; night: number };
    special: { morning: number; afternoon: number; night: number };
  };
}

export interface ClosingData {
  date: string;
  settlements: Settlement[];
  summary: { category: string; qty: number; total_fee: number; cash: number; card: number }[];
  hourly: { hour: string; users: number; games: number; fee: number }[];
  closed: { business_date: string; closed_at: string } | null;
}

export interface Settlement {
  id: number;
  business_date: string;
  lane_id: number;
  player_name: string;
  category: string;
  game_count: number;
  shoe_rental: number;
  fee: number;
  card_payment: number;
}

export interface ClosingStats {
  monthly: { month: string; amount: number }[];
  byCategory: { category: string; amount: number; games: number }[];
}

export interface Member {
  id: number;
  name: string;
  category: string;
  contact: string;
  club_id: number | null;
  club_name?: string;
  remarks: string;
  created_at: string;
}

export interface MemberStat {
  name: string;
  game_count: number;
  game_fee: number;
}

export interface Club {
  id: number;
  name: string;
  remarks: string;
  member_count: number;
  created_at: string;
}

export interface ClubStat {
  club_name: string;
  game_count: number;
  game_fee: number;
}

export interface Tournament {
  id: number;
  name: string;
  type: string;
  round_num: number;
  game_count: number;
  participant_count: number;
  lane_from: number;
  lane_to: number;
  lane_movement: string;
  status: string;
}

export interface TournamentParticipant {
  id?: number;
  name: string;
  handicap: number;
  team_name: string;
  lane_order: number;
  scores: number[];
}
