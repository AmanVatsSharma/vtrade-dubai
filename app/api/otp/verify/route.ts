// app/api/otp/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { OtpService } from "@/lib/otp-service";
import { otpVerificationSchema } from "@/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validationResult = otpVerificationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    const { otp, sessionToken } = validationResult.data;

    // Get session details to find user
    const { prisma } = await import("@/lib/prisma");
    
    const sessionAuth = await prisma.sessionAuth.findUnique({
      where: { sessionToken },
      include: { user: true }
    });

    if (!sessionAuth || sessionAuth.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 400 }
      );
    }

    const user = sessionAuth.user;

    // Find the most recent OTP
    const otpRecord = await prisma.otpToken.findFirst({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "No valid OTP found" },
        { status: 400 }
      );
    }

    const result = await OtpService.verifyOtp(
      user.id,
      user.phone!,
      otp,
      otpRecord.purpose as any
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        purpose: otpRecord.purpose,
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Verify OTP API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
