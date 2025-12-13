/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../types';

interface Proposal {
  id: number;
  owner: string;
  is_active: number;
  is_sent: number;
  schedule_data: string | null;
  updated_at: string;
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

// GET - Get both proposals
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
    const proposals = await env.DB.prepare(
      'SELECT * FROM proposals ORDER BY owner'
    ).all<Proposal>();
    
    return new Response(JSON.stringify({ proposals: proposals.results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch proposals' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update a proposal
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
      action: 'activate' | 'deactivate' | 'update_schedule' | 'copy_from_confirmed' | 'copy_from_other' | 'send' | 'respond' | 'accept';
      owner: 'Klas' | 'Jennifer';
      schedule_data?: Array<{ switch_date: string; parent_after: string }>;
    };
    
    const { action, owner } = body;
    
    // Actions that require being the owner
    const ownerOnlyActions = ['activate', 'deactivate', 'update_schedule', 'copy_from_confirmed', 'copy_from_other', 'send'];
    // Actions that require being the OTHER person (responding to someone else's proposal)
    const otherPersonActions = ['respond', 'accept'];
    
    if (ownerOnlyActions.includes(action) && owner !== user.username) {
      return new Response(JSON.stringify({ error: 'Can only modify your own proposal' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (otherPersonActions.includes(action) && owner === user.username) {
      return new Response(JSON.stringify({ error: 'Can only respond to other person\'s proposal' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    switch (action) {
      case 'activate': {
        // Get confirmed schedule and copy it as starting point
        const schedule = await env.DB.prepare(
          'SELECT switch_date, parent_after FROM schedule ORDER BY switch_date'
        ).all();
        
        await env.DB.prepare(
          `UPDATE proposals SET is_active = 1, is_sent = 0, schedule_data = ?, updated_at = CURRENT_TIMESTAMP WHERE owner = ?`
        ).bind(JSON.stringify(schedule.results), owner).run();
        break;
      }
      
      case 'deactivate': {
        await env.DB.prepare(
          `UPDATE proposals SET is_active = 0, is_sent = 0, schedule_data = NULL, updated_at = CURRENT_TIMESTAMP WHERE owner = ?`
        ).bind(owner).run();
        break;
      }
      
      case 'update_schedule': {
        if (!body.schedule_data) {
          return new Response(JSON.stringify({ error: 'schedule_data required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        await env.DB.prepare(
          `UPDATE proposals SET schedule_data = ?, updated_at = CURRENT_TIMESTAMP WHERE owner = ?`
        ).bind(JSON.stringify(body.schedule_data), owner).run();
        break;
      }
      
      case 'copy_from_confirmed': {
        const schedule = await env.DB.prepare(
          'SELECT switch_date, parent_after FROM schedule ORDER BY switch_date'
        ).all();
        
        await env.DB.prepare(
          `UPDATE proposals SET schedule_data = ?, updated_at = CURRENT_TIMESTAMP WHERE owner = ?`
        ).bind(JSON.stringify(schedule.results), owner).run();
        break;
      }
      
      case 'copy_from_other': {
        const otherOwner = owner === 'Klas' ? 'Jennifer' : 'Klas';
        const otherProposal = await env.DB.prepare(
          'SELECT schedule_data FROM proposals WHERE owner = ?'
        ).bind(otherOwner).first<Proposal>();
        
        if (!otherProposal?.schedule_data) {
          return new Response(JSON.stringify({ error: 'Other proposal has no data' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        await env.DB.prepare(
          `UPDATE proposals SET schedule_data = ?, updated_at = CURRENT_TIMESTAMP WHERE owner = ?`
        ).bind(otherProposal.schedule_data, owner).run();
        break;
      }
      
      case 'send': {
        // Mark proposal as sent to other person
        await env.DB.prepare(
          `UPDATE proposals SET is_sent = 1, updated_at = CURRENT_TIMESTAMP WHERE owner = ?`
        ).bind(owner).run();
        break;
      }
      
      case 'respond': {
        // Copy this proposal to your own proposal and activate it
        // "owner" here is the OTHER person's proposal we're responding to
        const proposal = await env.DB.prepare(
          'SELECT schedule_data FROM proposals WHERE owner = ?'
        ).bind(owner).first<Proposal>();
        
        if (!proposal?.schedule_data) {
          return new Response(JSON.stringify({ error: 'Proposal has no data' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Activate user's own proposal with copy of other's schedule
        await env.DB.prepare(
          `UPDATE proposals SET is_active = 1, is_sent = 0, schedule_data = ?, updated_at = CURRENT_TIMESTAMP WHERE owner = ?`
        ).bind(proposal.schedule_data, user.username).run();
        break;
      }
      
      case 'accept': {
        // Replace confirmed schedule with this proposal's data
        // "owner" here is the proposal being accepted
        const proposal = await env.DB.prepare(
          'SELECT schedule_data FROM proposals WHERE owner = ?'
        ).bind(owner).first<Proposal>();
        
        if (!proposal?.schedule_data) {
          return new Response(JSON.stringify({ error: 'Proposal has no data' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const newSchedule = JSON.parse(proposal.schedule_data) as Array<{ switch_date: string; parent_after: string }>;
        
        // Delete all existing schedule
        await env.DB.prepare('DELETE FROM schedule').run();
        
        // Insert new schedule
        for (const entry of newSchedule) {
          await env.DB.prepare(
            'INSERT INTO schedule (switch_date, parent_after) VALUES (?, ?)'
          ).bind(entry.switch_date, entry.parent_after).run();
        }
        
        // Deactivate both proposals
        await env.DB.prepare(
          `UPDATE proposals SET is_active = 0, is_sent = 0, schedule_data = NULL, updated_at = CURRENT_TIMESTAMP`
        ).run();
        
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
