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
    const subcontractor_id = formData.get('subcontractor_id');
    const project_name = formData.get('project_name');
    const due_date = formData.get('due_date');
    const file = formData.get('document') as File;

    if (!subcontractor_id || !project_name || !due_date) {
      return fail(400, { error: 'Missing required fields' });
    }

    try {
      const rmpId = randomUUID();

      // Insert RMP
      db.prepare(`
        INSERT INTO safety_rmps (
          id,
          subcontractor_id,
          project_name,
          submitted_date,
          due_date,
          status
        ) VALUES (?, ?, ?, date('now'), ?, 'Pending')
      `).run(rmpId, subcontractor_id, project_name, due_date);

      // Handle file upload if provided
      if (file && file.size > 0) {
        const uploadDir = './uploads/rmps';
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `rmp_${rmpId}_${Date.now()}_${file.name}`;
        const filePath = path.join(uploadDir, fileName);
        const buffer = await file.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));

        const docId = randomUUID();
        // Insert document record
        db.prepare(`
          INSERT INTO rmp_documents (
            id,
            rmp_id,
            document_name,
            file_path,
            file_size,
            mime_type,
            uploaded_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          docId,
          rmpId,
          file.name,
          `/uploads/rmps/${fileName}`,
          file.size,
          file.type,
          'System User'
        );
      }

      const historyId = randomUUID();
      // Add history record
      db.prepare(`
        INSERT INTO rmp_history (
          id,
          rmp_id,
          status_to,
          changed_by,
          notes
        ) VALUES (?, ?, 'Pending', 'System', 'RMP Created')
      `).run(historyId, rmpId);

      // Redirect to the new RMP detail page
      throw redirect(303, `/srmp/${rmpId}`);
    } catch (error) {
      // If it's a redirect, re-throw it
      if (error instanceof Response) {
        throw error;
      }
      console.error('Error creating RMP:', error);
      return fail(500, { error: 'Failed to create RMP' });
    }
  }
};