const client = globalThis.BHATTI?.db;

if (!client) {
  throw new Error("BHATTI Supabase client is not initialized.");
}

export const supabase = client;
