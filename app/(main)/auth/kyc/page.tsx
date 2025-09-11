// app/(main)/auth/kyc/page.tsx
// @ts-nocheck
'use client'
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

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

  // Check authentication status
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  // Fetch existing KYC data
  useEffect(() => {
    const fetchKYCData = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/kyc');
        const data = await response.json();

        if (data.kyc) {
          setExistingKYC(data.kyc);
          setAadhaar(data.kyc.aadhaarNumber || "");
          setPan(data.kyc.panNumber || "");
        }
      } catch (err) {
        console.error('Error fetching KYC data:', err);
      }
    };

    if (session?.user?.id) {
      fetchKYCData();
    }
  }, [session]);

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
      setError("Please login first");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      let bankProofUrl = "";

      if (bankProof) {
        bankProofUrl = await uploadToBankProofUrl(bankProof);
      } else if (existingKYC?.bankProofUrl) {
        bankProofUrl = existingKYC.bankProofUrl;
      } else {
        setError("Bank proof document is required");
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
        throw new Error(data.error || 'Failed to submit KYC');
      }

      setSuccess("✅ KYC submitted successfully! Await admin approval.");
      setTimeout(() => router.push("/dashboard"), 2000);

    } catch (err: any) {
      setError(err.message || "❌ Failed to submit KYC. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
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