import { supabase } from './db';
import { randomUUID } from 'crypto';

export function seedDatabase() {
  // Clear existing data in Supabase
  Promise.all([
    supabase.from('rmp_history').delete().neq('id', ''),
    supabase.from('rmp_comments').delete().neq('id', ''),
    supabase.from('rmp_documents').delete().neq('id', ''),
    supabase.from('safety_rmps').delete().neq('id', ''),
    supabase.from('annual_data').delete().neq('id', ''),
    supabase.from('subcontractors').delete().neq('id', '')
  ]);

  const subcontractorIds: string[] = [];
  const subcontractors = [
    ['Concrete', 'ABC Concrete Co.', '12-3456789', '0.95', '2025-06-30'],
    ['Electrical', 'XYZ Electric LLC', '98-7654321', '0.88', '2025-08-15'],
    ['HVAC', 'Cool Air Systems', '45-6789012', '1.15', '2025-04-20'],
    ['Plumbing', 'Premier Plumbing Inc', '78-9012345', '0.92', '2025-07-10'],
    ['Framing', 'Precision Framing Co', '23-4567890', '1.35', '2025-05-25'],
    ['Drywall', 'Quality Drywall LLC', '56-7890123', '0.82', '2025-09-30']
  ];

  // Insert subcontractors with UUIDs
  for (const sub of subcontractors) {
    const id = randomUUID();
    subcontractorIds.push(id);
    supabase.from('subcontractors').insert({
      id,
      trade_pkg: sub[0],
      trade_name: sub[1],
      fein: sub[2],
      current_emr: sub[3],
      emr_expiration: sub[4]
    });
  }

  // Annual data using UUID references
  const annualData = [
    [0, 2022, 3, 45000], [0, 2023, 1, 48000], [0, 2024, 2, 50000], [0, 2025, 1, 52000],
    [1, 2022, 1, 68000], [1, 2023, 2, 72000], [1, 2024, 1, 75000], [1, 2025, 0, 78000],
    [2, 2022, 4, 55000], [2, 2023, 2, 58000], [2, 2024, 3, 60000], [2, 2025, 2, 62000],
    [3, 2022, 1, 36000], [3, 2023, 2, 38000], [3, 2024, 1, 40000], [3, 2025, 1, 42000],
    [4, 2022, 6, 75000], [4, 2023, 4, 78000], [4, 2024, 5, 80000], [4, 2025, 3, 82000],
    [5, 2022, 0, 50000], [5, 2023, 1, 52000], [5, 2024, 1, 55000], [5, 2025, 0, 57000]
  ];

  for (const data of annualData) {
    const subIndex = data[0] as number;
    const annualId = randomUUID();
    supabase.from('annual_data').insert({
      id: annualId,
      subcontractor_id: subcontractorIds[subIndex],
      year: data[1],
      recordables: data[2],
      manhours: data[3]
    });
  }

  // Insert sample RMPs
  const rmps = [
    [0, 'Downtown Plaza', '2024-11-01', '2024-11-15', null, 'Rejected'],
    [1, 'Medical Center Expansion', '2024-11-05', '2024-11-20', null, 'Pending'],
    [2, 'Office Tower A', '2024-11-08', '2024-11-18', null, 'Pending'],
    [3, 'Residential Complex', '2024-10-15', '2024-10-25', '2024-10-25', 'Approved'],
    [4, 'Shopping Mall Renovation', '2024-10-10', '2024-10-22', '2024-10-22', 'Approved'],
    [5, 'Hotel Construction', '2024-09-20', '2024-09-30', '2024-09-30', 'Canceled']
  ];

  for (const rmp of rmps) {
    const rmpId = randomUUID();
    const subIndex = rmp[0] as number;
    const status = rmp[5] as string;
    supabase.from('safety_rmps').insert({
      id: rmpId,
      subcontractor_id: subcontractorIds[subIndex],
      project_name: rmp[1],
      submitted_date: rmp[2],
      due_date: rmp[3],
      completed_date: rmp[4],
      status,
      created_by: 'system'
    });
    // Add initial history entry
    const historyId = randomUUID();
    supabase.from('rmp_history').insert({
      id: historyId,
      rmp_id: rmpId,
      status_to: status,
      changed_by: 'system',
      notes: 'RMP Created'
    });
  }

  console.log('Supabase database seeded with UUIDs!');
}