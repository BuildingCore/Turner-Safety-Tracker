<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  
  interface AnnualData {
    year: number;
    recordables: number;
    manhours: number;
  }
  
  interface Subcontractor {
    id: number;
    trade_pkg: string;
    trade_name: string;
    fein: string;
    three_yr_trir: string;
    current_emr: string;
    emr_expiration: string;
    annual_data: AnnualData[];
  }
  
  let { data }: { data: PageData & { subcontractors: Subcontractor[], years: number[] } } = $props();
  
  let editingRow: number | null = $state(null);
  let editingCell: { subId: number, year: number } | null = $state(null);
  let showAddYearModal = $state(false);
  let showAddSubcontractorModal = $state(false);
  let selectedSubcontractor: number | null = $state(null);
  let newYear = $state(new Date().getFullYear() + 1);
  let newRecordables = $state(0);
  let newManhours = $state(0);
  
  // New subcontractor form data
  let newSubcontractor = $state({
    trade_pkg: '',
    trade_name: '',
    fein: '',
    current_emr: '',
    emr_expiration: ''
  });
  
  // Annual data for new subcontractor
  let newSubAnnualData = $state<{[year: number]: {recordables: number, manhours: number}}>({});
  
  function getDataForYear(annual_data: AnnualData[], year: number) {
    return annual_data.find(d => d.year === year) || { recordables: 0, manhours: 0 };
  }

  // Calculate approval categories based on 3-YR TRIR
  const approvalCategories = $derived(() => {
    const noApproval = data.subcontractors.filter(sub => parseFloat(sub.three_yr_trir) < 2).length;
    const safetyOMApproval = data.subcontractors.filter(sub => {
      const trir = parseFloat(sub.three_yr_trir);
      return trir >= 2 && trir < 3.5;
    }).length;
    const gmSVPApproval = data.subcontractors.filter(sub => parseFloat(sub.three_yr_trir) >= 3.5).length;

    return {
      noApproval,
      safetyOMApproval,
      gmSVPApproval
    };
  });

  function startEditing(subId: number) {
    editingRow = subId;
  }

  function cancelEditing() {
    editingRow = null;
    editingCell = null;
  }

  function startEditingCell(subId: number, year: number) {
    editingCell = { subId, year };
  }

  function openAddYearModal(subId: number) {
    selectedSubcontractor = subId;
    newYear = new Date().getFullYear() + 1;
    newRecordables = 0;
    newManhours = 0;
    showAddYearModal = true;
  }

  function openAddSubcontractorModal() {
    newSubcontractor = {
      trade_pkg: '',
      trade_name: '',
      fein: '',
      current_emr: '1.0',
      emr_expiration: ''
    };
    // Initialize annual data for all years
    newSubAnnualData = {};
    data.years.forEach(year => {
      newSubAnnualData[year] = { recordables: 0, manhours: 0 };
    });
    showAddSubcontractorModal = true;
  }

  function closeAddSubcontractorModal() {
    showAddSubcontractorModal = false;
    newSubcontractor = {
      trade_pkg: '',
      trade_name: '',
      fein: '',
      current_emr: '',
      emr_expiration: ''
    };
    newSubAnnualData = {};
  }
</script>

<div class="grid grid-cols-1 place-items-center mb-6">
    <h1 class="mt-8 text-3xl"><strong>🚨 Subcontractor Safety Dashboard 🚨</strong></h1>

    <!-- Key Performance Indicators -->
    <div class="grid grid-cols-3 gap-4 mt-6">
        <div class="card w-72 bg-base-100 card-xs shadow-md py-6 border border-base-300">
            <div class="card-body items-center">
                <h2 class="card-title">No Approvals Required</h2>
                <p class="text-sm text-base-content/70">3-YR TRIR &lt; 2.0</p>
                <strong class="text-success text-4xl">{approvalCategories().noApproval}</strong>
            </div>
        </div>
        <div class="card w-72 bg-base-100 card-xs shadow-md py-6 border border-base-300">
            <div class="card-body items-center">
                <h2 class="card-title">Safety Director & OM Approvals</h2>
                <p class="text-sm text-base-content/70">3-YR TRIR 2.0 - 3.5</p>
                <strong class="text-warning text-4xl">{approvalCategories().safetyOMApproval}</strong>
            </div>
        </div>
        <div class="card w-72 bg-base-100 card-xs shadow-md py-6 border border-base-300">
            <div class="card-body items-center">
                <h2 class="card-title">GM & SVP Approvals</h2>
                <p class="text-sm text-base-content/70">3-YR TRIR ≥ 3.5</p>
                <strong class="text-error text-4xl">{approvalCategories().gmSVPApproval}</strong>
            </div>
        </div>
    </div>

    <!-- Add Subcontractor Button -->
    <div class="w-3/4 mt-6 flex justify-end">
      <button class="btn btn-primary" onclick={() => openAddSubcontractorModal()}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add New Subcontractor
      </button>
    </div>

    <div class="border border-base-300 rounded-lg shadow-md w-3/4 mt-4 mx-24 overflow-x-auto max-h-96 overflow-y-auto">
      <table class="table table-pin-rows">
        <thead>
          <tr>
            <th>Trade Pkg</th>
            <th class="min-w-48">Trade Name</th>
            <th class="min-w-32">FEIN</th>
            <th>3-YR TRIR</th>
            {#each data.years as year}
              <th colspan="2" class="text-center">{year}</th>
            {/each}
            <th>Current EMR</th>
            <th>EMR Expiration Date</th>
            <th>Actions</th>
          </tr>
          <tr>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            {#each data.years as year}
              <th>Recordables</th>
              <th>Manhours</th>
            {/each}
            <th></th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each data.subcontractors as sub}
            <tr>
              {#if editingRow === sub.id}
                <td colspan={4 + data.years.length * 2 + 3}>
                    <form method="POST" action="?/updateSubcontractor" use:enhance={() => {
          return async ({ update }) => {
            await update();
            await import('$app/navigation').then(mod => mod.invalidateAll());
            cancelEditing();
          };
                    }}>
                    <input type="hidden" name="id" value={sub.id} />
                    <table class="table">
                        <tbody>
                        <tr>
                            <td>
                            <input type="text" name="trade_pkg" value={sub.trade_pkg} class="input input-xs input-bordered w-full" />
                            </td>
                            <td class="min-w-48">
                            <input type="text" name="trade_name" value={sub.trade_name} class="input input-xs input-bordered w-full" />
                            </td>
                            <td class="min-w-32">
                            <input type="text" name="fein" value={sub.fein} class="input input-xs input-bordered w-full" />
                            </td>
                            <td>{sub.three_yr_trir}</td>
                            {#each data.years as year}
                            {@const yearData = getDataForYear(sub.annual_data, year)}
                            <td>
                                <input 
                                type="number" 
                                name="recordables_{year}" 
                                value={yearData.recordables} 
                                class="input input-xs input-bordered w-20" 
                                />
                            </td>
                            <td>
                                <input 
                                type="number" 
                                name="manhours_{year}" 
                                value={yearData.manhours} 
                                class="input input-xs input-bordered w-24" 
                                />
                            </td>
                            {/each}
                            <td>
                            <input type="text" name="current_emr" value={sub.current_emr} class="input input-xs input-bordered w-20" />
                            </td>
                            <td>
                            <input type="date" name="emr_expiration" value={sub.emr_expiration} class="input input-xs input-bordered w-32" />
                            </td>
                            <td>
                            <div class="flex gap-1">
                                <button type="submit" class="btn btn-xs btn-success">Save</button>
                                <button type="button" class="btn btn-xs btn-ghost" onclick={() => cancelEditing()}>Cancel</button>
                            </div>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                    </form>
                </td>
              {:else}
                <td>{sub.trade_pkg}</td>
                <td class="min-w-48">{sub.trade_name}</td>
                <td class="min-w-32">{sub.fein}</td>
                <td>{sub.three_yr_trir}</td>
                {#each data.years as year}
                  {@const yearData = getDataForYear(sub.annual_data, year)}
                  <td>{yearData.recordables}</td>
                  <td>{yearData.manhours.toLocaleString()}</td>
                {/each}
                <td>{sub.current_emr}</td>
                <td>{sub.emr_expiration}</td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-xs btn-ghost" onclick={() => startEditing(sub.id)} aria-label="Edit subcontractor">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    <button class="btn btn-xs btn-ghost" onclick={() => openAddYearModal(sub.id)} aria-label="Add new year data">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                  </div>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
</div>

<!-- Add Year Modal -->
{#if showAddYearModal}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Add New Year Data</h3>
      <form method="POST" action="?/addNewYear" use:enhance={() => {
        return async ({ update }) => {
          await update();
          await import('$app/navigation').then(mod => mod.invalidateAll());
          showAddYearModal = false;
          newRecordables = 0;
          newManhours = 0;
        };
      }}>
        <input type="hidden" name="subcontractor_id" value={selectedSubcontractor} />
        
        <div class="form-control mb-4">
          <label class="label" for="year">
            <span class="label-text">Year</span>
          </label>
          <input 
            id="year"
            type="number" 
            name="year" 
            bind:value={newYear} 
            class="input input-bordered" 
            min="2000" 
            max="2100" 
            required 
          />
        </div>

        <div class="form-control mb-4">
          <label class="label" for="recordables">
            <span class="label-text">Recordables</span>
          </label>
          <input 
            id="recordables"
            type="number" 
            name="recordables" 
            bind:value={newRecordables} 
            class="input input-bordered" 
            min="0" 
            required 
          />
        </div>

        <div class="form-control mb-4">
          <label class="label" for="manhours">
            <span class="label-text">Manhours</span>
          </label>
          <input 
            id="manhours"
            type="number" 
            name="manhours" 
            bind:value={newManhours} 
            class="input input-bordered" 
            min="0" 
            required 
          />
        </div>

        <div class="modal-action">
          <button type="button" class="btn" onclick={() => showAddYearModal = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">Add Year</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Add New Subcontractor Modal -->
{#if showAddSubcontractorModal}
  <div class="modal modal-open">
    <div class="modal-box max-w-4xl">
      <h3 class="font-bold text-lg mb-4">Add New Subcontractor</h3>
      <form method="POST" action="?/addSubcontractor" use:enhance={() => {
        return async ({ update }) => {
          await update();
          await import('$app/navigation').then(mod => mod.invalidateAll());
          closeAddSubcontractorModal();
        };
      }}>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="label" for="trade_pkg">
              <span class="label-text">Trade Package</span>
            </label>
            <input 
              id="trade_pkg"
              type="text" 
              name="trade_pkg" 
              bind:value={newSubcontractor.trade_pkg} 
              class="input input-bordered w-full" 
              required 
            />
          </div>
          <div>
            <label class="label" for="trade_name">
              <span class="label-text">Trade Name</span>
            </label>
            <input 
              id="trade_name"
              type="text" 
              name="trade_name" 
              bind:value={newSubcontractor.trade_name} 
              class="input input-bordered w-full" 
              required 
            />
          </div>
          <div>
            <label class="label" for="fein">
              <span class="label-text">FEIN</span>
            </label>
            <input 
              id="fein"
              type="text" 
              name="fein" 
              bind:value={newSubcontractor.fein} 
              class="input input-bordered w-full" 
              placeholder="XX-XXXXXXX"
              required 
            />
          </div>
          <div>
            <label class="label" for="current_emr">
              <span class="label-text">Current EMR</span>
            </label>
            <input 
              id="current_emr"
              type="text" 
              name="current_emr" 
              bind:value={newSubcontractor.current_emr} 
              class="input input-bordered w-full" 
              step="0.01"
              required 
            />
          </div>
          <div class="col-span-2">
            <label class="label" for="emr_expiration">
              <span class="label-text">EMR Expiration Date</span>
            </label>
            <input 
              id="emr_expiration"
              type="date" 
              name="emr_expiration" 
              bind:value={newSubcontractor.emr_expiration} 
              class="input input-bordered w-full" 
              required 
            />
          </div>
        </div>

        <div class="divider">Annual Safety Data</div>

        <div class="overflow-x-auto mb-4">
          <table class="table table-sm">
            <thead>
              <tr>
                {#each data.years as year}
                  <th colspan="2" class="text-center">{year}</th>
                {/each}
              </tr>
              <tr>
                {#each data.years as year}
                  <th>Recordables</th>
                  <th>Manhours</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              <tr>
                {#each data.years as year}
                  <td>
                    <input 
                      type="number" 
                      name="recordables_{year}" 
                      bind:value={newSubAnnualData[year].recordables}
                      class="input input-xs input-bordered w-20" 
                      min="0"
                      required 
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      name="manhours_{year}" 
                      bind:value={newSubAnnualData[year].manhours}
                      class="input input-xs input-bordered w-24" 
                      min="0"
                      required 
                    />
                  </td>
                {/each}
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-action">
          <button type="button" class="btn" onclick={() => closeAddSubcontractorModal()}>Cancel</button>
          <button type="submit" class="btn btn-primary">Add Subcontractor</button>
        </div>
      </form>
    </div>
  </div>
{/if}