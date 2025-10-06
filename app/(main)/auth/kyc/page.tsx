// app/(main)/auth/kyc/page.tsx
// @ts-nocheck
'use client'
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface KYCData {
  aadhaarNumber: string;
  panNumber: string;
  bankProofUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export default function KYC() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  const [bankProof, setBankProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [existingKYC, setExistingKYC] = useState<KYCData | null>(null);
  const [isLoadingKYC, setIsLoadingKYC] = useState(true);

  // Check authentication status
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  // Add a timeout to handle cases where session loading takes too long
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (status === 'loading' && !session) {
        console.log('Session loading timeout - redirecting to login');
        router.push('/auth/login');
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [status, session, router]);

  // Fetch existing KYC data
  useEffect(() => {
    const fetchKYCData = async () => {
      if (!session?.user?.id) {
        setIsLoadingKYC(false);
        return;
      }

      setIsLoadingKYC(true);
      setError("");

      try {
        const response = await fetch('/api/kyc', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError("Please login first");
            router.push('/auth/login');
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.kyc) {
          setExistingKYC(data.kyc);
          setAadhaar(data.kyc.aadhaarNumber || "");
          setPan(data.kyc.panNumber || "");
        }
      } catch (err) {
        console.error('Error fetching KYC data:', err);
        setError("Failed to load KYC data. Please refresh the page.");
      } finally {
        setIsLoadingKYC(false);
      }
    };

    if (session?.user?.id) {
      fetchKYCData();
    } else {
      setIsLoadingKYC(false);
    }
  }, [session, router]);

  const uploadToBankProofUrl = async (file: File): Promise<string> => {
    // TODO: Implement actual file upload to your storage service
    // For now, we'll create a mock URL
    // You should replace this with actual Firebase/AWS S3/Cloudinary upload

    const formData = new FormData();
    formData.append('file', file);

    // Example implementation - replace with your actual upload service
    try {
      // const response = await fetch('/api/upload', {
      //   method: 'POST',
      //   body: formData
      // });
      // const { url } = await response.json();
      // return url;

      // Mock implementation for now
      return `https://mockurl.com/${file.name}`;
    } catch (error) {
      throw new Error('File upload failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.id) {
      setError("Session expired. Please login again.");
      setTimeout(() => router.push('/auth/login'), 2000);
      return;
    }

    // Validate required fields
    if (!aadhaar || !pan) {
      setError("All fields are required. Please fill in Aadhaar and PAN.");
      return;
    }

    // Validate Aadhaar number format
    if (!/^\d{12}$/.test(aadhaar)) {
      setError("Invalid Aadhaar number. Please enter exactly 12 digits.");
      return;
    }

    // Validate PAN number format
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      setError("Invalid PAN format. Use format: ABCDE1234F (5 letters, 4 numbers, 1 letter)");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      let bankProofUrl = "";

      if (bankProof) {
        try {
          bankProofUrl = await uploadToBankProofUrl(bankProof);
        } catch (uploadError) {
          setError("Failed to upload bank proof. Please try again or use a smaller file.");
          setLoading(false);
          return;
        }
      } else if (existingKYC?.bankProofUrl) {
        bankProofUrl = existingKYC.bankProofUrl;
      } else {
        setError("Bank proof document is required. Please upload a cancelled cheque or bank statement.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadhaarNumber: aadhaar,
          panNumber: pan,
          bankProofUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError("Session expired. Please login again.");
          setTimeout(() => router.push('/auth/login'), 2000);
          return;
        }
        throw new Error(data.error || 'Failed to submit KYC');
      }

      setSuccess("✅ KYC submitted successfully! Your documents are being reviewed by our team. You will be notified once approved.");
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => router.push("/dashboard"), 3000);

    } catch (err: any) {
      console.error("KYC submission error:", err);
      if (err.message.includes("network") || err.message.includes("fetch")) {
        setError("Network error. Please check your internet connection and try again.");
      } else {
        setError(err.message || "Failed to submit KYC. Please try again or contact support.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || isLoadingKYC) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading KYC information...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Will redirect via useEffect
  }

  // Show error state with retry option
  if (error && !isLoadingKYC && !existingKYC) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-slate-100 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Error Loading KYC</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg shadow-lg transition"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 rounded-lg transition"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
      <Button
        onClick={() => signOut({ callbackUrl: "/auth/login" })}
        className="fixed top-4 right-4 md:hidden bg-white/80 hover:bg-white/90 text-gray-700 shadow-lg rounded-full p-2 backdrop-blur-md"
        size="icon"
        variant="ghost"
      >
        <LogOut className="h-5 w-5" />
      </Button>
      <div className="w-full max-w-xl bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-slate-100">
        <h2 className="text-3xl font-semibold text-gray-900 text-center mb-6">
          KYC Verification
        </h2>
        <p className="text-gray-500 text-center mb-8">
          Please provide your details to complete verification.
        </p>

        {existingKYC && (
          <div className={`mb-6 p-4 rounded-lg ${existingKYC.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700' :
              existingKYC.status === 'APPROVED' ? 'bg-green-50 text-green-700' :
                'bg-red-50 text-red-700'
            }`}>
            <p className="font-medium">
              Current Status: {existingKYC.status}
            </p>
            {existingKYC.status === 'PENDING' && (
              <p className="text-sm mt-1">Your KYC is under review.</p>
            )}
            {existingKYC.status === 'APPROVED' && (
              <>
                <p className="text-sm mt-1">Your KYC has been approved!</p>
                <Button variant="outline" className="mt-2" onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
              </>
            )}
            {existingKYC.status === 'REJECTED' && (
              <p className="text-sm mt-1">Please resubmit your KYC with correct details.</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Aadhaar Number
            </label>
            <input
              type="text"
              value={aadhaar}
              onChange={e => setAadhaar(e.target.value)}
              required
              placeholder="Enter Aadhaar Number"
              pattern="[0-9]{12}"
              maxLength={12}
              className="w-full border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 rounded-lg px-4 py-2 transition shadow-sm"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              PAN Number
            </label>
            <input
              type="text"
              value={pan}
              onChange={e => setPan(e.target.value.toUpperCase())}
              required
              placeholder="Enter PAN Number"
              pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
              maxLength={10}
              className="w-full border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 rounded-lg px-4 py-2 transition shadow-sm"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Bank Cancelled Cheque Photo
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={e => setBankProof(e.target.files?.[0] || null)}
              required={!existingKYC?.bankProofUrl}
              className="w-full border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 rounded-lg px-4 py-2 transition file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 shadow-sm"
            />
            {existingKYC?.bankProofUrl && (
              <p className="text-sm text-gray-500 mt-1">
                Current file uploaded. Choose a new file to replace it.
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-green-50 text-green-600 text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-medium py-3 rounded-lg shadow-lg transition"
          >
            {loading ? "Submitting..." : existingKYC ? "Update KYC" : "Submit KYC"}
          </button>
        </form>
      </div>
    </div>
  );
}