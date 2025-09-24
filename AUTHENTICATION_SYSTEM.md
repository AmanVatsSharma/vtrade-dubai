# 🔐 Authentication System Documentation

## Overview

This document describes the comprehensive mobile authentication system implemented for the MarketPulse360 trading platform. The system provides enterprise-grade security with multi-step authentication flow including phone verification, OTP, and mPin authentication.

## 🏗️ Architecture

### Authentication Flow

```
Registration: Email/Phone → OTP Verification → mPin Setup → KYC → Dashboard
Login: Mobile/ClientID + Password → OTP Verification → mPin Verification → Dashboard
```

### Key Components

1. **Mobile Authentication Actions** (`actions/mobile-auth.actions.ts`)
2. **OTP Service** (`lib/otp-service.ts`)
3. **mPin Service** (`lib/mpin-service.ts`)
4. **Database Transactions** (`lib/database-transactions.ts`)
5. **Authentication Logger** (`lib/auth-logger.ts`)
6. **UI Components** (`components/auth/`)

## 🔒 Security Features

### ✅ Implemented Security Measures

1. **Cryptographically Secure Session Tokens**
   - Uses `crypto.randomBytes(32)` for session token generation
   - 64-character hex tokens with 2^256 possible combinations

2. **Database Transactions**
   - All multi-step operations wrapped in database transactions
   - Automatic rollback on failures
   - Prevents partial state corruption

3. **Comprehensive Logging**
   - All authentication events logged with severity levels
   - Security violations tracked and monitored
   - Audit trail for compliance

4. **Password Security**
   - bcrypt hashing with salt rounds (10 for passwords, 12 for mPins)
   - Strong password validation (8-32 characters)

5. **OTP Security**
   - 5-minute expiry
   - 3-attempt limit
   - Rate limiting (1 minute between requests)
   - Automatic invalidation after use

6. **mPin Security**
   - 4-6 digit PINs
   - bcrypt hashing with high cost factor (12)
   - Failed attempt tracking
   - Account lockout after multiple failures

7. **Session Management**
   - 24-hour session expiry
   - Device fingerprinting
   - IP address tracking
   - Session cleanup

## 📊 Database Schema

### New Models Added

```prisma
model AuthEvent {
  id        String            @id @default(uuid())
  userId    String?
  eventType AuthEventType
  severity  AuthEventSeverity
  message   String
  metadata  String? // JSON string
  timestamp DateTime
  createdAt DateTime          @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([eventType])
  @@index([severity])
  @@index([timestamp])
  @@map("auth_events")
}

enum AuthEventType {
  REGISTRATION_ATTEMPT
  REGISTRATION_SUCCESS
  REGISTRATION_FAILED
  LOGIN_ATTEMPT
  LOGIN_SUCCESS
  LOGIN_FAILED
  OTP_SENT
  OTP_VERIFIED
  OTP_FAILED
  OTP_RESEND
  MPIN_SETUP_ATTEMPT
  MPIN_SETUP_SUCCESS
  MPIN_SETUP_FAILED
  MPIN_VERIFY_ATTEMPT
  MPIN_VERIFY_SUCCESS
  MPIN_VERIFY_FAILED
  MPIN_RESET_ATTEMPT
  MPIN_RESET_SUCCESS
  MPIN_RESET_FAILED
  SESSION_CREATED
  SESSION_EXPIRED
  SESSION_INVALIDATED
  PHONE_VERIFIED
  KYC_SUBMITTED
  KYC_APPROVED
  KYC_REJECTED
  SECURITY_VIOLATION
  RATE_LIMIT_EXCEEDED
  ACCOUNT_LOCKED
  ACCOUNT_UNLOCKED
}

enum AuthEventSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

## 🧪 Testing

### Test Coverage

The authentication system includes comprehensive tests covering:

1. **Registration Flow**
   - Complete registration process
   - Invalid phone number handling
   - Duplicate email prevention
   - Database transaction integrity

2. **Login Flow**
   - Mobile number login
   - Client ID login
   - Invalid credentials handling
   - Non-existent user handling

3. **OTP Management**
   - OTP generation and sending
   - OTP verification
   - OTP expiry handling
   - Maximum attempts enforcement
   - Resend functionality

4. **mPin Management**
   - mPin setup with confirmation
   - mPin verification
   - Wrong PIN handling
   - mPin reset functionality

5. **Session Management**
   - Session creation and validation
   - Expired session handling
   - Session cleanup

6. **Security Tests**
   - Phone number validation
   - Password strength validation
   - mPin format validation
   - Rate limiting

### Running Tests

```bash
# Run all authentication tests
npm run test:auth

# Run specific test file
npx jest tests/auth-flow.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🚀 Usage Examples

### Registration Flow

```typescript
// 1. User Registration
const registrationResult = await registerWithMobile({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '9876543210',
  password: 'SecurePassword123!'
});

// 2. OTP Verification
const otpResult = await verifyOtp({
  otp: '123456',
  sessionToken: registrationResult.sessionToken
});

// 3. mPin Setup
const mpinResult = await setupMpin({
  mpin: '1234',
  confirmMpin: '1234'
}, sessionToken);
```

### Login Flow

```typescript
// 1. Mobile Login
const loginResult = await mobileLogin({
  identifier: '9876543210', // or 'AB1234'
  password: 'SecurePassword123!'
});

// 2. OTP Verification
const otpResult = await verifyOtp({
  otp: '123456',
  sessionToken: loginResult.sessionToken
});

// 3. mPin Verification
const mpinResult = await verifyMpin({
  mpin: '1234',
  sessionToken: sessionToken
});
```

### Logging Events

```typescript
import { authLogger } from '@/lib/auth-logger';

// Log security events
await authLogger.logSecurityEvent(
  'LOGIN_FAILED',
  'Invalid password provided',
  { userId: 'user123', ipAddress: '192.168.1.1' }
);

// Log registration events
await authLogger.logRegistration(
  'REGISTRATION_SUCCESS',
  'user123',
  'john@example.com',
  '9876543210'
);

// Get user auth events
const events = await authLogger.getUserAuthEvents('user123', 50);
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tradingpro"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AWS SNS (for OTP)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="ap-south-1"

# Test Environment
NODE_ENV="test"
```

### Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Push schema changes
npx prisma db push
```

## 📈 Monitoring & Analytics

### Authentication Metrics

The system tracks the following metrics:

1. **Registration Metrics**
   - Success rate
   - Failure reasons
   - Time to complete

2. **Login Metrics**
   - Success rate
   - Failure reasons
   - Average session duration

3. **Security Metrics**
   - Failed login attempts
   - OTP failures
   - mPin failures
   - Security violations

4. **Performance Metrics**
   - Response times
   - Database query performance
   - SMS delivery rates

### Log Analysis

```typescript
// Get security events
const securityEvents = await authLogger.getSecurityEvents(100);

// Get user-specific events
const userEvents = await authLogger.getUserAuthEvents('user123');

// Clean up old events
await authLogger.cleanupOldEvents();
```

## 🛡️ Security Best Practices

### Implemented

1. ✅ **Secure Session Tokens** - Cryptographically secure generation
2. ✅ **Database Transactions** - Atomic operations with rollback
3. ✅ **Comprehensive Logging** - Audit trail for all events
4. ✅ **Rate Limiting** - Prevents brute force attacks
5. ✅ **Input Validation** - Zod schema validation
6. ✅ **Password Hashing** - bcrypt with proper salt rounds
7. ✅ **OTP Security** - Time-limited, attempt-limited
8. ✅ **mPin Security** - Encrypted storage, attempt tracking

### Recommended Additional Measures

1. **CAPTCHA Integration** - For suspicious activity
2. **Device Fingerprinting** - Enhanced device tracking
3. **IP Whitelisting** - For admin accounts
4. **Biometric Authentication** - For mobile apps
5. **Multi-Factor Authentication** - Additional security layer
6. **Session Invalidation** - Logout from all devices
7. **Concurrent Session Limits** - Prevent multiple logins

## 🚨 Error Handling

### Error Types

1. **Validation Errors** - Invalid input data
2. **Authentication Errors** - Invalid credentials
3. **Authorization Errors** - Insufficient permissions
4. **Rate Limit Errors** - Too many requests
5. **Database Errors** - Connection or transaction failures
6. **External Service Errors** - SMS delivery failures

### Error Response Format

```typescript
interface AuthResponse {
  success?: string;
  error?: string;
  redirectTo?: string;
  sessionToken?: string;
  requiresOtp?: boolean;
  requiresMpin?: boolean;
  userData?: any;
}
```

## 🔄 Maintenance

### Regular Tasks

1. **Clean up expired sessions** - Daily cleanup job
2. **Clean up old auth events** - Weekly cleanup
3. **Monitor security events** - Real-time monitoring
4. **Update dependencies** - Monthly security updates
5. **Review logs** - Weekly security review

### Cleanup Scripts

```typescript
// Clean up expired sessions
await MpinService.cleanupExpiredSessions();

// Clean up expired OTPs
await OtpService.cleanupExpiredOtps();

// Clean up old auth events
await authLogger.cleanupOldEvents();
```

## 📞 Support

For issues or questions regarding the authentication system:

1. Check the test logs for specific error messages
2. Review the authentication events in the database
3. Check the security events for violations
4. Contact the development team with specific error codes

## 🎯 Future Enhancements

1. **Biometric Authentication** - Fingerprint/Face ID support
2. **Hardware Security Keys** - FIDO2/WebAuthn support
3. **Advanced Threat Detection** - ML-based anomaly detection
4. **Compliance Features** - GDPR, SOX compliance tools
5. **Analytics Dashboard** - Real-time security monitoring
6. **Mobile App Integration** - Native mobile authentication

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: Production Ready ✅
