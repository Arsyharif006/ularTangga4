// Supabase auth configuration for OAuth redirects and provider
export const SUPABASE_OAUTH_PROVIDER = 'google';
export const SUPABASE_OAUTH_REDIRECT = typeof window !== 'undefined' ? window.location.origin + '/online/complete-profile' : '/online/complete-profile';

export default {
  provider: SUPABASE_OAUTH_PROVIDER,
  redirectTo: SUPABASE_OAUTH_REDIRECT,
};
