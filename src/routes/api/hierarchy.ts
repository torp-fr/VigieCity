import { json } from '@tanstack/start';
import { defineEventHandler, getQuery } from 'h3';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const level = (query.level || '') as string;
  const region = query.region ? decodeURIComponent(query.region as string) : '';
  const department = query.department ? decodeURIComponent(query.department as string) : '';
  const epci_id = query.epci_id ? decodeURIComponent(query.epci_id as string) : '';

  const headers = {
    'Content-Type': 'application/json',
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  try {
    switch (level) {
      case 'regions': {
        // Get distinct non-null regions, sorted
        const url = `${supabaseUrl}/rest/v1/collectivities?select=region&order=region`;
        const response = await fetch(url, { headers });

        if (!response.ok) {
          console.error(`Supabase error: ${response.status} ${response.statusText}`);
          throw new Error(`Supabase: ${response.status}`);
        }

        const data = await response.json();
        const uniqueRegions = [
          ...new Set(
            data
              .map((c: any) => c.region)
              .filter((r: any) => r && typeof r === 'string' && r.trim() !== '')
          ),
        ].sort() as string[];

        return json({ regions: uniqueRegions });
      }

      case 'departments': {
        if (!region) {
          return json({ departments: [] });
        }

        const url = `${supabaseUrl}/rest/v1/collectivities?region=eq.${encodeURIComponent(region)}&select=department_code,department_name&order=department_code`;
        const response = await fetch(url, { headers });

        if (!response.ok) {
          console.error(`Supabase error: ${response.status} ${response.statusText}`);
          throw new Error(`Supabase: ${response.status}`);
        }

        const data = await response.json();
        const uniqueDepts = [
          ...new Map(
            data
              .filter((c: any) => c.department_code && c.department_name)
              .map((c: any) => [
                c.department_code,
                `${c.department_code} - ${c.department_name}`,
              ])
          ).values(),
        ].sort() as string[];

        return json({ departments: uniqueDepts });
      }

      case 'epcis': {
        if (!region || !department) {
          return json({ epcis: [] });
        }

        // Extract department code from "XX - Name" format
        const deptCode = department.split(' - ')[0].trim();

        // NOTE: Using department_code as epci identifier since epci_name doesn't exist
        // This is a temporary workaround until EPCI data is populated
        const url = `${supabaseUrl}/rest/v1/collectivities?region=eq.${encodeURIComponent(region)}&department_code=eq.${encodeURIComponent(deptCode)}&select=department_code,department_name&distinct=true&order=department_name`;
        const response = await fetch(url, { headers });

        if (!response.ok) {
          console.error(`Supabase error: ${response.status} ${response.statusText}`);
          throw new Error(`Supabase: ${response.status}`);
        }

        const data = await response.json();
        // For now, use department as EPCI (since EPCI data is not populated)
        const epcis = data.map((c: any) => ({
          id: c.department_code,
          name: c.department_name,
        }));

        return json({ epcis });
      }

      case 'communes': {
        if (!epci_id) {
          return json({ communes: [] });
        }

        // Since we're using department_code as EPCI ID for now
        const url = `${supabaseUrl}/rest/v1/collectivities?department_code=eq.${encodeURIComponent(epci_id)}&select=id,name,population&order=name`;
        const response = await fetch(url, { headers });

        if (!response.ok) {
          console.error(`Supabase error: ${response.status} ${response.statusText}`);
          throw new Error(`Supabase: ${response.status}`);
        }

        const communes = await response.json();
        return json({ communes: communes || [] });
      }

      default:
        return json({ error: 'Invalid level parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Hierarchy API error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        regions: [],
        departments: [],
        epcis: [],
        communes: [],
      },
      { status: 500 }
    );
  }
});
