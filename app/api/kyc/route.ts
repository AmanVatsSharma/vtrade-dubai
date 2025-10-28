// app/api/kyc/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// Force this route to be dynamic; it uses auth() which depends on cookies/headers
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get the current session
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Your session has expired. Please login again.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { aadhaarNumber, panNumber, bankProofUrl } = body;

    // Validate required fields
    if (!aadhaarNumber || !panNumber || !bankProofUrl) {
      return NextResponse.json(
        { error: 'All fields (Aadhaar, PAN, and Bank Proof) are required' },
        { status: 400 }
      );
    }

    // Validate Aadhaar format
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return NextResponse.json(
        { error: 'Invalid Aadhaar number format. Must be 12 digits.' },
        { status: 400 }
      );
    }

    // Validate PAN format
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
      return NextResponse.json(
        { error: 'Invalid PAN format. Must be in format: ABCDE1234F' },
        { status: 400 }
      );
    }

    // Check if KYC already exists for this user
    const existingKYC = await prisma.kYC.findUnique({
      where: { userId: session.user.id }
    });

    if (existingKYC) {
      // Update existing KYC
      const updatedKYC = await prisma.kYC.update({
        where: { userId: session.user.id },
        data: {
          aadhaarNumber,
          panNumber,
          bankProofUrl,
          status: 'PENDING', // Reset to pending on resubmission
          submittedAt: new Date(),
          approvedAt: null
        }
      });

      return NextResponse.json({
        success: 'KYC updated successfully. Your documents are being reviewed.',
        kyc: updatedKYC
      });
    } else {
      // Create new KYC record
      const newKYC = await prisma.kYC.create({
        data: {
          userId: session.user.id,
          aadhaarNumber,
          panNumber,
          bankProofUrl,
          status: 'PENDING'
        }
      });

      return NextResponse.json({
        success: 'KYC submitted successfully. Your documents are being reviewed.',
        kyc: newKYC
      });
    }

  } catch (error) {
    console.error('KYC submission error:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to process KYC: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to process KYC submission. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('KYC API: GET request received');
    const session = await auth();
    console.log('KYC API: Session check', { hasSession: !!session, userId: session?.user?.id });
    
    if (!session?.user?.id) {
      console.log('KYC API: No session or user ID');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('KYC API: Fetching KYC for user:', session.user.id);
    const kyc = await prisma.kYC.findUnique({
      where: { userId: session.user.id }
    });

    console.log('KYC API: KYC data found:', !!kyc);
    return NextResponse.json({ kyc });

  } catch (error) {
    console.error('KYC fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}