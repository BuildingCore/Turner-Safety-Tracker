import type { PageServerLoad, Actions } from './$types';
import { supabase } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession()
  
  // Get active RMPs (Pending, In Review, Rejected)
  const { data: activeRMPs, error: activeError } = await supabase
    .from('safety_rmps')
    .select('id, project_name, submitted_date, due_date, status, subcontractors(trade_name)')
    .in('status', ['Pending', 'In Review', 'Rejected'])
    .order('submitted_date', { ascending: false });

  // Get completed RMPs (Approved, Closed, Canceled)
  const { data: completedRMPs, error: completedError } = await supabase
    .from('safety_rmps')
    .select('id, project_name, submitted_date, completed_date, status, subcontractors(trade_name)')
    .in('status', ['Approved', 'Closed', 'Canceled'])
    .order('completed_date', { ascending: false });

  // Get all subcontractors for the dropdown
  const { data: subcontractors, error: subError } = await supabase
    .from('subcontractors')
    .select('id, trade_name')
    .order('trade_name');

  // Map joined subcontractor name to subcontractor_name for table display
  const mapRMPs = (rmps: any[], completed = false) =>
    (rmps || []).map(rmp => ({
      ...rmp,
      subcontractor_name: rmp.subcontractors?.trade_name || ''
    }));

  return {
    activeRMPs: mapRMPs(activeRMPs ?? []),
    completedRMPs: mapRMPs(completedRMPs ?? [], true),
    subcontractors: subcontractors || []
  };
};

export const actions: Actions = {
  createRMP: async ({ request, locals }) => {
    try {
      const { user } = await locals.safeGetSession();
      if (!user) {
        return fail(401, { error: 'You must be logged in to create an RMP' });
      }
      const formData = await request.formData();
      const subcontractorId = formData.get('subcontractor_id') as string;
      const projectName = formData.get('project_name') as string;
      const dueDate = formData.get('due_date') as string;
      const documents = formData.getAll('documents') as File[];
      // Validate inputs
      if (!subcontractorId || !projectName) {
        return fail(400, { error: 'Subcontractor and Project Name are required' });
      }
      const rmpId = randomUUID();
      const submittedDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      // Insert new RMP into Supabase
      const { error: rmpError } = await supabase
        .from('safety_rmps')
        .insert({
          id: rmpId,
          subcontractor_id: subcontractorId,
          project_name: projectName,
          submitted_date: submittedDate,
          due_date: dueDate || null,
          status: 'Pending',
          created_by: user.id
        });
      if (rmpError) {
        console.error('Supabase RMP error:', rmpError);
        return fail(500, { error: 'Failed to create RMP', details: rmpError.message });
      }
      // Create initial history entry in Supabase
      const historyId = randomUUID();
      const { error: historyError } = await supabase
        .from('rmp_history')
        .insert({
          id: historyId,
          rmp_id: rmpId,
          status_to: 'Pending',
          changed_by: user.id,
          notes: 'RMP Created'
        });
      if (historyError) {
        console.error('Supabase history error:', historyError);
        return fail(500, { error: 'Failed to create RMP history', details: historyError.message });
      }
      // Handle multiple file uploads
      if (documents.length > 0) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'rmps');
        // Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        for (const file of documents) {
          // Skip if no file or empty file
          if (!file || file.size === 0) continue;
          const fileExt = path.extname(file.name);
          const fileName = `${rmpId}_${randomUUID()}${fileExt}`;
          const filePath = path.join(uploadDir, fileName);
          // Write file to disk
          try {
            const buffer = Buffer.from(await file.arrayBuffer());
            fs.writeFileSync(filePath, buffer);
          } catch (fileError) {
            console.error('File write error:', fileError);
            const message = typeof fileError === 'object' && fileError && 'message' in fileError ? (fileError as any).message : String(fileError);
            return fail(500, { error: 'Failed to save file', details: message });
          }
          // Insert document record in Supabase
          const docId = randomUUID();
          const { error: docError } = await supabase
            .from('rmp_documents')
            .insert({
              id: docId,
              rmp_id: rmpId,
              document_name: file.name,
              file_path: `uploads/rmps/${fileName}`,
              file_size: file.size,
              uploaded_by: user.id
            });
          if (docError) {
            console.error('Supabase document error:', docError);
            return fail(500, { error: 'Failed to save document', details: docError.message });
          }
        }
      }
      // Redirect to the new RMP detail page
  return redirect(303, `/srmp/${rmpId}/`);
    } catch (err: any) {
      console.error('Create RMP error:', err);
      return fail(500, { error: 'Unexpected error creating RMP', details: err?.message });
    }
  }
};