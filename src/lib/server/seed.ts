import { db } from './db';
import { randomUUID } from 'crypto';

export function seedDatabase() {
  // Clear existing data
  db.prepare('DELETE FROM rmp_history').run();
  db.prepare('DELETE FROM rmp_comments').run();
  db.prepare('DELETE FROM rmp_documents').run();
  db.prepare('DELETE FROM safety_rmps').run();
  db.prepare('DELETE FROM annual_data').run();
  db.prepare('DELETE FROM subcontractors').run();
  
  const insertSubcontractor = db.prepare(`
    INSERT INTO subcontractors (
      id,
      trade_pkg,
      trade_name,
      fein,
      current_emr,
      emr_expiration
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const insertAnnualData = db.prepare(`
    INSERT INTO annual_data (
      id,
      subcontractor_id,
      year,
      recordables,
      manhours
    ) VALUES (?, ?, ?, ?, ?)
  `);

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
    insertSubcontractor.run(id, ...sub);
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
    insertAnnualData.run(annualId, subcontractorIds[subIndex], data[1], data[2], data[3]);
  }

  // Insert sample RMPs
  const insertRMP = db.prepare(`
    INSERT INTO safety_rmps (
      id,
      subcontractor_id,
      project_name,
      submitted_date,
      due_date,
      completed_date,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO rmp_history (
      id,
      rmp_id,
      status_to,
      changed_by,
      notes
    ) VALUES (?, ?, ?, ?, ?)
  `);

  const rmps = [
    [0, 'Downtown Plaza', '2024-11-01', '2024-11-15', null, 'Rejected'],
    [1, 'Medical Center Expansion', '2024-11-05', '2024-11-20', null, 'Pending'],
    [2, 'Office Tower A', '2024-11-08', '2024-11-18', null, 'Pending'],
    [3, 'Residential Complex', '2024-10-15', '2024-10-25', '2024-10-25', 'Approved'],
    [4, 'Shopping Mall Renovation', '2024-10-10', '2024-10-22', '2024-10-22', 'Approved'],
    [5, 'Hotel Construction', '2024-09-20', '2024-09-30', '2024-09-30', 'Canceled']
  ];

  rmps.forEach(rmp => {
    const rmpId = randomUUID();
    const subIndex = rmp[0] as number;
    const status = rmp[5] as string; // Get the status value
    
    // Insert RMP
    insertRMP.run(rmpId, subcontractorIds[subIndex], ...rmp.slice(1));
    
    // Add initial history entry
    const historyId = randomUUID();
    insertHistory.run(
      historyId,
      rmpId,
      status, // Use the status variable here
      'System',
      'RMP Created'
    );
  });

  console.log('Database seeded with UUIDs!');
}