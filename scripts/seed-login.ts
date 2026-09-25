import { createClient } from "@supabase/supabase-js";
import { hashPassword } from "../src/lib/passwords";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const username = process.env.DEMO_USERNAME;
const password = process.env.DEMO_PASSWORD;

if (!url || !key) {
  console.log(
    "Supabase is not configured. The local demo signs in as username demo, password local-demo.",
  );
  process.exit(0);
}

if (!username || !password) {
  console.error(
    "Set DEMO_USERNAME and DEMO_PASSWORD in the environment. Do not commit them.",
  );
  process.exit(1);
}

async function main() {
  const supabase = createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const passwordHash = hashPassword(password!);
  const { error } = await supabase.from("logins").upsert(
    { username, password_hash: passwordHash },
    { onConflict: "username" },
  );
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(`Stored a password hash for ${username}.`);
}

void main();
