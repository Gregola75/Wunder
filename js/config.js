/*
 * config.js — Conexión a Supabase (la "nube" de la app).
 *
 * La clave "anon public" está pensada para ir en el navegador: es segura
 * para publicarla. Lo que protege tus datos son las reglas de seguridad
 * (Row Level Security) que activamos en Supabase. NUNCA pongas aquí la
 * clave "service_role / secret".
 */
window.WUNDER_CONFIG = {
  SUPABASE_URL: "https://gzxxzxfitqtnefflgavc.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eHh6eGZpdHF0bmVmZmxnYXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDc2NzMsImV4cCI6MjA5NjQyMzY3M30.CHCgyRYskH88ATR0rrJsOEyrsNpdJS4NPbTV2p1LEw0",
};
