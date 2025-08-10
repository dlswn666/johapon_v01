import { createClient } from '@supabase/supabase-js';

const projectId = 'xschknzenjbxtxddkxrnq';
const publicAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzY2hrbnplbmpidHhkZGt4cm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNzgzNDgsImV4cCI6MjA2Mjk1NDM0OH0.EASwXT9GTV6kpqAZIkY0WUxGnTJ3BBHF3m0GWmdSwqQ';

export const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

export { projectId, publicAnonKey };
