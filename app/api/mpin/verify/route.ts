// app/api/mpin/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MpinService } from "@/lib/mpin-service";
import { mpinVerificationSchema } from "@/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validationResult = mpinVerificationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid mPin format" },
        { status: 400 }
      );
    }

    const { mpin, sessionToken } = validationResult.data;

    const result = await MpinService.verifyMpinForSession(sessionToken, mpin);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Verify mPin API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
