/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../types';

interface Proposal {
  id: number;
  is_active: number;
  schedule_data: string | null;
  day_comments: string | null;
  created_by: string;
  last_updated_by: string;
  jennifer_accepted: number;
  klas_accepted: number;
  created_at: string;
  updated_at: string;
}

interface ProposalComment {
  id: number;
  author: string;
  comment: string;
  created_at: string;
}

// Helper to get user from token
function getUserFromToken(request: Request): { userId: number; username: string } | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    return JSON.parse(atob(token));
  } catch {
    return null;
  }
}

// GET - Get the proposal and comments
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  
  const user = getUserFromToken(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Get active proposal (there should only be one or none)
    const proposal = await env.DB.prepare(
      'SELECT * FROM proposal WHERE is_active = 1 LIMIT 1'
    ).first<Proposal>();
    
    // Get all comments
    const comments = await env.DB.prepare(
      'SELECT * FROM proposal_comments ORDER BY created_at ASC'
    ).all<ProposalComment>();
    
    return new Response(JSON.stringify({ 
      proposal: proposal || null,
      comments: comments.results || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Failed to fetch proposal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update the proposal
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  
  const user = getUserFromToken(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const body = await request.json() as {
      action: 'create' | 'update_schedule' | 'update_day_comments' | 'add_comment' | 'accept' | 'delete';
      schedule_data?: Array<{ switch_date: string; parent_after: string }>;
      day_comments?: Array<{ date: string; comment: string; author: string }>;
      comment?: string;
    };
    
    const { action } = body;
    
    switch (action) {
      case 'create': {
        // Check if proposal already exists
        const existing = await env.DB.prepare(
          'SELECT id FROM proposal WHERE is_active = 1'
        ).first();
        
        if (existing) {
          return new Response(JSON.stringify({ error: 'Proposal already exists' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Get confirmed schedule as starting point
        const schedule = await env.DB.prepare(
          'SELECT switch_date, parent_after FROM schedule ORDER BY switch_date'
        ).all();

        // Get confirmed day comments as starting point
        const dayComments = await env.DB.prepare(
          'SELECT comment_date as date, comment, author FROM day_comments ORDER BY comment_date'
        ).all();
        
        // Create new proposal with both acceptances reset
        await env.DB.prepare(
          `INSERT INTO proposal (is_active, schedule_data, day_comments, created_by, last_updated_by, jennifer_accepted, klas_accepted, created_at, updated_at) 
           VALUES (1, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        ).bind(JSON.stringify(schedule.results), JSON.stringify(dayComments.results || []), user.username, user.username).run();

        // Clear any old comments
        await env.DB.prepare('DELETE FROM proposal_comments').run();
        break;
      }
      
      case 'update_schedule': {
        if (!body.schedule_data) {
          return new Response(JSON.stringify({ error: 'schedule_data required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // When schedule is updated, reset both acceptances
        await env.DB.prepare(
          `UPDATE proposal SET schedule_data = ?, last_updated_by = ?, jennifer_accepted = 0, klas_accepted = 0, updated_at = CURRENT_TIMESTAMP WHERE is_active = 1`
        ).bind(JSON.stringify(body.schedule_data), user.username).run();
        break;
      }

      case 'update_day_comments': {
        if (!body.day_comments) {
          return new Response(JSON.stringify({ error: 'day_comments required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // When day comments are updated, reset both acceptances
        const dayCommentsJson = JSON.stringify(body.day_comments);
        await env.DB.prepare(
          `UPDATE proposal SET day_comments = ?, last_updated_by = ?, jennifer_accepted = 0, klas_accepted = 0, updated_at = CURRENT_TIMESTAMP WHERE is_active = 1`
        ).bind(dayCommentsJson, user.username).run();
        break;
      }
      
      case 'add_comment': {
        if (!body.comment?.trim()) {
          return new Response(JSON.stringify({ error: 'comment required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        await env.DB.prepare(
          `INSERT INTO proposal_comments (author, comment, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)`
        ).bind(user.username, body.comment.trim()).run();
        break;
      }
      
      case 'accept': {
        // Get the proposal
        const proposal = await env.DB.prepare(
          'SELECT schedule_data, day_comments, jennifer_accepted, klas_accepted FROM proposal WHERE is_active = 1'
        ).first<Proposal>();
        
        if (!proposal?.schedule_data) {
          return new Response(JSON.stringify({ error: 'No active proposal' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Mark this user as accepted
        const acceptField = user.username === 'Jennifer' ? 'jennifer_accepted' : 'klas_accepted';
        await env.DB.prepare(
          `UPDATE proposal SET ${acceptField} = 1, updated_at = CURRENT_TIMESTAMP WHERE is_active = 1`
        ).run();
        
        // Check if both have now accepted
        const updatedProposal = await env.DB.prepare(
          'SELECT jennifer_accepted, klas_accepted, schedule_data, day_comments FROM proposal WHERE is_active = 1'
        ).first<Proposal>();
        
        if (updatedProposal?.jennifer_accepted && updatedProposal?.klas_accepted) {
          // Both accepted - apply the proposal to confirmed schedule
          const newSchedule = JSON.parse(updatedProposal.schedule_data!) as Array<{ switch_date: string; parent_after: string }>;
          
          // Delete all existing schedule
          await env.DB.prepare('DELETE FROM schedule').run();
          
          // Insert new schedule
          for (const entry of newSchedule) {
            await env.DB.prepare(
              'INSERT INTO schedule (switch_date, parent_after) VALUES (?, ?)'
            ).bind(entry.switch_date, entry.parent_after).run();
          }

          // Apply day comments to confirmed day_comments table
          await env.DB.prepare('DELETE FROM day_comments').run();
          if (updatedProposal.day_comments) {
            const newDayComments = JSON.parse(updatedProposal.day_comments) as Array<{ date: string; comment: string; author: string }>;
            for (const dc of newDayComments) {
              await env.DB.prepare(
                'INSERT INTO day_comments (comment_date, comment, author) VALUES (?, ?, ?)'
              ).bind(dc.date, dc.comment, dc.author).run();
            }
          }
          
          // Deactivate the proposal
          await env.DB.prepare(
            `UPDATE proposal SET is_active = 0 WHERE is_active = 1`
          ).run();
          
          // Clear comments
          await env.DB.prepare('DELETE FROM proposal_comments').run();
        }
        
        break;
      }
      
      case 'delete': {
        // Deactivate the proposal
        await env.DB.prepare(
          `UPDATE proposal SET is_active = 0 WHERE is_active = 1`
        ).run();
        
        // Clear comments
        await env.DB.prepare('DELETE FROM proposal_comments').run();
        
        break;
      }
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Failed to update proposal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
// v2
