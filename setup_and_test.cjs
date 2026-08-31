const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
global.WebSocket = WebSocket;
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  if (line && line.includes('=')) {
    const [key, ...val] = line.split('=');
    acc[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
  }
  return acc;
}, {});

const supabaseUrl = env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
// The local dev CLI service key can be derived, or we can just use anon key if we can create users?
// Wait, I can't create auth users with anon key.
// Let's just create a SQL script that creates these test users and test it.
