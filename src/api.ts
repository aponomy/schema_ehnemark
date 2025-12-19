import type { DayComment, DayInfo, Proposal, ProposalComment, Schedule } from './types';

// Use production API when running local dev server, relative path when deployed
const API_BASE = import.meta.env.DEV 
  ? 'https://schema-ehnemark.pages.dev/api' 
  : '/api';

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
}

export function getStoredUser(): { id: number; username: string } | null {
  const token = getToken();
  if (!token) return null;
  try {
    return JSON.parse(atob(token));
  } catch {
    return null;
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, { ...options, headers });
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }
  
  setToken(data.token);
  return data.user;
}

export async function fetchSchedule(): Promise<{ schedule: Schedule[]; dayComments: DayComment[] }> {
  const res = await fetchWithAuth(`${API_BASE}/schedule`);
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch schedule');
  }
  
  return { schedule: data.schedule, dayComments: data.dayComments || [] };
}

export async function fetchProposal(): Promise<{ proposal: Proposal | null; comments: ProposalComment[] }> {
  const res = await fetchWithAuth(`${API_BASE}/proposal`);
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch proposal');
  }
  
  return { proposal: data.proposal, comments: data.comments };
}

export async function updateProposal(
  action: 'create' | 'update_schedule' | 'update_day_comments' | 'add_comment' | 'accept' | 'delete',
  options?: {
    schedule_data?: Array<{ switch_date: string; parent_after: string }>;
    day_comments?: Array<{ date: string; comment: string; author: string }>;
    comment?: string;
  }
) {
  const res = await fetchWithAuth(`${API_BASE}/proposal`, {
    method: 'PUT',
    body: JSON.stringify({ action, ...options }),
  });
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update proposal');
  }
  
  return data;
}

// Calendar utility functions
export function getMonthsFromDate(startDate: Date, count: number): Date[] {
  const months: Date[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  
  for (let i = 0; i < count; i++) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  
  return days;
}

export function getCalendarDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Get day of week (0 = Sunday, we want Monday = 0)
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;
  
  // Add days from previous month
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }
  
  // Add days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  
  // Add days from next month to fill the grid (6 rows)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }
  
  return days;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getParentForDate(date: Date, schedule: Schedule[]): 'Jennifer' | 'Klas' | null {
  const dateStr = formatDate(date);
  
  // Sort schedule by date
  const sorted = [...schedule].sort((a, b) => 
    a.switch_date.localeCompare(b.switch_date)
  );
  
  // Find the most recent switch before or on this date
  let parent: 'Jennifer' | 'Klas' | null = null;
  
  for (const entry of sorted) {
    if (entry.switch_date <= dateStr) {
      parent = entry.parent_after as 'Jennifer' | 'Klas';
    } else {
      break;
    }
  }
  
  return parent;
}

export function isSwithDay(date: Date, schedule: Schedule[]): boolean {
  const dateStr = formatDate(date);
  return schedule.some(s => s.switch_date === dateStr);
}

export function getDayInfo(date: Date, currentMonth: number, schedule: Schedule[]): DayInfo {
  return {
    date,
    parent: getParentForDate(date, schedule),
    isSwitch: isSwithDay(date, schedule),
    isCurrentMonth: date.getMonth() === currentMonth,
  };
}

export function calculateStatistics(schedule: Schedule[], startDate: Date, endDate: Date) {
  let jenniferDays = 0;
  let klasDays = 0;
  
  const current = new Date(startDate);
  while (current <= endDate) {
    const parent = getParentForDate(current, schedule);
    if (parent === 'Jennifer') {
      jenniferDays++;
    } else if (parent === 'Klas') {
      klasDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  const total = jenniferDays + klasDays;
  
  return {
    jenniferDays,
    klasDays,
    jenniferPercent: total > 0 ? Math.round((jenniferDays / total) * 100) : 0,
    klasPercent: total > 0 ? Math.round((klasDays / total) * 100) : 0,
    total,
  };
}

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
];

export const DAY_NAMES = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
