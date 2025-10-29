/**
 * Maintenance Mode Utilities
 * 
 * Centralized maintenance mode configuration and utilities
 * Provides type-safe access to maintenance settings
 */

export interface MaintenanceConfig {
  isEnabled: boolean;
  message?: string;
  endTime?: string;
  allowAdminBypass?: boolean;
}

export interface MaintenanceStatus {
  isMaintenanceMode: boolean;
  message: string;
  endTime?: string;
  lastChecked: Date;
}

/**
 * Get current maintenance mode configuration
 * Currently hardcoded as enabled - will be moved to environment variables later
 * 
 * @returns MaintenanceConfig - Current maintenance configuration
 */
export function getMaintenanceConfig(): MaintenanceConfig {
  console.log('[MaintenanceConfig] Reading maintenance configuration (hardcoded)');
  
  // HARDCODED: Maintenance mode is always enabled for now
  const isEnabled = true;
  const message = process.env.MAINTENANCE_MESSAGE || 
    "We're performing scheduled maintenance to improve your experience. We'll be back shortly!";
  const endTime = process.env.MAINTENANCE_END_TIME;
  const allowAdminBypass = process.env.MAINTENANCE_ALLOW_ADMIN_BYPASS !== 'false';

  const config: MaintenanceConfig = {
    isEnabled,
    message,
    endTime,
    allowAdminBypass
  };

  console.log('[MaintenanceConfig] Configuration loaded (hardcoded enabled):', config);
  return config;
}

/**
 * Check if maintenance mode is currently active
 * 
 * @returns boolean - True if maintenance mode is active
 */
export function isMaintenanceModeActive(): boolean {
  const config = getMaintenanceConfig();
  console.log('[MaintenanceMode] Checking if maintenance mode is active:', config.isEnabled);
  return config.isEnabled;
}

/**
 * Get maintenance status for API responses
 * 
 * @returns MaintenanceStatus - Current maintenance status
 */
export function getMaintenanceStatus(): MaintenanceStatus {
  const config = getMaintenanceConfig();
  
  return {
    isMaintenanceMode: config.isEnabled,
    message: config.message || 'System maintenance in progress',
    endTime: config.endTime,
    lastChecked: new Date()
  };
}

/**
 * Check if a user can bypass maintenance mode
 * Allows ADMIN and SUPER_ADMIN roles to bypass maintenance mode
 * 
 * @param userRole - User's role (ADMIN, SUPER_ADMIN, etc.)
 * @returns boolean - True if user can bypass maintenance
 */
export function canBypassMaintenance(userRole?: string): boolean {
  const config = getMaintenanceConfig();
  
  if (!config.allowAdminBypass) {
    console.log('[MaintenanceMode] Admin bypass disabled');
    return false;
  }

  // Allow ADMIN and SUPER_ADMIN roles to bypass maintenance mode
  const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
  const canBypass = userRole ? allowedRoles.includes(userRole) : false;
  
  console.log('[MaintenanceMode] Bypass check:', { userRole, canBypass, allowedRoles });
  return canBypass;
}

/**
 * Calculate time remaining until maintenance ends
 * 
 * @param endTime - ISO string of maintenance end time
 * @returns string - Formatted time remaining (HH:MM:SS)
 */
export function calculateTimeRemaining(endTime: string): string {
  const now = new Date().getTime();
  const end = new Date(endTime).getTime();
  const difference = end - now;

  if (difference <= 0) {
    return '00:00:00';
  }

  const hours = Math.floor(difference / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Validate maintenance configuration
 * 
 * @param config - Maintenance configuration to validate
 * @returns boolean - True if configuration is valid
 */
export function validateMaintenanceConfig(config: MaintenanceConfig): boolean {
  console.log('[MaintenanceConfig] Validating configuration:', config);
  
  if (typeof config.isEnabled !== 'boolean') {
    console.error('[MaintenanceConfig] Invalid isEnabled value:', config.isEnabled);
    return false;
  }

  if (config.endTime && isNaN(new Date(config.endTime).getTime())) {
    console.error('[MaintenanceConfig] Invalid endTime format:', config.endTime);
    return false;
  }

  console.log('[MaintenanceConfig] Configuration is valid');
  return true;
}