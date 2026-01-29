# Domain-to-Git-Branch Assignment Feature

This feature allows users to configure custom domain mappings to specific Git branches, enabling automated deployments of different branches to different domains.

## Feature Overview

### User Interface
The domain management interface is accessible from the **Settings** page and provides:

1. **Add Domain**: Users can add new domain-to-branch mappings
2. **Edit Mapping**: Modify the Git branch or environment for existing domains
3. **Delete Mapping**: Remove domain configurations with confirmation
4. **Environment Selection**: Choose between Production and Preview environments

### Database Schema
Table: `domain_git_mappings`

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- email: TEXT (User's email)
- domain: TEXT (e.g., "example.com")
- git_branch: TEXT (e.g., "main", "develop", "feature/new-ui")
- environment: TEXT ("production" or "preview")
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**Security:**
- Row Level Security (RLS) policies ensure users can only manage their own domains
- Unique constraint on (user_id, domain) prevents duplicate domains

### API Endpoints

**GET /api/domains**
- Lists all domain mappings for the authenticated user
- Requires: Bearer token authentication

**POST /api/domains**
- Creates a new domain mapping
- Requires: Bearer token, domain, git_branch, environment (optional, defaults to "preview")
- Validates domain format and branch name

**PUT /api/domains**
- Updates an existing domain mapping
- Requires: Bearer token, id, git_branch and/or environment
- Only allows updating branch and environment, not the domain itself

**DELETE /api/domains?id={uuid}**
- Deletes a domain mapping
- Requires: Bearer token, id parameter

### Validation Rules

**Domain Validation:**
- Must be a valid domain format (e.g., "example.com", "sub.example.com")
- Does NOT accept single-label domains like "localhost"
- Case-insensitive, automatically lowercased

**Branch Name Validation:**
- Length: 1-255 characters
- Invalid characters: spaces, ~, ^, :, ?, *, [, ], \
- Valid examples: "main", "develop", "feature/new-ui", "release/v1.0.0"

**Environment:**
- Must be either "production" or "preview"

### Usage Flow

1. User navigates to Settings page
2. Scrolls to "Domain Management" section
3. Clicks "Add Domain" button
4. Fills in:
   - Domain name (e.g., "app.example.com")
   - Git branch (e.g., "main")
   - Environment (Production or Preview)
5. Clicks "Save Domain"
6. Domain appears in the list with edit and delete options

### Security Features

- **Authentication Required**: All API endpoints require valid Bearer token
- **Row Level Security**: Database policies ensure users can only access their own domains
- **Input Validation**: Server-side validation for domain format and branch names
- **Unique Constraints**: Prevents duplicate domains per user
- **SQL Injection Protection**: Uses parameterized queries via Supabase client

### Code Structure

**Frontend:**
- `/src/components/domains/DomainManagement.jsx` - Main component
- `/src/pages/Settings.jsx` - Integration point
- Uses existing UI components from shadcn/ui (Button, Input, Select)
- Toast notifications for user feedback

**Backend:**
- `/api/domains/index.js` - REST API handler
- Uses Supabase JS client for database operations
- Validates inputs before database operations

**Database:**
- `/supabase/migrations/20260129000000_create_domain_git_mappings.sql` - Schema migration

**Configuration:**
- `/vite.config.js` - Local development API routing

### Testing

**Unit Tests:**
- Domain validation regex tests
- Branch name validation tests
- Edge cases for length limits

**Build Tests:**
- Successful Vite build
- No TypeScript/ESLint errors in new code

**Security:**
- CodeQL analysis passed with 0 vulnerabilities
- Code review completed and issues addressed

## Limitations

- Single-label domains (like "localhost") are not supported by design
- Domain names are stored lowercase only
- Once a domain is created, the domain itself cannot be edited (only branch and environment)
- Requires authentication - not available for anonymous users
