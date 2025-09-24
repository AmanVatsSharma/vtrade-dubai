// app/api/admin/kyc/route.ts
import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic; it uses auth() which depends on cookies/headers
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch all KYC applications with user details
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin or moderator role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json(
        { error: 'Access denied. Admin or Moderator role required.' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    // Build user search condition
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { clientId: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    // Get KYC applications with user details
    const [kycApplications, totalCount] = await Promise.all([
      prisma.kYC.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              clientId: true,
              createdAt: true,
              role: true
            }
          }
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.kYC.count({ where })
    ]);

    // Get status counts
    const statusCounts = await prisma.kYC.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    return NextResponse.json({
      kycApplications,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>)
    });

  } catch (error) {
    console.error('Admin KYC fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update KYC status (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin or moderator role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true }
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json(
        { error: 'Access denied. Admin or Moderator role required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { kycId, status, reason } = body;

    if (!kycId || !status) {
      return NextResponse.json(
        { error: 'KYC ID and status are required' },
        { status: 400 }
      );
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be APPROVED or REJECTED' },
        { status: 400 }
      );
    }

    // Update KYC status
    const updatedKYC = await prisma.kYC.update({
      where: { id: kycId },
      data: {
        status,
        approvedAt: status === 'APPROVED' ? new Date() : null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            clientId: true
          }
        }
      }
    });

    // Log the action
    await prisma.tradingLog.create({
      data: {
        clientId: updatedKYC.user.clientId || 'UNKNOWN',
        userId: session.user.id,
        action: `KYC_${status.toLowerCase()}`,
        message: `KYC ${status.toLowerCase()} for ${updatedKYC.user.name} (${updatedKYC.user.email})`,
        details: {
          kycId: kycId,
          reason: reason || '',
          approvedAt: status === 'APPROVED' ? new Date() : null
        },
        category: 'SYSTEM',
        level: 'INFO'
      }
    });

    return NextResponse.json({
      success: `KYC ${status.toLowerCase()} successfully`,
      kyc: updatedKYC
    });

  } catch (error) {
    console.error('Admin KYC update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
