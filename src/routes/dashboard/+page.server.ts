import type { PageServerLoad, Actions } from './$types';
import { supabase } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
// import { seedDatabase } from '$lib/server/seed';

// seedDatabase();

export const load: PageServerLoad = () => {
  // Get all subcontractors
  return (async () => {
    const { data: subcontractors, error: subError } = await supabase
      .from('subcontractors')
      .select('*')
      .order('trade_name');
    const { data: allAnnualData, error: annualError } = await supabase
      .from('annual_data')
      .select('*')
      .order('year', { ascending: false });
    // Get unique years
    const years = [...new Set((allAnnualData || []).map((d: any) => d.year))].sort((a, b) => b - a);
    // Calculate 3-year TRIR for each subcontractor
    const subcontractorsWithMetrics = (subcontractors || []).map(sub => {
      const annualData = (allAnnualData || []).filter((d: any) => d.subcontractor_id === sub.id);
      // Get last 3 years of data
      const last3Years = annualData.slice(0, 3);
      const totalRecordables = last3Years.reduce((sum, d) => sum + d.recordables, 0);
      const totalManhours = last3Years.reduce((sum, d) => sum + d.manhours, 0);
      const threeYrTRIR = totalManhours > 0 
        ? ((totalRecordables * 200000) / totalManhours).toFixed(2)
        : '0.00';
      return {
        ...sub,
        three_yr_trir: threeYrTRIR,
        annual_data: annualData
      };
    });
    return {
      subcontractors: subcontractorsWithMetrics,
      years
    };
  })();
};

export const actions: Actions = {
  updateSubcontractor: async ({ request }) => {
    const formData = await request.formData();
    const id = formData.get('id') as string;
    const trade_pkg = formData.get('trade_pkg') as string;
    const trade_name = formData.get('trade_name') as string;
    const fein = formData.get('fein') as string;
    const current_emr = formData.get('current_emr') as string;
    const emr_expiration = formData.get('emr_expiration') as string;
    if (!id || !trade_name || !fein) {
      return fail(400, { error: 'Missing required fields' });
    }
    // Update subcontractor in Supabase
    const { error: subError } = await supabase
      .from('subcontractors')
      .update({
        trade_pkg,
        trade_name,
        fein,
        current_emr,
        emr_expiration
      })
      .eq('id', id);
    if (subError) {
      return fail(500, { error: 'Failed to update subcontractor' });
    }
    // Update annual data in Supabase
    const years = [...formData.keys()]
      .filter(key => key.startsWith('recordables_'))
      .map(key => parseInt(key.replace('recordables_', '')));
    for (const year of years) {
      const recordables = parseInt(formData.get(`recordables_${year}`) as string) || 0;
      const manhours = parseInt(formData.get(`manhours_${year}`) as string) || 0;
      // Check if record exists
      const { data: existing } = await supabase
        .from('annual_data')
        .select('id')
        .eq('subcontractor_id', id)
        .eq('year', year)
        .single();
      if (existing) {
        await supabase
          .from('annual_data')
          .update({ recordables, manhours })
          .eq('subcontractor_id', id)
          .eq('year', year);
      } else {
        const annualId = randomUUID();
        await supabase
          .from('annual_data')
          .insert({
            id: annualId,
            subcontractor_id: id,
            year,
            recordables,
            manhours
          });
      }
    }
    return { success: true };
  },

  addNewYear: async ({ request }) => {
    const formData = await request.formData();
    const subcontractorId = formData.get('subcontractor_id') as string;
    const year = parseInt(formData.get('year') as string);
    const recordables = parseInt(formData.get('recordables') as string) || 0;
    const manhours = parseInt(formData.get('manhours') as string) || 0;
    if (!subcontractorId || !year) {
      return fail(400, { error: 'Missing required fields' });
    }
    // Check if year already exists for this subcontractor in Supabase
    const { data: existing } = await supabase
      .from('annual_data')
      .select('id')
      .eq('subcontractor_id', subcontractorId)
      .eq('year', year)
      .single();
    if (existing) {
      return fail(400, { error: 'Year already exists for this subcontractor' });
    }
    const annualId = randomUUID();
    const { error: insertError } = await supabase
      .from('annual_data')
      .insert({
        id: annualId,
        subcontractor_id: subcontractorId,
        year,
        recordables,
        manhours
      });
    if (insertError) {
      return fail(500, { error: 'Failed to add new year' });
    }
    return { success: true };
  },

  addSubcontractor: async ({ request }) => {
    const formData = await request.formData();
    const trade_pkg = formData.get('trade_pkg') as string;
    const trade_name = formData.get('trade_name') as string;
    const fein = formData.get('fein') as string;
    const current_emr = formData.get('current_emr') as string;
    const emr_expiration = formData.get('emr_expiration') as string;
    if (!trade_pkg || !trade_name || !fein || !current_emr || !emr_expiration) {
      return fail(400, { error: 'All fields are required' });
    }
    const subcontractorId = randomUUID();
    // Insert subcontractor in Supabase
    const { error: subError } = await supabase
      .from('subcontractors')
      .insert({
        id: subcontractorId,
        trade_pkg,
        trade_name,
        fein,
        current_emr,
        emr_expiration
      });
    if (subError) {
      return fail(500, { error: 'Failed to add subcontractor' });
    }
    // Insert annual data for all years in Supabase
    const years = [...formData.keys()]
      .filter(key => key.startsWith('recordables_'))
      .map(key => parseInt(key.replace('recordables_', '')));
    for (const year of years) {
      const recordables = parseInt(formData.get(`recordables_${year}`) as string) || 0;
      const manhours = parseInt(formData.get(`manhours_${year}`) as string) || 0;
      const annualId = randomUUID();
      await supabase
        .from('annual_data')
        .insert({
          id: annualId,
          subcontractor_id: subcontractorId,
          year,
          recordables,
          manhours
        });
    }
    return { success: true };
  }
};