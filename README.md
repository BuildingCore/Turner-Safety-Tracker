# Turner Safety Tracker

A comprehensive Safety Risk Management Program (RMP) tracking system built with SvelteKit, designed to manage subcontractor safety records, documentation, and compliance workflows.

## Features

### Dashboard
- Overview of all Safety RMPs with real-time status tracking
- Filter RMPs by status (Pending, Rejected, Approved, Canceled)
- Quick view of subcontractor safety metrics (EMR and 3-Year RIR)
- Searchable and sortable data table

### Subcontractor Management
- Track subcontractor information (Trade Package, FEIN, EMR)
- Monitor annual safety data (recordables and manhours)
- Automatic 3-Year Recordable Incident Rate (RIR) calculation
- Color-coded safety metrics:
  - **EMR**: Green (≤1.0), Yellow (>1.0)
  - **3-Year RIR**: Green (≤2.5), Yellow (>2.5 to <3.5), Red (≥3.5)

### RMP Workflow
- **Status Management**: Dynamic status updates (Pending → Rejected/Approved/Canceled)
- **Document Upload**: Multi-file upload support for RMP documentation
- **Activity Timeline**: Unified view of status changes and comments
- **Automatic Completion Dates**: Set when RMP is Approved or Canceled
- **Restricted Editing**: Only Pending and Rejected RMPs allow document uploads and comments

### Safety Metrics
- **Current EMR**: Experience Modification Rate tracking
- **3-Year RIR**: Recordable Incident Rate calculated as:
  ```
  RIR = (Total Recordables × 200,000) / Total Manhours
  ```
- Annual breakdown view with collapsible details

## Technology Stack

- **Frontend**: SvelteKit 2.x with Svelte 5 (using runes)
- **Database**: SQLite with better-sqlite3
- **Styling**: DaisyUI + TailwindCSS
- **File Storage**: Local filesystem with secure download endpoints

## Database Schema

### Tables
- `subcontractors`: Core subcontractor information
- `annual_data`: Year-by-year safety records
- `safety_rmps`: RMP submissions and status
- `rmp_documents`: Uploaded files and metadata
- `rmp_comments`: Communication thread for each RMP
- `rmp_history`: Audit trail of all status changes

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm/pnpm/yarn

### Installation

```sh
# Clone the repository
git clone <repository-url>
cd SafetyTracker

# Install dependencies
npm install

# Start development server
npm run dev

# Or open in browser automatically
npm run dev -- --open
```

### First Run
The application will automatically:
1. Create the SQLite database (`dev.db` for development)
2. Initialize all tables with proper schema
3. Seed sample data (6 subcontractors with historical data)

## Project Structure

```
SafetyTracker/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db.ts          # Database initialization
│   │   │   └── seed.ts        # Sample data seeding
│   │   └── stores/
│   │       └── filters.ts     # Global filter state
│   ├── routes/
│   │   ├── dashboard/         # Main dashboard view
│   │   ├── srmp/
│   │   │   ├── [id]/          # Individual RMP details
│   │   │   └── +page.svelte   # RMP list view
│   │   └── uploads/
│   │       └── rmps/
│   │           └── [filename]/ # File download endpoint
│   └── app.html
├── uploads/                   # File storage directory
│   └── rmps/                  # RMP document uploads
├── dev.db                     # Development database
└── README.md
```

## Key Features Explained

### Status Workflow
1. **Pending**: Initial submission state - allows document uploads and comments
2. **Rejected**: Review failed - allows resubmission with additional documents/comments
3. **Approved**: Review passed - locks the RMP, sets completion date
4. **Canceled**: RMP withdrawn - locks the RMP, sets completion date

### Document Management
- Supports multiple file formats: PDF, DOC, DOCX, JPG, PNG
- Files stored with unique identifiers to prevent conflicts
- Secure download through dedicated server endpoint
- File metadata tracked (size, uploader, timestamp)

### Activity Timeline
- Combined view of status changes and comments
- Chronologically sorted (newest first)
- Tracks who made changes and when
- Optional notes for status changes

## Building for Production

```sh
# Create production build
npm run build

# Preview production build
npm run preview
```

### Deployment Considerations
- Choose appropriate [SvelteKit adapter](https://svelte.dev/docs/kit/adapters)
- Update database path in `db.ts` for production
- Configure file upload directory for production environment
- Set up proper file permissions for `uploads/` directory

## API Routes

### RMP Detail Actions
- `POST /srmp/[id]?/updateStatus` - Update RMP status
- `POST /srmp/[id]?/uploadDocuments` - Upload documents
- `POST /srmp/[id]?/addComment` - Add comment

### File Downloads
- `GET /uploads/rmps/[filename]` - Download document

## Database Seeding

To reset and reseed the database:

```typescript
// In src/routes/+layout.server.ts or any server file
import { seedDatabase } from '$lib/server/seed';

// Call when needed
seedDatabase();
```

## Future Enhancements
- [ ] User authentication and authorization
- [ ] Email notifications for status changes
- [ ] Advanced reporting and analytics
- [ ] Export functionality (PDF, Excel)
- [ ] Calendar view for due dates
- [ ] Bulk operations for RMPs
- [ ] Document preview functionality
- [ ] Mobile-responsive improvements

## License

[Your License Here]

## Contact

[Your Contact Information]
