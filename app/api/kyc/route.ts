// app/api/kyc/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get the current session
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { aadhaarNumber, panNumber, bankProofUrl } = body;

    // Validate required fields
    if (!aadhaarNumber || !panNumber || !bankProofUrl) {
      return NextResponse.json(
        { error: 'All fields are required' },
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
        success: 'KYC updated successfully',
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
        success: 'KYC submitted successfully',
        kyc: newKYC
      });
    }

  } catch (error) {
    console.error('KYC submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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