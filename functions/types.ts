/// <reference types="@cloudflare/workers-types" />

// Type definitions for Cloudflare Workers
export interface Env {
  DB: D1Database;
}

export interface User {
  id: number;
  username: string;
  password: string;
  phone: string;
}

export interface Schedule {
  id: number;
  switch_date: string;
  parent_after: string;
}

export interface Proposal {
  id: number;
  owner: 'Klas' | 'Jennifer';
  is_active: number;
  schedule_data: string | null;
  updated_at: string;
}
