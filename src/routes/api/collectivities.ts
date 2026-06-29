import { json } from '@tanstack/start';
import { defineEventHandler, getQuery } from 'h3';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const limit = Math.min(parseInt((query.limit as string) || '40000', 10), 40000);

  const headers = {
    'Content-Type': 'application/json',
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  try {
    // Fetch all collectivities with limit (max 40000)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/collectivities?select=id,name,population,epci_id,epci_name&order=name&limit=${limit}`,
      { headers }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('Supabase error:', response.status, text);
      throw new Error(`Supabase: ${response.status} ${response.statusText}`);
    }

    const collectivities = await response.json();
    return json({ collectivities: collectivities || [] });
  } catch (error) {
    console.error('Collectivities API error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        collectivities: [],
      },
      { status: 500 }
    );
  }
});
