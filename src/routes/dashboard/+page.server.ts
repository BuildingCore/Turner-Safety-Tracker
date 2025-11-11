import type { PageServerLoad, Actions } from './$types';
import { seedDatabase } from '$lib/server/seed';
import { db } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';

seedDatabase(); // Run once then comment out

export const load: PageServerLoad = () => {
  // Get the 4 most recent years
  const years = db
    .prepare('SELECT DISTINCT year FROM annual_data ORDER BY year DESC LIMIT 4')
    .all()
    .map((row: any) => row.year)
    .reverse();

  // Get subcontractors with their annual data
  const subcontractors = db
    .prepare(
      `SELECT 
        s.*,
        json_group_array(
          json_object(
            'year', a.year,
            'recordables', a.recordables,
            'manhours', a.manhours
          )
        ) as annual_data
      FROM subcontractors s
      LEFT JOIN annual_data a ON s.id = a.subcontractor_id
      WHERE a.year IN (${years.map(() => '?').join(',')})
      GROUP BY s.id
      ORDER BY s.trade_pkg`
    )
    .all(...years)
    .map((row: any) => {
      const annualData = JSON.parse(row.annual_data);
      
      // Calculate 3-year TRIR using the 3 most recent years
      const recentThreeYears = annualData.slice(-3);
      const totalRecordables = recentThreeYears.reduce((sum: number, d: any) => sum + d.recordables, 0);
      const totalManhours = recentThreeYears.reduce((sum: number, d: any) => sum + d.manhours, 0);
      
      // TRIR = (Total Recordables × 200,000) / Total Man-hours
      const threeYrTrir = totalManhours > 0 ? ((totalRecordables * 200000) / totalManhours).toFixed(2) : '0.00';
      
      return {
        ...row,
        annual_data: annualData,
        three_yr_trir: threeYrTrir
      };
    });

  return {
    subcontractors,
    years
  };
};

export const actions: Actions = {
  updateSubcontractor: async ({ request }) => {
    const formData = await request.formData();
    const id = formData.get('id');
    const trade_pkg = formData.get('trade_pkg');
    const trade_name = formData.get('trade_name');
    const fein = formData.get('fein');
    const current_emr = formData.get('current_emr');
    const emr_expiration = formData.get('emr_expiration');

    try {
      // Update subcontractor info (id is now TEXT/UUID)
      db.prepare(`
        UPDATE subcontractors 
        SET trade_pkg = ?, trade_name = ?, fein = ?, current_emr = ?, emr_expiration = ?
        WHERE id = ?
      `).run(trade_pkg, trade_name, fein, current_emr, emr_expiration, id);

      // Update annual data for each year
      const updateAnnual = db.prepare(`
        UPDATE annual_data 
        SET recordables = ?, manhours = ?
        WHERE subcontractor_id = ? AND year = ?
      `);

      for (const [key, value] of formData.entries()) {
        if (key.startsWith('recordables_')) {
          const year = key.replace('recordables_', '');
          const recordables = value;
          const manhours = formData.get(`manhours_${year}`);
          updateAnnual.run(recordables, manhours, id, year);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Update error:', error);
      return fail(500, { error: 'Failed to update subcontractor' });
    }
  },

  updateAnnualData: async ({ request }) => {
    const formData = await request.formData();
    const subcontractor_id = formData.get('subcontractor_id');
    const year = formData.get('year');
    const recordables = formData.get('recordables');
    const manhours = formData.get('manhours');

    try {
      // Check if record exists
      const existing = db.prepare(`
        SELECT id FROM annual_data 
        WHERE subcontractor_id = ? AND year = ?
      `).get(subcontractor_id, year);

      if (existing) {
        // Update existing record
        db.prepare(`
          UPDATE annual_data 
          SET recordables = ?, manhours = ?
          WHERE subcontractor_id = ? AND year = ?
        `).run(recordables, manhours, subcontractor_id, year);
      } else {
        // Insert new record with UUID
        const id = randomUUID();
        db.prepare(`
          INSERT INTO annual_data (id, subcontractor_id, year, recordables, manhours)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, subcontractor_id, year, recordables, manhours);
      }

      return { success: true };
    } catch (error) {
      console.error('Update annual data error:', error);
      return fail(500, { error: 'Failed to update annual data' });
    }
  },

  addNewYear: async ({ request }) => {
    const formData = await request.formData();
    const subcontractor_id = formData.get('subcontractor_id');
    const year = formData.get('year');
    const recordables = formData.get('recordables');
    const manhours = formData.get('manhours');

    try {
      const id = randomUUID();
      db.prepare(`
        INSERT INTO annual_data (id, subcontractor_id, year, recordables, manhours)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, subcontractor_id, year, recordables, manhours);

      return { success: true };
    } catch (error) {
      console.error('Add new year error:', error);
      return fail(500, { error: 'Failed to add new year' });
    }
  }
};