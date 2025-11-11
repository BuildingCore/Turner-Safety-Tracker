<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';

  interface RMP {
    id: string;
    subcontractor_name: string;
    project_name: string;
    submitted_date: string;
    due_date?: string;
    completed_date?: string;
    status: string;
  }

  interface Subcontractor {
    id: string;
    trade_name: string;
  }

  let { data }: { data: PageData } = $props();
  
  // Type assertion for RMP arrays
  const activeRMPs = data.activeRMPs as RMP[];
  const completedRMPs = data.completedRMPs as RMP[];
  const subcontractors = data.subcontractors as Subcontractor[];
  
  let showCreateModal = $state(false);
  let uploading = $state(false);
  let selectedFile: File | null = $state(null);

  function openCreateModal() {
    showCreateModal = true;
    selectedFile = null;
  }

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      selectedFile = input.files[0];
    }
  }
</script>

<div class="grid grid-cols-1 place-items-center">
    <button class="btn btn-primary w-56 mt-8" onclick={openCreateModal}>Create New RMP</button>

    <!-- Active Safety RMPs -->
    <fieldset class="fieldset border border-base-300 rounded-box p-4 mt-4 w-3/4">
        <legend class="fieldset-legend">Active Safety RMPs</legend>
        <div class="overflow-x-auto">
            <table class="table">
                <thead>
                    <tr>
                        <th>Subcontractor Name</th>
                        <th>Project Name</th>
                        <th>Submitted</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each activeRMPs as rmp (rmp.id)}
                    <tr>
                        <td>{rmp.subcontractor_name}</td>
                        <td>{rmp.project_name}</td>
                        <td>{rmp.submitted_date}</td>
                        <td>{rmp.due_date || '-'}</td>
                        <td>
                            <span class="badge {
                                rmp.status === 'Rejected' ? 'badge-error' : 
                                rmp.status === 'In Review' ? 'badge-warning' : 
                                'badge-info'
                            }">
                                {rmp.status}
                            </span>
                        </td>
                    <td>
                        <a href="/srmp/{rmp.id}" class="btn btn-sm btn-ghost">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                            View
                        </a>
                    </td>
                    </tr>
                    {/each}
                    {#if activeRMPs.length === 0}
                    <tr>
                        <td colspan="6" class="text-center text-base-content/70">No active RMPs</td>
                    </tr>
                    {/if}
                </tbody>
            </table>
        </div>
    </fieldset>

    <!-- Completed Safety RMPs -->
    <fieldset class="fieldset border border-base-300 rounded-box p-4 mt-4 w-3/4 mb-8">
        <legend class="fieldset-legend">Completed Safety RMPs</legend>
        <div class="overflow-x-auto">
            <table class="table">
                <thead>
                    <tr>
                        <th>Subcontractor Name</th>
                        <th>Project Name</th>
                        <th>Submitted</th>
                        <th>Completed</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each completedRMPs as rmp (rmp.id)}
                    <tr>
                        <td>{rmp.subcontractor_name}</td>
                        <td>{rmp.project_name}</td>
                        <td>{rmp.submitted_date}</td>
                        <td>{rmp.completed_date || '-'}</td>
                        <td>
                            <span class="badge {
                                rmp.status === 'Approved' ? 'badge-success' : 
                                'badge-neutral'
                            }">
                                {rmp.status}
                            </span>
                        </td>
                    <td>
                        <a href="/srmp/{rmp.id}" class="btn btn-sm btn-ghost">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                            View
                        </a>
                    </td>
                    </tr>
                    {/each}
                    {#if completedRMPs.length === 0}
                    <tr>
                        <td colspan="6" class="text-center text-base-content/70">No completed RMPs</td>
                    </tr>
                    {/if}
                </tbody>
            </table>
        </div>
    </fieldset>
</div>

<!-- Create RMP Modal -->
{#if showCreateModal}
<div class="modal modal-open">
    <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Create New Safety RMP</h3>
        
        <form method="POST" action="?/createRMP" enctype="multipart/form-data" use:enhance={() => {
            uploading = true;
            return async ({ update }) => {
                await update();
                uploading = false;
                showCreateModal = false;
            };
        }}>
            <div class="form-control mb-4">
                <label class="label">
                    <span class="label-text">Subcontractor</span>
                </label>
                <select name="subcontractor_id" class="select select-bordered" required>
                    <option value="">Select Subcontractor</option>
                    {#each subcontractors as sub}
                        <option value={sub.id}>{sub.trade_name}</option>
                    {/each}
                </select>
            </div>

            <div class="form-control mb-4">
                <label class="label">
                    <span class="label-text">Project Name</span>
                </label>
                <input 
                    type="text" 
                    name="project_name" 
                    class="input input-bordered" 
                    placeholder="Enter project name"
                    required 
                />
            </div>

            <div class="form-control mb-4">
                <label class="label">
                    <span class="label-text">Due Date</span>
                </label>
                <input 
                    type="date" 
                    name="due_date" 
                    class="input input-bordered" 
                    required 
                />
            </div>

            <div class="form-control mb-4">
                <label class="label">
                    <span class="label-text">Upload Document (Optional)</span>
                </label>
                <input 
                    type="file" 
                    name="document" 
                    class="file-input file-input-bordered w-full"
                    accept=".pdf,.doc,.docx"
                    onchange={handleFileChange}
                />
                {#if selectedFile}
                    <label class="label">
                        <span class="label-text-alt">Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </label>
                {/if}
            </div>

            <div class="modal-action">
                <button 
                    type="button" 
                    class="btn" 
                    onclick={() => showCreateModal = false}
                    disabled={uploading}
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    class="btn btn-primary"
                    disabled={uploading}
                >
                    {uploading ? 'Creating...' : 'Create RMP'}
                </button>
            </div>
        </form>
    </div>
</div>
{/if}