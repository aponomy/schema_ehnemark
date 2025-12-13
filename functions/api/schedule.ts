/// <reference types="@cloudflare/workers-types" />
import type { Env, Schedule } from '../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  
  try {
    const result = await env.DB.prepare(
      'SELECT * FROM schedule ORDER BY switch_date ASC'
    ).all<Schedule>();
    
    return new Response(JSON.stringify({ schedule: result.results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch schedule' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
