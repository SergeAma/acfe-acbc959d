import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Verify authenticated user from JWT token
 * Use for functions that require any logged-in user
 */
export async function verifyUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }
  
  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  // Create service role client to verify the token
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid or expired token');
  }
  
  return { user, supabase };
}

/**
 * Verify service role key for internal function-to-function calls
 * Use for functions that should ONLY be called by other edge functions
 */
export async function verifyServiceRole(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  const token = authHeader?.replace('Bearer ', '');
  if (token !== serviceKey) {
    throw new Error('Service role key required');
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  return { supabase };
}

/**
 * Verify user is admin using user_roles table (secure pattern)
 * Use for functions that require admin privileges
 */
export async function verifyAdmin(req: Request) {
  const { user, supabase } = await verifyUser(req);
  
  // Use the secure get_user_role function
  const { data: roleData, error: roleError } = await supabase
    .rpc('get_user_role', { _user_id: user.id });
  
  if (roleError || roleData !== 'admin') {
    throw new Error('Admin access required');
  }
  
  return { user, supabase };
}

/**
 * Verify user is admin or moderator using user_roles table
 * Use for functions that require elevated privileges
 */
export async function verifyAdminOrModerator(req: Request) {
  const { user, supabase } = await verifyUser(req);
  
  // Use the secure get_user_role function
  const { data: roleData, error: roleError } = await supabase
    .rpc('get_user_role', { _user_id: user.id });
  
  if (roleError || !['admin', 'moderator'].includes(roleData)) {
    throw new Error('Admin or moderator access required');
  }
  
  return { user, supabase };
}
