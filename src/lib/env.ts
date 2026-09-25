export type IntegrationStatus = {
  redbark: boolean;
  supabase: boolean;
  postmark: boolean;
  sessionSecret: boolean;
  cronSecret: boolean;
};

export function integrationStatus(): IntegrationStatus {
  return {
    redbark: Boolean(process.env.REDBARK_API_KEY),
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    postmark: Boolean(process.env.POSTMARK_SERVER_TOKEN),
    sessionSecret: Boolean(process.env.SESSION_SECRET),
    cronSecret: Boolean(process.env.CRON_SECRET),
  };
}
