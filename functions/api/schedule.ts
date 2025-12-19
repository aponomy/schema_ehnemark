/// <reference types="@cloudflare/workers-types" />
import type { Env, Schedule } from '../types';

interface DayComment {
  date: string;
  comment: string;
  author: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  
  try {
    const result = await env.DB.prepare(
      'SELECT * FROM schedule ORDER BY switch_date ASC'
    ).all<Schedule>();

    // Also get confirmed day comments
    const dayCommentsResult = await env.DB.prepare(
      'SELECT comment_date as date, comment, author FROM day_comments ORDER BY comment_date ASC'
    ).all<DayComment>();
    
    return new Response(JSON.stringify({ 
      schedule: result.results,
      dayComments: dayCommentsResult.results || []
    }), {
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
