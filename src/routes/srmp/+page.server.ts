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
  
    // Get Safety Manager users for dropdown
    const { data: safetyManagers, error: smError } = await supabase
      .from('user_profiles')
      .select('id, full_name, job_title')
      .eq('job_title', 'Safety Manager')
      .order('full_name');

  // Map joined subcontractor name to subcontractor_name for table display
  const mapRMPs = (rmps: any[], completed = false) =>
    (rmps || []).map(rmp => ({
      ...rmp,
      subcontractor_name: rmp.subcontractors?.trade_name || ''
    }));

  return {
    activeRMPs: mapRMPs(activeRMPs ?? []),
    completedRMPs: mapRMPs(completedRMPs ?? [], true),
    subcontractors: subcontractors || [],
    safetyManagers: safetyManagers || []
  };
};

export const actions: Actions = {
  createRMP: async ({ request, locals }) => {
    try {
      console.log('--- createRMP: start ---');
      const { user } = await locals.safeGetSession();
      console.log('User from session:', user);
      if (!user) {
        console.log('No user found, aborting');
        return fail(401, { error: 'You must be logged in to create an RMP' });
      }
      // Fetch user_profile by auth id
      console.log('Fetching user profile for user_id:', user.id);
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (profileError) {
        console.error('Supabase profile error:', profileError);
      }
      console.log('Profile result:', profile);
      if (!profile) {
        console.log('No profile found, aborting');
        return fail(404, { error: 'User profile not found' });
      }
      const formData = await request.formData();
      console.log('FormData received:', formData);
      const subcontractorId = formData.get('subcontractor_id') as string;
      const safetyManagerId = formData.get('safety_manager_id') as string;
      const projectName = formData.get('project_name') as string;
      const dueDate = formData.get('due_date') as string;
      const documents = formData.getAll('documents') as File[];
      console.log('Parsed form values:', {subcontractorId, safetyManagerId, projectName, dueDate, documents});
      // Validate inputs
      if (!subcontractorId || !projectName || !safetyManagerId) {
        console.log('Missing required fields, aborting');
        return fail(400, { error: 'Subcontractor, Project Name, and Safety Manager are required' });
      }
      const rmpId = randomUUID();
      const submittedDate = new Date().toISOString().split('T')[0];
      console.log('Inserting new RMP:', {rmpId, subcontractorId, safetyManagerId, projectName, submittedDate, dueDate, created_by: profile.id});
      const { error: rmpError } = await supabase
        .from('safety_rmps')
        .insert({
          id: rmpId,
          subcontractor_id: subcontractorId,
          safety_manager_id: safetyManagerId,
          project_name: projectName,
          submitted_date: submittedDate,
          due_date: dueDate || null,
          status: 'Pending',
          created_by: profile.id
        });
      if (rmpError) {
        console.error('Supabase RMP error:', rmpError);
        return fail(500, { error: 'Failed to create RMP', details: rmpError.message });
      }
      console.log('RMP inserted successfully');
      // Create initial history entry in Supabase
      const historyId = randomUUID();
      console.log('Inserting RMP history:', {historyId, rmpId, changed_by: profile.id});
      const { error: historyError } = await supabase
        .from('rmp_history')
        .insert({
          id: historyId,
          rmp_id: rmpId,
          status_to: 'Pending',
          changed_by: profile.id,
          notes: 'RMP Created'
        });
      if (historyError) {
        console.error('Supabase history error:', historyError);
        return fail(500, { error: 'Failed to create RMP history', details: historyError.message });
      }
      console.log('RMP history inserted successfully');
      // Handle multiple file uploads to Supabase Storage
      if (documents.length > 0) {
        for (const file of documents) {
          if (!file || file.size === 0) continue;
          const fileExt = file.name.split('.').pop();
          const fileName = `${rmpId}_${randomUUID()}.${fileExt}`;
          console.log('Uploading file to Supabase Storage:', fileName, file);
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('safety-docs')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });
          if (uploadError) {
            console.error('Supabase Storage upload error:', uploadError);
            return fail(500, { error: 'Failed to upload document', details: uploadError.message });
          }
          console.log('File uploaded, getting public URL:', fileName);
          const { data: publicUrlData } = supabase.storage
            .from('safety-docs')
            .getPublicUrl(fileName);
          console.log('Public URL data:', publicUrlData);
          // Insert document record in Supabase
          const docId = randomUUID();
          console.log('Inserting document metadata:', {docId, rmpId, fileName: file.name, filePath: publicUrlData?.publicUrl || fileName, fileSize: file.size, uploaded_by: profile.id});
          const { error: docError } = await supabase
            .from('rmp_documents')
            .insert({
              id: docId,
              rmp_id: rmpId,
              file_name: file.name,
              file_path: publicUrlData?.publicUrl || fileName,
              file_size: file.size,
              uploaded_by: profile.id
            });
          if (docError) {
            console.error('Supabase document error:', docError);
            return fail(500, { error: 'Failed to save document metadata', details: docError.message });
          }
          console.log('Document metadata inserted successfully');
        }
      }
      console.log('All documents processed');
      // Redirect to the new RMP detail page
      console.log('Redirecting to new RMP detail page:', `/srmp/${rmpId}/`);
      return redirect(303, `/srmp/${rmpId}/`);
    } catch (err: any) {
      // SvelteKit's redirect throws an object, not an Error instance
      if (err instanceof redirect || err?.name === 'Redirect' || err?.status === 303) {
        throw err;
      }
      console.error('Create RMP error (catch):', err);
      return fail(500, { error: 'Unexpected error creating RMP', details: err?.message });
    }
  }
};