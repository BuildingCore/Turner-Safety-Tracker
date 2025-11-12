import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export const load: PageServerLoad = () => {
  // Get active RMPs
  const activeRMPs = db
    .prepare(
      `SELECT 
        r.id,
        r.project_name,
        r.submitted_date,
        r.due_date,
        r.status,
        s.trade_name as subcontractor_name
      FROM safety_rmps r
      JOIN subcontractors s ON r.subcontractor_id = s.id
      WHERE r.status IN ('Pending', 'In Review', 'Rejected')
      ORDER BY r.submitted_date DESC`
    )
    .all();

  // Get completed RMPs
  const completedRMPs = db
    .prepare(
      `SELECT 
        r.id,
        r.project_name,
        r.submitted_date,
        r.completed_date,
        r.status,
        s.trade_name as subcontractor_name
      FROM safety_rmps r
      JOIN subcontractors s ON r.subcontractor_id = s.id
      WHERE r.status IN ('Approved', 'Closed')
      ORDER BY r.completed_date DESC`
    )
    .all();

  // Get all subcontractors for the dropdown
  const subcontractors = db
    .prepare('SELECT id, trade_name FROM subcontractors ORDER BY trade_name')
    .all();

  return {
    activeRMPs,
    completedRMPs,
    subcontractors
  };
};

export const actions: Actions = {
  createRMP: async ({ request }) => {
    const formData = await request.formData();
    const subcontractorId = formData.get('subcontractor_id') as string;
    const projectName = formData.get('project_name') as string;
    const dueDate = formData.get('due_date') as string;

    // Validate inputs
    if (!subcontractorId || !projectName) {
      return fail(400, { error: 'Subcontractor and Project Name are required' });
    }

    const rmpId = randomUUID();
    const submittedDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Insert new RMP
    db.prepare(`
      INSERT INTO safety_rmps (
        id,
        subcontractor_id,
        project_name,
        submitted_date,
        due_date,
        status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      rmpId,
      subcontractorId,
      projectName,
      submittedDate,
      dueDate || null,
      'Pending'
    );

    // Create initial history entry
    const historyId = randomUUID();
    db.prepare(`
      INSERT INTO rmp_history (
        id,
        rmp_id,
        status_to,
        changed_by,
        notes
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      historyId,
      rmpId,
      'Pending',
      'Current User',
      'RMP Created'
    );

    // Redirect to the new RMP detail page
    redirect(303, `/srmp/${rmpId}`);
  }
};