// Connect the site to your Supabase project.
// Find both values in Supabase → Project Settings → API (or the "Connect" button).
// The anon/publishable key is meant to be public: the database rules in
// supabase/setup.sql decide what each person can see and change.
window.BC_CONFIG = {
  supabaseUrl: 'https://ffdohykdcbqgekwpagmc.supabase.co',
  supabaseAnonKey: 'sb_publishable_jBCOx3KMy7tqPHtVhm0vjw_Kat1wbBq',
  // Optional: extra TURN servers for calls on strict networks, e.g.
  // [{ urls: 'turn:example.com:3478', username: '...', credential: '...' }]
  turnServers: [],
};
