# Password Reset Flow

This document describes the secure email-based password reset that accepts a unified identifier (email, mobile number, or Client ID).

## UI
- Page: `app/(main)/auth/forgot-password/page.tsx` (Identifier input)
- Page: `app/(main)/auth/password-reset/page.tsx` (Token + new password)

## Server
- `resetPassword({ identifier })` in `actions/auth.actions.ts`
- `newPassword(values, token)` in `actions/auth.actions.ts`

## Flow Chart
```
[Identifier input] -> resetPassword
      | find user by email/phone/clientId
      v
 [has email?] --No--> [return generic success]
      |
     Yes
      v
[generate token + send email]
      v
[/auth/password-reset?token=... -> newPassword]
```

## Notes
- Generic success to prevent user enumeration
- Token validity: 1 hour
- `middleware.ts` allows unauthenticated `/auth/password-reset`
