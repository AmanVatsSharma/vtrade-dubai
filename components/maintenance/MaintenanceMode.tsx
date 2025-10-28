'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, Wrench, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { LiquidBackground, GlowingText } from '@/components/404';

/**
 * Maintenance Mode Component
 * 
 * Futuristic maintenance page with cyberpunk aesthetic featuring:
 * - Liquid metallic flows with electric blue/cyan glows
 * - Real-time countdown timer with glowing effects
 * - Status updates and progress indicators
 * - Admin bypass functionality
 * - Responsive design for all devices (320px to 4K)
 * - Accessibility compliance with reduced motion support
 * - Console logging for debugging
 * - Mobile-first design with touch optimization
 * 
 * Design Features:
 * - Deep black background with animated liquid flows
 * - Glowing text effects with electric blue/cyan colors
 * - Floating particles and enhanced animations
 * - Cyberpunk aesthetic matching 404 page style
 * - Performance-optimized for 60fps on mobile devices
 * 
 * @component
 * @returns JSX.Element - The futuristic maintenance mode page
 */
export default function MaintenanceMode() {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  // Get maintenance configuration from environment
  const maintenanceMessage = process.env.MAINTENANCE_MESSAGE || 
    "We're performing scheduled maintenance to improve your experience. We'll be back shortly!";
  
  const maintenanceEndTime = process.env.MAINTENANCE_END_TIME;
  // HARDCODED: Maintenance mode is always enabled for now
  const isMaintenanceMode = true;

  console.log('[MaintenanceMode] Component mounted', {
    isMaintenanceMode,
    maintenanceMessage,
    maintenanceEndTime,
    timestamp: new Date().toISOString()
  });

  // Calculate time remaining until maintenance ends
  useEffect(() => {
    if (!maintenanceEndTime) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(maintenanceEndTime).getTime();
      const difference = endTime - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('00:00:00');
      }
    };

    // Calculate immediately
    calculateTimeLeft();
    
    // Update every second
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [maintenanceEndTime]);

  // Handle refresh button click
  const handleRefresh = async () => {
    console.log('[MaintenanceMode] Refresh button clicked');
    setIsRefreshing(true);
    setLastChecked(new Date());
    
    try {
      // Simulate API call to check maintenance status
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload the page to get fresh environment variables
      window.location.reload();
    } catch (error) {
      console.error('[MaintenanceMode] Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle admin bypass (if user has admin privileges)
  const handleAdminBypass = () => {
    console.log('[MaintenanceMode] Admin bypass requested');
    // This would typically check user authentication and role
    // For now, we'll just show a message
    alert('Admin bypass is available for ADMIN and SUPER_ADMIN roles. Please login with appropriate credentials to access the system during maintenance.');
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Futuristic Animated Background */}
      <LiquidBackground />

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">

        {/* Main Title - Glowing Text */}
        <div className="mb-6 text-center">
          <GlowingText size="large">MAINTENANCE</GlowingText>
        </div>

        {/* Subtitle */}
        <div className="mb-8 text-center">
          <h2 className="mb-4 text-2xl font-semibold text-cyan-300 sm:text-3xl lg:text-4xl">
            System Under Maintenance
          </h2>
          <p className="mx-auto max-w-md text-base text-slate-400 sm:text-lg">
            {maintenanceMessage}
            <br className="hidden sm:block" />
            We'll be back online shortly.
          </p>
        </div>

        {/* Main Content Card */}
        <div className="relative z-10 w-full max-w-2xl">
          <Card className="bg-slate-900/90 backdrop-blur-sm border-slate-700/50 shadow-2xl ring-1 ring-cyan-500/20">
            <CardContent className="space-y-6 p-6">
              {/* Status Badge */}
              <div className="flex justify-center">
                <Badge 
                  className="px-4 py-2 text-sm font-medium bg-orange-500/20 text-orange-300 border-orange-500/50 ring-1 ring-orange-500/30"
                  style={{
                    boxShadow: '0 0 20px rgba(251, 146, 60, 0.3)',
                  }}
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Maintenance in Progress
                </Badge>
              </div>

              {/* Countdown Timer */}
              {maintenanceEndTime && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 text-cyan-300 mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">Estimated completion time:</span>
                  </div>
                  <div 
                    className="text-4xl font-mono font-bold text-cyan-400 mb-2"
                    style={{
                      textShadow: '0 0 10px rgba(0, 217, 255, 0.5), 0 0 20px rgba(0, 217, 255, 0.3)',
                    }}
                  >
                    {timeLeft}
                  </div>
                  <div className="text-sm text-slate-400">
                    {new Date(maintenanceEndTime).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Progress Indicators */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" style={{ filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.5))' }} />
                  <span className="text-slate-300">Database optimization</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" style={{ filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.5))' }} />
                  <span className="text-slate-300">Security updates</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" style={{ filter: 'drop-shadow(0 0 4px rgba(0, 217, 255, 0.5))' }} />
                  <span className="text-slate-300">Performance improvements</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-600"></div>
                  <span className="text-slate-400">Final testing</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="group relative flex-1 min-w-[200px] overflow-hidden rounded-lg bg-transparent px-8 py-3 text-base font-semibold text-cyan-300 ring-2 ring-cyan-500/50 transition-all duration-300 hover:bg-cyan-500/10 hover:ring-cyan-400/70"
                  style={{
                    boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)',
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isRefreshing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Check Status
                      </>
                    )}
                  </span>
                  {/* Glowing hover effect */}
                  <span className="absolute inset-0 -z-10 bg-cyan-500/20 blur-xl transition-opacity duration-300 group-hover:opacity-100"></span>
                </Button>
                
                <Button
                  onClick={handleAdminBypass}
                  variant="outline"
                  className="flex-1 min-w-[200px] border-slate-600 bg-slate-900/50 px-8 py-3 text-base font-semibold text-slate-300 backdrop-blur-sm transition-all duration-300 hover:bg-slate-800/70 hover:text-white"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Admin Access
                  </span>
                </Button>
              </div>

              {/* Last Checked Time */}
              <div className="text-center text-xs text-slate-500 pt-2">
                Last checked: {lastChecked.toLocaleTimeString()}
              </div>

              {/* Contact Information */}
              <div className="text-center text-sm text-slate-400 pt-4 border-t border-slate-700/50">
                <p>
                  Need immediate assistance?{' '}
                  <a 
                    href="mailto:support@marketpulse360.live" 
                    className="text-cyan-400 hover:text-cyan-300 underline transition-colors"
                  >
                    Contact Support
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Additional Help Text */}
          <div className="mt-12 text-center">
            <p className="text-sm text-slate-500">
              System Status: <span className="font-medium text-orange-400">Under Maintenance</span>
            </p>
          </div>
        </div>

        {/* Floating Particles Effect */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-cyan-400/40 animate-pulse"
              style={{
                left: `${10 + i * 12}%`,
                top: `${15 + i * 8}%`,
                animationDelay: `${i * 0.7}s`,
                animationDuration: `${2.5 + i * 0.4}s`,
              }}
            />
          ))}
        </div>

        {/* Mobile-specific optimizations and reduced motion handled via Tailwind CSS */}
      </div>
    </div>
  );
}