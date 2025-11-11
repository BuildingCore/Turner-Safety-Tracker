import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { error, fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export const load: PageServerLoad = ({ params }) => {
  const { id } = params;

  // Get RMP details with subcontractor info
  const rmp = db
    .prepare(
      `SELECT 
        r.*,
        s.trade_name as subcontractor_name,
        s.trade_pkg,
        s.fein,
        s.current_emr,
        s.emr_expiration
      FROM safety_rmps r
      JOIN subcontractors s ON r.subcontractor_id = s.id
      WHERE r.id = ?`
    )
    .get(id);

  if (!rmp) {
    throw error(404, 'RMP not found');
  }

  // Get annual data for 3-year RIR calculation
  const annualData = db
    .prepare(
      `SELECT year, recordables, manhours
       FROM annual_data
       WHERE subcontractor_id = (
         SELECT subcontractor_id FROM safety_rmps WHERE id = ?
       )
       ORDER BY year DESC
       LIMIT 3`
    )
    .all(id);

  // Get documents for this RMP
  const documents = db
    .prepare(
      `SELECT * FROM rmp_documents 
       WHERE rmp_id = ? 
       ORDER BY uploaded_at DESC`
    )
    .all(id);

  // Get history for this RMP
  const history = db
    .prepare(
      `SELECT * FROM rmp_history 
       WHERE rmp_id = ? 
       ORDER BY changed_at DESC`
    )
    .all(id);

  // Get comments for this RMP
  const comments = db
    .prepare(
      `SELECT * FROM rmp_comments 
       WHERE rmp_id = ? 
       ORDER BY created_at DESC`
    )
    .all(id);

  return {
    rmp,
    annualData,
    documents,
    history,
    comments
  };
};

export const actions: Actions = {
  updateStatus: async ({ request, params }) => {
    const { id } = params;
    const formData = await request.formData();
    const newStatus = formData.get('status') as string;
    const notes = formData.get('notes') as string;

    // Validate status
    if (!newStatus || !['Pending', 'Rejected', 'Approved', 'Canceled'].includes(newStatus)) {
      return fail(400, { error: 'Invalid status' });
    }

    // Get current RMP
    const currentRmp = db.prepare('SELECT status FROM safety_rmps WHERE id = ?').get(id) as any;
    
    if (!currentRmp) {
      return fail(404, { error: 'RMP not found' });
    }

    const oldStatus = currentRmp.status;

    // Don't update if status hasn't changed
    if (oldStatus === newStatus) {
      return { success: true, message: 'Status unchanged' };
    }

    try {
      // Determine if we need to set completed_date
      let completedDate = null;
      if (newStatus === 'Approved' || newStatus === 'Canceled') {
        completedDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      }

      // Update RMP status and completed_date
      if (completedDate) {
        db.prepare(`
          UPDATE safety_rmps 
          SET status = ?, completed_date = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newStatus, completedDate, id);
      } else {
        db.prepare(`
          UPDATE safety_rmps 
          SET status = ?, completed_date = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newStatus, id);
      }

      // Add history entry
      const historyId = randomUUID();
      db.prepare(`
        INSERT INTO rmp_history (
          id,
          rmp_id,
          status_from,
          status_to,
          changed_by,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        historyId,
        id,
        oldStatus,
        newStatus,
        'Current User',
        notes?.trim() || null
      );

      return { success: true };
    } catch (err) {
      console.error('Error updating status:', err);
      return fail(500, { error: 'Failed to update status' });
    }
  },

  uploadDocuments: async ({ request, params }) => {
    const { id } = params;
    const formData = await request.formData();
    const files = formData.getAll('documents') as File[];

    // Get current RMP status
    const rmp = db.prepare('SELECT status FROM safety_rmps WHERE id = ?').get(id) as any;
    
    if (!rmp) {
      return fail(404, { error: 'RMP not found' });
    }

    // Check if RMP status allows uploads
    if (!['Pending', 'Rejected'].includes(rmp.status)) {
      return fail(403, { error: 'Cannot upload documents to this RMP in its current status' });
    }

    if (!files || files.length === 0) {
      return fail(400, { error: 'No files selected' });
    }

    try {
      const uploadDir = './uploads/rmps';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Upload each file
      for (const file of files) {
        if (file.size === 0) continue;

        const docId = randomUUID();
        const fileName = `rmp_${id}_${Date.now()}_${file.name}`;
        const filePath = path.join(uploadDir, fileName);
        const buffer = await file.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));

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
          id,
          file.name,
          `/uploads/rmps/${fileName}`,
          file.size,
          file.type,
          'Current User'
        );
      }

      return { success: true };
    } catch (err) {
      console.error('Error uploading documents:', err);
      return fail(500, { error: 'Failed to upload documents' });
    }
  },

  addComment: async ({ request, params }) => {
    const { id } = params;
    const formData = await request.formData();
    const comment = formData.get('comment') as string;

    // Get current RMP status
    const rmp = db.prepare('SELECT status FROM safety_rmps WHERE id = ?').get(id) as any;
    
    if (!rmp) {
      return fail(404, { error: 'RMP not found' });
    }

    // Check if RMP status allows comments
    if (!['Pending', 'Rejected'].includes(rmp.status)) {
      return fail(403, { error: 'Cannot add comments to this RMP in its current status' });
    }

    if (!comment?.trim()) {
      return fail(400, { error: 'Comment is required' });
    }

    try {
      const commentId = randomUUID();

      // Insert comment
      db.prepare(`
        INSERT INTO rmp_comments (
          id,
          rmp_id,
          comment,
          created_by
        ) VALUES (?, ?, ?, ?)
      `).run(
        commentId,
        id,
        comment.trim(),
        'Current User'
      );

      return { success: true };
    } catch (err) {
      console.error('Error adding comment:', err);
      return fail(500, { error: 'Failed to add comment' });
    }
  }
};