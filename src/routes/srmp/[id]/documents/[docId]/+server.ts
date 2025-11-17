import { supabase } from '$lib/server/db';
import { error } from '@sveltejs/kit';

export async function GET({ params }) {
  const { id, docId } = params;
  console.debug('[API] Download endpoint called with params:', params);
  // Fetch document record to get file_path
  const { data: doc, error: docError } = await supabase
    .from('rmp_documents')
    .select('file_path')
    .eq('id', docId)
    .eq('rmp_id', id)
    .single();
  console.debug('[API] Document query result:', { doc, docError });
  if (docError || !doc) {
    console.error('[API] Document not found or error:', docError);
    return new Response(JSON.stringify({ error: 'Document not found' }), { status: 404 });
  }
  let fileName = doc.file_path;
  if (fileName.startsWith('http')) {
    const parts = fileName.split('/');
    fileName = parts[parts.length - 1];
  }
  console.debug('[API] File name for signed URL:', fileName);
  // Generate signed URL
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('safety-docs')
    .createSignedUrl(fileName, 3600); // 1 hour validity
  console.debug('[API] Signed URL result:', { signedUrlData, signedUrlError });
  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error('[API] Failed to generate signed URL:', signedUrlError);
    return new Response(JSON.stringify({ error: 'Failed to generate signed URL' }), { status: 500 });
  }
  return new Response(JSON.stringify({ signedUrl: signedUrlData.signedUrl }), { status: 200 });
}
