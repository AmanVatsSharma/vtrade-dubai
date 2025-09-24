import { NextResponse } from "next/server";

export async function GET() {
  try {
    const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
    const hasAwsAccessKey = !!process.env.AWS_ACCESS_KEY_ID;
    const hasAwsSecret = !!process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.AWS_REGION || "ap-south-1";

    return NextResponse.json({
      ok: true,
      services: {
        nextAuth: {
          configured: hasNextAuthSecret,
        },
        aws: {
          configured: hasAwsAccessKey && hasAwsSecret,
          region: awsRegion,
        },
      },
      env: {
        nodeEnv: process.env.NODE_ENV,
        runtime: process.env.VERCEL ? "vercel" : "local",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "unknown",
      },
      { status: 500 }
    );
  }
}
