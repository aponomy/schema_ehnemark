/// <reference types="@cloudflare/workers-types" />
import type { Env, User } from '../types';

interface LoginRequest {
  username: string;
  password: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  try {
    const body: LoginRequest = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const user = await env.DB.prepare(
      'SELECT id, username, phone FROM users WHERE username = ? AND password = ?'
    ).bind(username, password).first<User>();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create a simple session token (in production, use proper JWT)
    const token = btoa(JSON.stringify({ userId: user.id, username: user.username }));
    
    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: user.id, username: user.username },
      token 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
