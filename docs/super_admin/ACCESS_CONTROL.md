## Super Admin Access Control

- Role hierarchy: SUPER_ADMIN > ADMIN > MODERATOR > USER
- Admin console (`/admin-console/**`): ADMIN, MODERATOR, SUPER_ADMIN
- Super Admin APIs (`/api/super-admin/**`): SUPER_ADMIN only
- Header persists role in localStorage as `session_user_role` for client-only UI gating
- Middleware enforces admin and super-admin protections with JSON errors for APIs

Flow:
1. Request enters middleware
2. If `/api/super-admin/**` → must be SUPER_ADMIN
3. If admin route → must be ADMIN/MODERATOR/SUPER_ADMIN
4. Else standard auth + verification flow
