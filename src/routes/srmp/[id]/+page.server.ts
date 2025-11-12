import type { PageServerLoad, Actions } from './$types';
import { supabase } from '$lib/server/db';
import { error, fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export const load: PageServerLoad = async ({ params, locals }) => {
  const { id } = params;
  const { user } = await locals.safeGetSession()

  // Get RMP details with subcontractor and creator info
  const { data: rmp, error: rmpError } = await supabase
    .from('safety_rmps')
    .select(`*, subcontractors(*), user_profiles:created_by(full_name, job_title)`) // created_by is user_id in user_profiles
    .eq('id', id)
    .single();
  if (!rmp) {
    throw error(404, 'RMP not found');
  }
  // Get annual data for 3-year RIR calculation
  const { data: annualData } = await supabase
    .from('annual_data')
    .select('year, recordables, manhours')
    .eq('subcontractor_id', rmp.subcontractor_id)
    .order('year', { ascending: false })
    .limit(3);
  // Get documents for this RMP
  const { data: documents } = await supabase
    .from('rmp_documents')
    .select('*')
    .eq('rmp_id', id)
    .order('uploaded_at', { ascending: false });
  // Get history for this RMP with user profile information
  const { data: history } = await supabase
    .from('rmp_history')
    .select('*, user_profiles:changed_by(full_name, job_title)')
    .eq('rmp_id', id)
    .order('changed_at', { ascending: false });
  // Get comments for this RMP with user profile information
  const { data: comments } = await supabase
      .from('rmp_comments')
      .select('*, user_profiles:created_by(full_name, job_title)')
    .eq('rmp_id', id)
    .order('created_at', { ascending: false });
  return {
    rmp,
    annualData: annualData || [],
    documents: documents || [],
    history: history || [],
    comments: comments || []
  };
};

export const actions: Actions = {
  updateStatus: async ({ request, params, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) {
      return fail(401, { error: 'You must be logged in to update status' });
    }
    const { id } = params;
    const formData = await request.formData();
    const newStatus = formData.get('status') as string;
    const notes = formData.get('notes') as string;
    // Validate status
    if (!newStatus || !['Pending', 'Rejected', 'Approved', 'Canceled'].includes(newStatus)) {
      return fail(400, { error: 'Invalid status' });
    }
    // Get current RMP
    const { data: currentRmp } = await supabase
      .from('safety_rmps')
      .select('status')
      .eq('id', id)
      .single();
    if (!currentRmp) {
      return fail(404, { error: 'RMP not found' });
    }
    const oldStatus = currentRmp.status;
    // Don't update if status hasn't changed
    if (oldStatus === newStatus) {
      return { success: true, message: 'Status unchanged' };
    }
    // Determine if we need to set completed_date
    let completedDate = null;
    if (newStatus === 'Approved' || newStatus === 'Canceled') {
      completedDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    // Update RMP status and completed_date in Supabase
    const { error: updateError } = await supabase
      .from('safety_rmps')
      .update({
        status: newStatus,
        completed_date: completedDate || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    if (updateError) {
      return fail(500, { error: 'Failed to update status' });
    }
    // Add history entry in Supabase
    const historyId = randomUUID();
    const { error: historyError } = await supabase
      .from('rmp_history')
      .insert({
        id: historyId,
        rmp_id: id,
        status_from: oldStatus,
        status_to: newStatus,
        changed_by: user.id,
        notes: notes?.trim() || null
      });
    if (historyError) {
      return fail(500, { error: 'Failed to add history entry' });
    }
    return { success: true };
  },

  uploadDocuments: async ({ request, params, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) {
      return fail(401, { error: 'You must be logged in to upload documents' });
    }
    const { id } = params;
    const formData = await request.formData();
    const files = formData.getAll('documents') as File[];
    // Get current RMP status
    const { data: rmp } = await supabase
      .from('safety_rmps')
      .select('status')
      .eq('id', id)
      .single();
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
    const uploadDir = './uploads/rmps';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    for (const file of files) {
      if (file.size === 0) continue;
      const docId = randomUUID();
      const fileName = `rmp_${id}_${Date.now()}_${file.name}`;
      const filePath = path.join(uploadDir, fileName);
      const buffer = await file.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));
      // Insert document record in Supabase
      const { error: docError } = await supabase
        .from('rmp_documents')
        .insert({
          id: docId,
          rmp_id: id,
          document_name: file.name,
          file_path: `/uploads/rmps/${fileName}`,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id
        });
      if (docError) {
        return fail(500, { error: 'Failed to save document' });
      }
    }
    return { success: true };
  },

  addComment: async ({ request, params, locals }) => {
    const { user } = await locals.safeGetSession();
    console.log('[addComment] User:', user);
    const { id } = params;
    const formData = await request.formData();
    const comment = formData.get('comment') as string;
    // Log incoming form data
    console.log('[addComment] Incoming formData:', { comment });
    if (!user) {
      console.error('[addComment] No user session');
      return { type: 'error', error: 'You must be logged in to add comments' };
    }
    // Get current RMP status
    const { data: rmp, error: rmpError } = await supabase
      .from('safety_rmps')
      .select('status')
      .eq('id', id)
      .single();
    if (rmpError) {
      console.error('[addComment] Error fetching RMP:', rmpError);
      return { type: 'error', error: 'RMP not found' };
    }
    if (!rmp) {
      console.error('[addComment] RMP not found for id:', id);
      return { type: 'error', error: 'RMP not found' };
    }
    // Check if RMP status allows comments
    if (!['Pending', 'Rejected'].includes(rmp.status)) {
      console.error('[addComment] RMP status does not allow comments:', rmp.status);
      return { type: 'error', error: 'Cannot add comments to this RMP in its current status' };
    }
    if (!comment?.trim()) {
      console.error('[addComment] Comment is empty');
      return { type: 'error', error: 'Comment is required' };
    }
    const commentId = randomUUID();
    // Insert comment in Supabase
    const { error: commentError } = await supabase
      .from('rmp_comments')
      .insert({
        id: commentId,
        rmp_id: id,
        comment: comment.trim(),
        created_by: user.id
      });
    if (commentError) {
      console.error('[addComment] Supabase insert error:', commentError);
      return { type: 'error', error: 'Failed to add comment' };
    }
  console.log('[addComment] Comment inserted successfully:', { commentId, comment });
  return { type: 'success' };
  }
};