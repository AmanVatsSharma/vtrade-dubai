// app/api/otp/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { OtpService } from "@/lib/otp-service";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { purpose = "LOGIN_VERIFICATION" } = body;

    const user = session.user as any;
    const phone = user.phone;

    if (!phone) {
      return NextResponse.json(
        { error: "No phone number registered" },
        { status: 400 }
      );
    }

    const result = await OtpService.generateAndSendOtp(
      user.id,
      phone,
      purpose
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        expiresAt: result.data?.expiresAt,
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Send OTP API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
