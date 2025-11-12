import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';

export const load: PageServerLoad = () => {
  // Get all subcontractors with their annual data
  const subcontractors = db
    .prepare(
      `SELECT 
        id, 
        trade_pkg, 
        trade_name, 
        fein,
        current_emr,
        emr_expiration
      FROM subcontractors
      ORDER BY trade_name`
    )
    .all() as any[];

  // Get all annual data
  const allAnnualData = db
    .prepare(
      `SELECT 
        subcontractor_id,
        year,
        recordables,
        manhours
      FROM annual_data
      ORDER BY year DESC`
    )
    .all() as any[];

  // Get unique years
  const years = [...new Set(allAnnualData.map((d: any) => d.year))].sort((a, b) => b - a);

  // Calculate 3-year TRIR for each subcontractor
  const subcontractorsWithMetrics = subcontractors.map(sub => {
    const annualData = allAnnualData.filter((d: any) => d.subcontractor_id === sub.id);
    
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

    try {
      // Update subcontractor
      db.prepare(`
        UPDATE subcontractors 
        SET trade_pkg = ?, trade_name = ?, fein = ?, current_emr = ?, emr_expiration = ?
        WHERE id = ?
      `).run(trade_pkg, trade_name, fein, current_emr, emr_expiration, id);

      // Update annual data
      const years = [...formData.keys()]
        .filter(key => key.startsWith('recordables_'))
        .map(key => parseInt(key.replace('recordables_', '')));

      for (const year of years) {
        const recordables = parseInt(formData.get(`recordables_${year}`) as string) || 0;
        const manhours = parseInt(formData.get(`manhours_${year}`) as string) || 0;

        // Check if record exists
        const existing = db
          .prepare('SELECT id FROM annual_data WHERE subcontractor_id = ? AND year = ?')
          .get(id, year);

        if (existing) {
          db.prepare(`
            UPDATE annual_data 
            SET recordables = ?, manhours = ?
            WHERE subcontractor_id = ? AND year = ?
          `).run(recordables, manhours, id, year);
        } else {
          const annualId = randomUUID();
          db.prepare(`
            INSERT INTO annual_data (id, subcontractor_id, year, recordables, manhours)
            VALUES (?, ?, ?, ?, ?)
          `).run(annualId, id, year, recordables, manhours);
        }
      }

      return { success: true };
    } catch (err) {
      console.error('Error updating subcontractor:', err);
      return fail(500, { error: 'Failed to update subcontractor' });
    }
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

    try {
      // Check if year already exists for this subcontractor
      const existing = db
        .prepare('SELECT id FROM annual_data WHERE subcontractor_id = ? AND year = ?')
        .get(subcontractorId, year);

      if (existing) {
        return fail(400, { error: 'Year already exists for this subcontractor' });
      }

      const annualId = randomUUID();
      db.prepare(`
        INSERT INTO annual_data (id, subcontractor_id, year, recordables, manhours)
        VALUES (?, ?, ?, ?, ?)
      `).run(annualId, subcontractorId, year, recordables, manhours);

      return { success: true };
    } catch (err) {
      console.error('Error adding new year:', err);
      return fail(500, { error: 'Failed to add new year' });
    }
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

    try {
      const subcontractorId = randomUUID();

      // Insert subcontractor
      db.prepare(`
        INSERT INTO subcontractors (id, trade_pkg, trade_name, fein, current_emr, emr_expiration)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(subcontractorId, trade_pkg, trade_name, fein, current_emr, emr_expiration);

      // Insert annual data for all years
      const years = [...formData.keys()]
        .filter(key => key.startsWith('recordables_'))
        .map(key => parseInt(key.replace('recordables_', '')));

      for (const year of years) {
        const recordables = parseInt(formData.get(`recordables_${year}`) as string) || 0;
        const manhours = parseInt(formData.get(`manhours_${year}`) as string) || 0;

        const annualId = randomUUID();
        db.prepare(`
          INSERT INTO annual_data (id, subcontractor_id, year, recordables, manhours)
          VALUES (?, ?, ?, ?, ?)
        `).run(annualId, subcontractorId, year, recordables, manhours);
      }

      return { success: true };
    } catch (err) {
      console.error('Error adding subcontractor:', err);
      return fail(500, { error: 'Failed to add subcontractor' });
    }
  }
};