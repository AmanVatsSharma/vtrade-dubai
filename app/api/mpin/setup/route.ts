// app/api/mpin/setup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MpinService } from "@/lib/mpin-service";
import { mpinSetupSchema } from "@/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validationResult = mpinSetupSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid mPin format" },
        { status: 400 }
      );
    }

    const { mpin, sessionToken } = body;

    // Get session details
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

    const result = await MpinService.setupMpin(sessionAuth.userId, mpin);

    if (result.success) {
      // Update session to mark mPin as verified
      await prisma.sessionAuth.update({
        where: { id: sessionAuth.id },
        data: { isMpinVerified: true }
      });

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
    console.error("Setup mPin API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
