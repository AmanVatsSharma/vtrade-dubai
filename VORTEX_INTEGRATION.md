# Vortex API Integration Guide

## Overview
This document describes the comprehensive Vortex API integration implemented in the trading platform, including authentication, error handling, logging, and UI components.

## Features Implemented

### 1. Enhanced Vortex API Client (`lib/vortex-enhanced.ts`)
- **Comprehensive Error Handling**: Custom error classes with detailed error codes
- **Session Management**: Automatic session validation and management
- **Logging Integration**: Detailed logging for all API operations
- **Type Safety**: Full TypeScript support with proper interfaces
- **Timeout Handling**: Configurable timeouts for API requests
- **Retry Logic**: Built-in retry mechanisms for failed requests

### 2. Advanced Logging System (`lib/vortex/vortexLogger.ts`)
- **Structured Logging**: Categorized logging by operation type
- **Multiple Log Levels**: DEBUG, INFO, WARN, ERROR, CRITICAL
- **Contextual Information**: User IDs, session IDs, processing times
- **Development/Production Modes**: Different logging strategies
- **Vortex-Specific Methods**: Dedicated logging for Vortex operations
- **Configurable Disable**: Environment variable to disable all logging when needed

#### Logging Configuration
The Vortex logger can be completely disabled using an environment variable:
- Set `DISABLE_VORTEX_LOGGER=true` to disable all logging operations
- This is useful for performance optimization or when you want to reduce log noise
- When disabled, all logger methods return immediately without any processing
- Use `logger.isLoggingDisabled()` to check if logging is currently disabled

### 3. Enhanced Admin Login UI (`app/(admin)/admin/auth/login/page.tsx`)
- **System Status Monitoring**: Real-time status of database, Vortex API, and configuration
- **Error Handling**: Comprehensive error display and user feedback
- **Loading States**: Visual feedback during authentication process
- **Debug Information**: Development-mode debugging information
- **Responsive Design**: Mobile-friendly interface

### 4. Comprehensive Admin Dashboard (`app/(admin)/admin/dashboard/page.tsx`)
- **Real-time Status**: Live monitoring of system components
- **Tabbed Interface**: Organized sections for different functionalities
- **Vortex Testing**: Built-in tools to test Vortex API connections
- **System Logs**: Real-time log viewing
- **Error Management**: Centralized error handling and display

### 5. Enhanced API Routes
- **Callback Route**: Robust OAuth callback handling with comprehensive logging
- **Quotes API**: Enhanced quotes endpoint with detailed error handling
- **Status API**: Comprehensive system status monitoring

## Environment Variables Required

Create a `.env.local` file with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nextjs_graphql_autocrud"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/nextjs_graphql_autocrud"

# Vortex API Configuration
VORTEX_APPLICATION_ID="your-vortex-application-id"
VORTEX_X_API_KEY="your-vortex-x-api-key"
NEXT_PUBLIC_VORTEX_APPLICATION_ID="your-vortex-application-id"
DISABLE_VORTEX_LOGGER="false"

# Application Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Logging Configuration (Optional)
DISABLE_VORTEX_LOGGER="true"  # Set to 'true' to disable all Vortex logging

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
```

## Database Schema

The integration uses the existing `VortexSession` table:

```sql
model VortexSession {
  id          Int      @id @default(autoincrement())
  userId      Int
  accessToken String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## API Endpoints

### Authentication Flow
1. **Login**: `GET /admin/auth/login` - Enhanced login page with system status
2. **Callback**: `GET /admin/api/callback` - OAuth callback with comprehensive error handling
3. **Dashboard**: `GET /admin/dashboard` - Comprehensive admin dashboard

### Data Endpoints
1. **Quotes**: `GET /api/quotes?q=INSTRUMENT&mode=ltp` - Enhanced quotes API
2. **Status**: `GET /api/admin/db-status` - System status monitoring

## Usage Examples

### Testing Vortex Connection
```typescript
import { vortexAPI } from '@/lib/vortex-enhanced';

// Check if session is valid
const isValid = await vortexAPI.isSessionValid();

// Get quotes
const quotes = await vortexAPI.getQuotes(['NIFTY', 'BANKNIFTY'], 'ltp');

// Get user profile
const profile = await vortexAPI.getUserProfile();
```

### Using the Logger
```typescript
import { logger, LogCategory } from '@/lib/logger';

// Log Vortex API operations
await logger.logVortexAPI('API request successful', { endpoint: '/quotes' });

// Log errors
await logger.error(LogCategory.VORTEX_QUOTES, 'Failed to fetch quotes', error);
```

## Error Handling

The integration includes comprehensive error handling:

### Error Types
- **CONFIG_ERROR**: Missing or invalid configuration
- **SESSION_ERROR**: Session-related issues
- **API_REQUEST_FAILED**: Vortex API request failures
- **TOKEN_EXCHANGE_FAILED**: OAuth token exchange issues
- **UNEXPECTED_ERROR**: Unexpected system errors

### Error Responses
All API endpoints return structured error responses:
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "details": "Additional error details"
}
```

## Logging Categories

- **VORTEX_AUTH**: Authentication operations
- **VORTEX_API**: General API operations
- **VORTEX_QUOTES**: Market data operations
- **VORTEX_ORDERS**: Order management
- **VORTEX_POSITIONS**: Position tracking
- **DATABASE**: Database operations
- **AUTH**: General authentication
- **SYSTEM**: System operations
- **UI**: User interface operations

## Development Features

### Debug Mode
In development mode, the system provides:
- Detailed console logging
- Debug information in UI
- Extended error details
- Performance timing

### System Status Monitoring
Real-time monitoring of:
- Database connectivity
- Vortex API status
- Session validity
- Configuration completeness

## Security Considerations

1. **Token Management**: Access tokens are stored securely in the database
2. **Environment Variables**: Sensitive data is stored in environment variables
3. **Error Sanitization**: Error messages are sanitized before user display
4. **Session Validation**: Regular session validation prevents unauthorized access
5. **Logging Security**: Sensitive data is masked in logs

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Check `.env.local` file exists
   - Verify all required variables are set
   - Restart the development server

2. **Database Connection Issues**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL configuration
   - Run database migrations

3. **Vortex API Issues**
   - Verify VORTEX_APPLICATION_ID and VORTEX_X_API_KEY
   - Check Vortex API status
   - Review authentication flow

4. **Session Issues**
   - Clear browser cookies
   - Check database for expired sessions
   - Re-authenticate through login flow

### Debug Steps

1. Check system status in admin dashboard
2. Review console logs for error details
3. Verify environment variables
4. Test database connectivity
5. Test Vortex API endpoints individually

## Performance Monitoring

The integration includes performance monitoring:
- Request processing times
- API response times
- Database query performance
- Error rates and types

## Future Enhancements

Potential improvements:
1. **Real-time WebSocket Integration**: Live market data updates
2. **Advanced Error Recovery**: Automatic retry mechanisms
3. **Performance Metrics**: Detailed performance analytics
4. **User Management**: Multi-user session management
5. **API Rate Limiting**: Request throttling and management

## Support

For issues or questions:
1. Check the system logs in the admin dashboard
2. Review the console output for detailed error information
3. Verify all environment variables are correctly configured
4. Test individual components using the admin dashboard tools
