# Admin System Documentation

## Overview
The admin system provides role-based access control for managing KYC applications and user accounts. It supports three user roles: USER, ADMIN, and MODERATOR.

## User Roles

### USER (Default)
- Regular users who can submit KYC applications
- Access to trading features after KYC approval
- Cannot access admin functions

### MODERATOR
- Can review and approve/reject KYC applications
- Access to admin KYC management page
- Cannot access full admin functions

### ADMIN
- Full administrative access
- Can manage all KYC applications
- Access to all admin features
- Can manage user accounts and system settings

## Admin Features

### KYC Management (`/admin/kyc`)
- View all KYC applications with filtering and search
- Approve or reject KYC applications
- View detailed KYC information including documents
- Status tracking (Pending, Approved, Rejected)
- Pagination for large datasets

### Admin Dashboard (`/admin/dashboard`)
- Overview of system statistics
- Quick access to admin functions
- User and KYC counts
- Recent activity monitoring

## API Endpoints

### GET `/api/admin/kyc`
- Fetches all KYC applications with user details
- Supports filtering by status and search
- Includes pagination
- Returns status counts

**Query Parameters:**
- `status`: Filter by KYC status (PENDING, APPROVED, REJECTED, ALL)
- `search`: Search by user name, email, phone, or client ID
- `page`: Page number for pagination
- `limit`: Number of items per page

### PUT `/api/admin/kyc`
- Updates KYC status (approve/reject)
- Logs admin actions
- Requires admin or moderator role

**Request Body:**
```json
{
  "kycId": "kyc-uuid",
  "status": "APPROVED" | "REJECTED",
  "reason": "Optional reason for rejection"
}
```

## Access Control

### Middleware Protection
- Admin routes (`/admin/*`) are protected by middleware
- Requires authentication and appropriate role
- Redirects unauthorized users to login or dashboard

### Session Management
- User roles are included in JWT tokens
- Role information is available in session
- Automatic role-based redirects

## Setup Instructions

### 1. Create Admin Users
Run the admin user creation script:

```bash
npx tsx scripts/create-admin-user.ts
```

This creates:
- **Admin User**: `admin@marketpulse360.live` / `Admin@123`
- **Moderator User**: `moderator@marketpulse360.live` / `Moderator@123`

### 2. Access Admin Panel
1. Login with admin credentials
2. Navigate to `/admin/dashboard`
3. Access KYC management at `/admin/kyc`

### 3. Security Notes
- Change default passwords after first login
- Admin users are automatically verified (email and phone)
- All admin actions are logged in the system

## File Structure

```
app/
├── (admin)/
│   └── admin/
│       ├── dashboard/
│       │   └── page.tsx          # Admin dashboard
│       └── kyc/
│           └── page.tsx          # KYC management page
├── api/
│   └── admin/
│       └── kyc/
│           └── route.ts          # Admin KYC API endpoints
scripts/
└── create-admin-user.ts          # Admin user creation script
```

## Features

### KYC Management Page
- **Search & Filter**: Find applications by user details or status
- **Status Overview**: Visual cards showing pending, approved, rejected counts
- **Detailed View**: Modal with complete KYC information
- **Bulk Actions**: Approve/reject applications with optional reasons
- **Pagination**: Handle large numbers of applications efficiently

### Admin Dashboard
- **Statistics**: Overview of system metrics
- **Quick Actions**: Direct links to admin functions
- **Role Display**: Shows current user's role and permissions
- **Navigation**: Easy access to all admin features

### Security Features
- **Role-based Access**: Middleware enforces role requirements
- **Session Validation**: Automatic role checking on each request
- **Action Logging**: All admin actions are recorded
- **Secure Routes**: Protected admin endpoints

## Usage Examples

### Approving a KYC Application
1. Navigate to `/admin/kyc`
2. Find the pending application
3. Click "View" to see details
4. Click "Approve" to approve the application
5. The user will be notified and can access trading features

### Rejecting a KYC Application
1. Navigate to `/admin/kyc`
2. Find the pending application
3. Click "View" to see details
4. Click "Reject" to reject the application
5. Optionally provide a reason for rejection

### Searching Applications
- Use the search bar to find applications by:
  - User name
  - Email address
  - Phone number
  - Client ID

### Filtering by Status
- Use the status dropdown to filter by:
  - All Status
  - Pending
  - Approved
  - Rejected

## Troubleshooting

### Access Denied Errors
- Ensure user has ADMIN or MODERATOR role
- Check if user is properly authenticated
- Verify session includes role information

### KYC Not Loading
- Check database connection
- Verify KYC table exists and has data
- Check API endpoint permissions

### Role Not Updating
- Clear browser session/cookies
- Re-login to refresh JWT token
- Check database user role field

## Future Enhancements

- [ ] User management interface
- [ ] Transaction monitoring
- [ ] System settings panel
- [ ] Audit log viewer
- [ ] Bulk KYC operations
- [ ] Email notifications for KYC status changes
- [ ] Advanced reporting and analytics
