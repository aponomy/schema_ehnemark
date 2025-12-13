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
  is_active: boolean | number; // SQLite returns 0/1
  schedule_data: string; // JSON string of Schedule[]
  created_by: string;
  last_updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProposalComment {
  id: number;
  author: string;
  comment: string;
  created_at: string;
}

export interface DayInfo {
  date: Date;
  parent: 'Jennifer' | 'Klas' | null;
  isSwitch: boolean;
  isCurrentMonth: boolean;
}

export type ViewMode = 'confirmed' | 'proposal';
