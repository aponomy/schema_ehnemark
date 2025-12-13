export interface User {
  id: number;
  username: string;
}

export interface Schedule {
  id: number;
  switch_date: string;
  parent_after: string;
}

export interface Proposal {
  id: number;
  owner: 'Klas' | 'Jennifer';
  is_active: boolean | number; // SQLite returns 0/1
  is_sent: boolean | number; // SQLite returns 0/1 - has been sent to other parent
  schedule_data: string; // JSON string of Schedule[]
  updated_at: string;
}

export interface DayInfo {
  date: Date;
  parent: 'Jennifer' | 'Klas' | null;
  isSwitch: boolean;
  isCurrentMonth: boolean;
}

export type ViewMode = 'confirmed' | 'klas' | 'jennifer';
