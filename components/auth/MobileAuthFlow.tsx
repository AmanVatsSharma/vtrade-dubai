/**
 * File: components/auth/MobileAuthFlow.tsx
 * Module: components/auth
 * Purpose: Step-based mobile auth flow (login/register/otp/mpin).
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Rebranded user-facing copy from MarketPulse360 to VTrade.
 */

"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileLoginForm from './MobileLoginForm'
import OtpVerificationForm from './OtpVerificationForm'
import MpinForm from './MpinForm'
import MobileRegistrationForm from './MobileRegistrationForm'

type AuthStep = 'login' | 'register' | 'otp' | 'mpin-setup' | 'mpin-verify'

interface AuthData {
  sessionToken?: string;
  userData?: any;
  requiresOtp?: boolean;
  requiresMpin?: boolean;
  redirectTo?: string;
}

interface MobileAuthFlowProps {
  initialStep?: AuthStep;
}

const MobileAuthFlow: React.FC<MobileAuthFlowProps> = ({ initialStep = 'login' }) => {
  const [currentStep, setCurrentStep] = useState<AuthStep>(initialStep)
  const [authData, setAuthData] = useState<AuthData>({})
  const router = useRouter()

  const persistSessionToken = (token?: string) => {
    try {
      if (typeof window === 'undefined') return;
      if (token) {
        sessionStorage.setItem('authSessionToken', token);
      }
    } catch {}
  }

  const readPersistedSessionToken = (): string | undefined => {
    try {
      if (typeof window === 'undefined') return undefined;
      return sessionStorage.getItem('authSessionToken') || undefined;
    } catch {
      return undefined;
    }
  }

  // Handle case where user is redirected to a specific step without session data
  // Avoid route-level redirects that can cause middleware loops; instead, fall back to login step in-place
  React.useEffect(() => {
    if (['otp', 'mpin-setup', 'mpin-verify'].includes(initialStep) && !authData.sessionToken) {
      console.warn('[MobileAuthFlow] Missing sessionToken for step', initialStep, '→ trying to restore from sessionStorage.');
      const restored = readPersistedSessionToken();
      if (restored) {
        console.log('[MobileAuthFlow] Restored sessionToken from sessionStorage. Proceeding.');
        setAuthData((prev) => ({ ...prev, sessionToken: restored }));
        // Keep currentStep aligned to initial target (otp/mpin-*). Parent handles exact step selection on success.
        if (initialStep === 'otp') setCurrentStep('otp');
      } else {
        console.warn('[MobileAuthFlow] No sessionToken available. Falling back to login step to avoid redirect loop.');
        setCurrentStep('login');
      }
    }
  }, [initialStep, authData.sessionToken])

  const handleLoginSuccess = (data: AuthData) => {
    console.log('[MobileAuthFlow] Login success payload:', data);
    setAuthData(data)
    persistSessionToken(data.sessionToken)
    
    if (data.requiresOtp) {
      console.log('[MobileAuthFlow] Moving to step: otp');
      setCurrentStep('otp')
    } else if (data.requiresMpin) {
      console.log('[MobileAuthFlow] Moving to step: mpin-verify');
      setCurrentStep('mpin-verify')
    } else if (data.redirectTo) {
      // Handle direct redirects (like KYC)
      console.log('[MobileAuthFlow] Redirecting to:', data.redirectTo);
      router.push(data.redirectTo)
    }
  }

  const handleRegistrationSuccess = (data: AuthData) => {
    console.log('[MobileAuthFlow] Registration success payload:', data);
    setAuthData(data)
    persistSessionToken(data.sessionToken)
    
    if (data.requiresOtp) {
      console.log('[MobileAuthFlow] Moving to step: otp');
      setCurrentStep('otp')
    }
  }

  const handleOtpVerificationSuccess = (data: AuthData) => {
    console.log("🔄 OTP Verification Success:", data);
    setAuthData({ ...authData, ...data })
    
    if (data.userData?.canSetupMpin) {
      console.log("✅ Going to mPin setup mode");
      setCurrentStep('mpin-setup')
    } else if (data.requiresMpin) {
      console.log("✅ Going to mPin verify mode");
      setCurrentStep('mpin-verify')
    } else if (data.redirectTo) {
      console.log("✅ Redirecting to:", data.redirectTo);
      router.push(data.redirectTo)
    }
  }

  const handleMpinSuccess = (data: AuthData) => {
    if (data.redirectTo) {
      router.push(data.redirectTo)
    } else {
      router.push('/dashboard')
    }
  }

  const handleBack = () => {
    console.log('[MobileAuthFlow] Back pressed from step:', currentStep);
    switch (currentStep) {
      case 'otp':
        setCurrentStep(initialStep === 'register' ? 'register' : 'login')
        break
      case 'mpin-setup':
      case 'mpin-verify':
        setCurrentStep('otp')
        break
      default:
        setCurrentStep('login')
    }
  }

  const switchToRegister = () => {
    console.log('[MobileAuthFlow] Switching to register');
    setCurrentStep('register')
    setAuthData({})
  }

  const switchToLogin = () => {
    console.log('[MobileAuthFlow] Switching to login');
    setCurrentStep('login')
    setAuthData({})
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'login':
        return (
          <MobileLoginForm 
            onLoginSuccess={handleLoginSuccess}
          />
        )
      
      case 'register':
        return (
          <MobileRegistrationForm 
            onRegistrationSuccess={handleRegistrationSuccess}
          />
        )
      
      case 'otp':
        return (
          <OtpVerificationForm
            sessionToken={authData.sessionToken!}
            userData={authData.userData}
            onVerificationSuccess={handleOtpVerificationSuccess}
            onBack={handleBack}
          />
        )
      
      case 'mpin-setup':
        return (
          <MpinForm
            sessionToken={authData.sessionToken!}
            mode="setup"
            userData={authData.userData}
            onSuccess={handleMpinSuccess}
            onBack={handleBack}
          />
        )
      
      case 'mpin-verify':
        return (
          <MpinForm
            sessionToken={authData.sessionToken!}
            mode="verify"
            userData={authData.userData}
            onSuccess={handleMpinSuccess}
            onBack={handleBack}
          />
        )
      
      default:
        return (
          <MobileLoginForm 
            onLoginSuccess={handleLoginSuccess}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4 w-screen">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              ['login', 'register'].includes(currentStep) ? 'bg-primary' : 'bg-gray-300'
            }`} />
            <div className={`w-2 h-2 rounded-full ${
              currentStep === 'otp' ? 'bg-primary' : 'bg-gray-300'
            }`} />
            <div className={`w-2 h-2 rounded-full ${
              ['mpin-setup', 'mpin-verify'].includes(currentStep) ? 'bg-primary' : 'bg-gray-300'
            }`} />
          </div>
          <div className="text-center mt-2 text-sm text-gray-600">
            {currentStep === 'login' && 'Step 1: Login'}
            {currentStep === 'register' && 'Step 1: Registration'}
            {currentStep === 'otp' && 'Step 2: Mobile Verification'}
            {currentStep === 'mpin-setup' && 'Step 3: Set up mPin'}
            {currentStep === 'mpin-verify' && 'Step 3: Verify mPin'}
          </div>
        </div>

        {renderCurrentStep()}

        {/* Switch between login/register */}
        {['login', 'register'].includes(currentStep) && (
          <div className="text-center mt-6">
            {currentStep === 'login' ? (
              <p className="text-sm text-gray-600">
                New to VTrade?{" "}
                <button
                  onClick={switchToRegister}
                  className="text-primary hover:opacity-90 font-medium"
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={switchToLogin}
                  className="text-primary hover:opacity-90 font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MobileAuthFlow
