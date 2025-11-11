<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';

  let { data } = $props<{ data: PageData }>();
  
  let showUploadModal = $state(false);
  let selectedFiles: FileList | null = $state(null);
  let uploading = $state(false);
  
  let newComment = $state('');
  let submittingComment = $state(false);
  
  let showStatusModal = $state(false);
  let selectedStatus = $state('');
  let statusNotes = $state('');
  let updatingStatus = $state(false);

  // Check if RMP is in an editable state (only Pending and Rejected)
  let canAddContent = $derived(data.rmp && ['Pending', 'Rejected'].includes(data.rmp.status));

  // Calculate 3-Year RIR (Recordable Incident Rate)
  let threeYearRIR = $derived.by(() => {
    if (!data.annualData || data.annualData.length === 0) return 'N/A';
    
    const totalRecordables = data.annualData.reduce((sum: number, year: any) => sum + year.recordables, 0);
    const totalManhours = data.annualData.reduce((sum: number, year: any) => sum + year.manhours, 0);
    
    if (totalManhours === 0) return 'N/A';
    
    // RIR = (Total Recordables × 200,000) / Total Manhours
    const rir = (totalRecordables * 200000) / totalManhours;
    return rir.toFixed(2);
  });

  // Helper function to get RIR color class
  function getRIRColorClass(rirValue: string): string {
    if (rirValue === 'N/A') return '';
    const rir = parseFloat(rirValue);
    if (rir <= 2.5) return 'text-success';
    if (rir > 2.5 && rir < 3.5) return 'text-warning';
    return 'text-error';
  }

  // Helper function to extract filename from path
  function getFilenameFromPath(filePath: string): string {
    return filePath.split('/').pop() || '';
  }

  function handleFilesChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      selectedFiles = input.files;
    }
  }

  function openUploadModal() {
    showUploadModal = true;
    selectedFiles = null;
  }

  function openStatusModal() {
    selectedStatus = data.rmp.status;
    statusNotes = '';
    showStatusModal = true;
  }

  // Combine history and comments, sorted by date
  let timeline = $derived((() => {
    const combined = [
      ...(data.history || []).map((h: any) => ({ type: 'history' as const, data: h, date: h.changed_at })),
      ...(data.comments || []).map((c: any) => ({ type: 'comment' as const, data: c, date: c.created_at }))
    ];
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  })());
</script>

{#if data?.rmp}
<div class="container mx-auto p-8 max-w-5xl">
  
  <h1 class="text-3xl font-bold mb-6">Safety RMP Details</h1>

  <!-- Basic Information Card -->
  <div class="card bg-base-100 shadow-xl mb-6">
    <div class="card-body">
      <h2 class="card-title text-2xl mb-4">General Information</h2>
      
      <div class="grid grid-cols-3 gap-4">
        <!-- Column 1: Project & Status Info -->
        <div class="space-y-4">
             <div>
            <p class="text-sm text-base-content/70">Status</p>
            <button 
              class="badge {
                data.rmp.status === 'Approved' ? 'badge-success' :
                data.rmp.status === 'Rejected' ? 'badge-error' :
                data.rmp.status === 'Canceled' ? 'badge-neutral' :
                'badge-info'
              } badge-lg cursor-pointer hover:opacity-80"
              onclick={openStatusModal}
            >
              {data.rmp.status}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 ml-1">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>

          <div>
            <p class="text-sm text-base-content/70">Project Name</p>
            <p class="font-semibold">{data.rmp.project_name}</p>
          </div>

          <div>
            <p class="text-sm text-base-content/70">Subcontractor</p>
            <p class="font-semibold">{data.rmp.subcontractor_name}</p>
          </div>

          <div>
            <p class="text-sm text-base-content/70">Trade Package</p>
            <p class="font-semibold">{data.rmp.trade_pkg}</p>
          </div>
        </div>

        <!-- Column 2: Dates & FEIN -->
        <div class="space-y-4">
          <div>
            <p class="text-sm text-base-content/70">FEIN</p>
            <p class="font-semibold">{data.rmp.fein}</p>
          </div>

          <div>
            <p class="text-sm text-base-content/70">Submitted Date</p>
            <p class="font-semibold">{data.rmp.submitted_date}</p>
          </div>

          <div>
            <p class="text-sm text-base-content/70">Due Date</p>
            <p class="font-semibold">{data.rmp.due_date || 'Not set'}</p>
          </div>

          <div>
            <p class="text-sm text-base-content/70">Completed Date</p>
            <p class="font-semibold">{data.rmp.completed_date || 'Not completed'}</p>
          </div>
        </div>

        <!-- Column 3: Safety Metrics -->
        <div class="space-y-4">
          <div>
            <p class="text-sm text-base-content/70">Current EMR</p>
            <p class="font-semibold text-lg {
              parseFloat(data.rmp.current_emr) <= 1.0 ? 'text-success' : 'text-warning'
            }">{data.rmp.current_emr}</p>
          </div>

          <div>
            <p class="text-sm text-base-content/70">EMR Expiration</p>
            <p class="font-semibold">{data.rmp.emr_expiration}</p>
          </div>

          <div>
            <p class="text-sm text-base-content/70">3-Year RIR</p>
            <p class="font-semibold text-lg {getRIRColorClass(threeYearRIR)}">
              {threeYearRIR}
            </p>
            <p class="text-xs text-base-content/50">
              {#if data.annualData && data.annualData.length > 0}
                Based on {data.annualData.length} year(s) of data
              {/if}
            </p>
          </div>

          {#if data.annualData && data.annualData.length > 0}
            <div class="collapse collapse-arrow bg-base-200">
              <input type="checkbox" /> 
              <div class="collapse-title text-sm font-medium">
                View Annual Breakdown
              </div>
              <div class="collapse-content text-xs">
                <div class="space-y-2">
                  {#each data.annualData as year}
                    <div class="flex justify-between">
                      <span>{year.year}:</span>
                      <span>{year.recordables} recordables / {(year.manhours / 1000).toFixed(0)}K hrs</span>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Documents Card -->
  <div class="card bg-base-100 shadow-xl mb-6">
    <div class="card-body">
      <div class="flex justify-between items-center mb-4">
        <h2 class="card-title text-xl">Documents</h2>
        {#if canAddContent}
          <button class="btn btn-primary btn-sm" onclick={openUploadModal}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Upload Documents
          </button>
        {/if}
      </div>
      
      {#if data.documents && data.documents.length > 0}
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Uploaded By</th>
                <th>Uploaded At</th>
                <th>Size</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each data.documents as doc}
                <tr>
                  <td>{doc.document_name}</td>
                  <td>{doc.uploaded_by}</td>
                  <td>{new Date(doc.uploaded_at).toLocaleString()}</td>
                  <td>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</td>
                  <td>
                    <a 
                      href="/uploads/rmps/{getFilenameFromPath(doc.file_path)}" 
                      download={doc.document_name}
                      class="btn btn-sm btn-ghost"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download
                    </a>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="text-base-content/70">No documents uploaded yet.</p>
      {/if}
    </div>
  </div>

  <!-- Activity Timeline Card -->
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title text-xl mb-4">Activity Timeline</h2>
      
      <!-- Add Comment Form (only if status allows) -->
      {#if canAddContent}
        <div class="bg-base-200 p-4 rounded-lg mb-6">
          <form method="POST" action="?/addComment" use:enhance={() => {
            submittingComment = true;
            return async ({ update }) => {
              await update();
              submittingComment = false;
              newComment = '';
            };
          }}>
            <div class="form-control mb-3">
              <label class="label" for="comment-textarea">
                <span class="label-text">Add Comment</span>
              </label>
              <textarea 
                id="comment-textarea"
                name="comment"
                bind:value={newComment}
                class="textarea textarea-bordered h-24 w-full" 
                placeholder="Add a comment or note..."
                disabled={submittingComment}
                required
              ></textarea>
            </div>

            <button 
              type="submit" 
              class="btn btn-primary btn-sm"
              disabled={submittingComment || !newComment.trim()}
            >
              {submittingComment ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        </div>
      {:else}
        <div class="alert alert-info mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>This RMP is {data.rmp.status.toLowerCase()}. No additional comments or documents can be added.</span>
        </div>
      {/if}
      
      <!-- Timeline -->
      {#if timeline.length > 0}
        <div class="space-y-4">
          {#each timeline as item}
            {#if item.type === 'history'}
              {@const entry = item.data}
              <div class="border-l-4 border-primary pl-4 py-2">
                <div class="flex justify-between items-start">
                  <div>
                    <div class="badge badge-ghost badge-sm mb-1">Status Change</div>
                    <p class="font-semibold">
                      {#if entry.status_from}
                        Status changed from <span class="badge badge-sm">{entry.status_from}</span> to <span class="badge badge-sm">{entry.status_to}</span>
                      {:else}
                        Status set to <span class="badge badge-sm">{entry.status_to}</span>
                      {/if}
                    </p>
                    {#if entry.notes}
                      <p class="text-sm text-base-content/70 mt-1">{entry.notes}</p>
                    {/if}
                  </div>
                  <div class="text-right text-sm text-base-content/70">
                    <p>{entry.changed_by}</p>
                    <p>{new Date(entry.changed_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            {:else}
              {@const comment = item.data}
              <div class="border-l-4 border-accent pl-4 py-2">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="badge badge-accent badge-sm mb-1">Comment</div>
                    <p class="text-sm mt-1 whitespace-pre-wrap">{comment.comment}</p>
                  </div>
                  <div class="text-right text-sm text-base-content/70">
                    <p>{comment.created_by}</p>
                    <p>{new Date(comment.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {:else}
        <p class="text-base-content/70">No activity yet.</p>
      {/if}
    </div>
  </div>
</div>
{:else}
<div class="container mx-auto p-8 max-w-5xl">
  <div class="alert alert-error">
    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>RMP not found or error loading data.</span>
  </div>
  <div class="mt-4">
    <a href="/srmp" class="btn btn-ghost">Back to RMPs</a>
  </div>
</div>
{/if}

<!-- Status Change Modal -->
{#if showStatusModal}
<div class="modal modal-open">
  <div class="modal-box">
    <h3 class="font-bold text-lg mb-4">Update RMP Status</h3>
    
    <form method="POST" action="?/updateStatus" use:enhance={() => {
      updatingStatus = true;
      return async ({ update }) => {
        await update();
        updatingStatus = false;
        showStatusModal = false;
        statusNotes = '';
      };
    }}>
      <div class="form-control mb-4">
        <label class="label" for="status-select">
          <span class="label-text">Status</span>
        </label>
        <select 
          id="status-select"
          name="status" 
          bind:value={selectedStatus}
          class="select select-bordered w-full"
          disabled={updatingStatus}
          required
        >
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
          <option value="Approved">Approved</option>
          <option value="Canceled">Canceled</option>
        </select>
      </div>

      <div class="form-control mb-4">
        <label class="label" for="status-notes">
          <span class="label-text">Notes (Optional)</span>
        </label>
        <textarea 
          id="status-notes"
          name="notes"
          bind:value={statusNotes}
          class="textarea textarea-bordered h-24" 
          placeholder="Add notes about this status change..."
          disabled={updatingStatus}
        ></textarea>
      </div>

      {#if selectedStatus === 'Approved' || selectedStatus === 'Canceled'}
        <div class="alert alert-info mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Completed date will be automatically set to today.</span>
        </div>
      {/if}

      <div class="modal-action">
        <button 
          type="button" 
          class="btn" 
          onclick={() => showStatusModal = false}
          disabled={updatingStatus}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          class="btn btn-primary"
          disabled={updatingStatus || selectedStatus === data.rmp.status}
        >
          {updatingStatus ? 'Updating...' : 'Update Status'}
        </button>
      </div>
    </form>
  </div>
</div>
{/if}

<!-- Upload Documents Modal -->
{#if showUploadModal}
<div class="modal modal-open">
  <div class="modal-box">
    <h3 class="font-bold text-lg mb-4">Upload Documents</h3>
    
    <form method="POST" action="?/uploadDocuments" enctype="multipart/form-data" use:enhance={() => {
      uploading = true;
      return async ({ update }) => {
        await update();
        uploading = false;
        showUploadModal = false;
        selectedFiles = null;
      };
    }}>
      <div class="form-control mb-4">
        <label class="label" for="documents-input">
          <span class="label-text">Select Files (multiple allowed)</span>
        </label>
        <input 
          type="file" 
          name="documents" 
          id="documents-input"
          multiple
          class="file-input file-input-bordered w-full"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onchange={handleFilesChange}
          disabled={uploading}
          required
        />
        {#if selectedFiles && selectedFiles.length > 0}
          <div class="label">
            <span class="label-text-alt">
              {selectedFiles.length} file(s) selected
              ({(Array.from(selectedFiles).reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB total)
            </span>
          </div>
          <div class="mt-2 space-y-1">
            {#each Array.from(selectedFiles) as file}
              <div class="text-xs text-base-content/70">
                • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="modal-action">
        <button 
          type="button" 
          class="btn" 
          onclick={() => showUploadModal = false}
          disabled={uploading}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          class="btn btn-primary"
          disabled={uploading || !selectedFiles || selectedFiles.length === 0}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </form>
  </div>
</div>
{/if}