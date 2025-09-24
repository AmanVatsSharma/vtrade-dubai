// components/auth/MpinForm.tsx
"use client"
import React, { useState, useTransition } from 'react'
import CardWrapper from './CardWrapper'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { mpinSetupSchema, mpinVerificationSchema } from '@/schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import FormError from '../form-error'
import FormSucess from '../form-sucess'
import { setupMpin, verifyMpin, requestMpinResetOtp } from '@/actions/mobile-auth.actions'
import { FaKey, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa'
import { signIn } from 'next-auth/react'

interface MpinFormProps {
  sessionToken: string;
  mode: 'setup' | 'verify';
  userData?: any;
  onSuccess: (data: any) => void;
  onBack: () => void;
}

const MpinForm: React.FC<MpinFormProps> = ({ 
  sessionToken, 
  mode, 
  userData, 
  onSuccess,
  onBack 
}) => {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | undefined>("")
  const [success, setSuccess] = useState<string | undefined>("")
  const [showMpin, setShowMpin] = useState(false)
  const [showConfirmMpin, setShowConfirmMpin] = useState(false)

  const isSetupMode = mode === 'setup'
  
  const setupForm = useForm<z.infer<typeof mpinSetupSchema>>({
    resolver: zodResolver(mpinSetupSchema),
    defaultValues: {
      mpin: "",
      confirmMpin: "",
    }
  })

  const verifyForm = useForm<z.infer<typeof mpinVerificationSchema>>({
    resolver: zodResolver(mpinVerificationSchema),
    defaultValues: {
      mpin: "",
      sessionToken,
    }
  })

  const onSetupSubmit = (values: z.infer<typeof mpinSetupSchema>) => {
    setError("")
    setSuccess("")

    startTransition(() => {
      setupMpin(values, sessionToken)
        .then(async (data) => {
          if (data.error) {
            setError(data.error)
          }
          if (data.success) {
            setSuccess(data.success)
            
            // If we have session data, create NextAuth session
            if (data.sessionData) {
              try {
                await signIn('credentials', {
                  sessionToken: data.sessionData.sessionToken,
                  redirect: false
                });
              } catch (error) {
                console.error('Failed to create session:', error);
              }
            }
            
            onSuccess(data)
          }
        })
        .catch((error) => {
          console.error("mPin error:", error)
          setError("Something went wrong! Please try again.")
        })
    })
  }

  const onVerifySubmit = (values: z.infer<typeof mpinVerificationSchema>) => {
    setError("")
    setSuccess("")

    startTransition(() => {
      verifyMpin(values)
        .then(async (data) => {
          if (data.error) {
            setError(data.error)
          }
          if (data.success) {
            setSuccess(data.success)
            
            // If we have session data, create NextAuth session
            if (data.sessionData) {
              try {
                await signIn('credentials', {
                  sessionToken: data.sessionData.sessionToken,
                  redirect: false
                });
              } catch (error) {
                console.error('Failed to create session:', error);
              }
            }
            
            onSuccess(data)
          }
        })
        .catch((error) => {
          console.error("mPin error:", error)
          setError("Something went wrong! Please try again.")
        })
    })
  }

  const currentForm = isSetupMode ? setupForm : verifyForm
  const onSubmit = isSetupMode ? onSetupSubmit : onVerifySubmit

  return (
    <CardWrapper
      headerLabel={isSetupMode ? 'Set up mPin' : 'Enter mPin'}
      backButtonLabel="Back"
      backButtonHref="#"
      backButtonAction={onBack}
      showSocial={false}
    >
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <FaKey className="text-emerald-600 text-2xl" />
        </div>
        <p className="text-gray-600 text-sm">
          {isSetupMode 
            ? "Create a secure 4-6 digit mPin for trading authentication"
            : "Enter your mPin to complete login and access trading features"
          }
        </p>
      </div>

      <Form {...currentForm}>
        <form onSubmit={currentForm.handleSubmit(onSubmit)} className='space-y-6'>
          <FormField
            control={currentForm.control}
            name='mpin'
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">
                  {isSetupMode ? "Create mPin (4-6 digits)" : "Enter mPin"}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      {...field}
                      disabled={isPending}
                      placeholder={isSetupMode ? "Create mPin" : "Enter mPin"}
                      type={showMpin ? 'text' : 'password'}
                      maxLength={6}
                      className="pl-10 pr-10 text-center font-mono tracking-wider border-slate-300 focus:border-emerald-600 focus:ring focus:ring-emerald-200 focus:ring-opacity-50 rounded-md shadow-sm"
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                        field.onChange(value)
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowMpin(!showMpin)}
                    >
                      {showMpin ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isSetupMode && (
            <FormField
              control={setupForm.control}
              name='confirmMpin'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">
                    Confirm mPin
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        {...field}
                        disabled={isPending}
                        placeholder="Confirm mPin"
                        type={showConfirmMpin ? 'text' : 'password'}
                        maxLength={6}
                        className="pl-10 pr-10 text-center font-mono tracking-wider border-slate-300 focus:border-emerald-600 focus:ring focus:ring-emerald-200 focus:ring-opacity-50 rounded-md shadow-sm"
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                          field.onChange(value)
                        }}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowConfirmMpin(!showConfirmMpin)}
                      >
                        {showConfirmMpin ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormError message={error} />
          <FormSucess message={success} />

          <Button
            disabled={isPending || (isSetupMode ? 
              setupForm.watch('mpin').length < 4 || setupForm.watch('confirmMpin').length < 4 :
              verifyForm.watch('mpin').length < 4
            )}
            type='submit'
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg"
          >
            {isPending ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isSetupMode ? "Setting up..." : "Verifying..."}
              </div>
            ) : (
              isSetupMode ? "Set up mPin" : "Verify mPin"
            )}
          </Button>

          <div className="text-center text-xs text-gray-500 mt-4">
            {isSetupMode ? (
              <>
                <p>🔒 mPin is required for secure trading</p>
                <p className="mt-1">💡 Use a unique combination that you can remember</p>
              </>
            ) : (
              <>
                <p>🔒 mPin protects your trading account</p>
              <p className="mt-1">❓ <button
                type="button"
                className="text-emerald-600 hover:underline"
                onClick={() => {
                  console.log('[MpinForm] Forgot mPin clicked. Requesting OTP...')
                  setError("")
                  setSuccess("")
                  const token = sessionToken
                  if (!token) {
                    setError('Missing session token. Please login again.')
                    return
                  }
                  requestMpinResetOtp(token)
                    .then((res) => {
                      if (res.error) {
                        setError(res.error)
                        return
                      }
                      setSuccess(res.success)
                      // Ask parent to go to OTP step by simulating success payload
                      onBack(); // go back to OTP step in parent flow
                    })
                    .catch((e) => {
                      console.error('Failed to request mPin reset OTP:', e)
                      setError('Failed to request OTP. Please try again.')
                    })
                }}>Forgot mPin?</button></p>
              </>
            )}
          </div>
        </form>
      </Form>
    </CardWrapper>
  )
}

export default MpinForm
