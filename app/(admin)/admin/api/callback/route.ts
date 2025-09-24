// app/(admin)/admin/api/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { vortexAPI } from "@/lib/vortex/vortex-enhanced";
import { logger, LogCategory } from "@/lib/vortex/vortexLogger";

export async function GET(req: NextRequest) {
    const startTime = Date.now();
    const { searchParams } = new URL(req.url);
    
    try {
        // 1. Get the temporary auth token from Rupeezy's redirect
        const authToken = searchParams.get("auth");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        logger.info(LogCategory.VORTEX_AUTH, 'Callback received', {
            hasAuthToken: !!authToken,
            hasError: !!error,
            error,
            errorDescription,
            userAgent: req.headers.get('user-agent'),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
        });

        // Handle OAuth errors
        if (error) {
            logger.error(LogCategory.VORTEX_AUTH, 'OAuth error received', undefined, {
                error,
                errorDescription
            });
            
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/auth/login?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`
            );
        }

        if (!authToken) {
            logger.error(LogCategory.VORTEX_AUTH, 'Missing auth token in callback');
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/auth/login?error=missing_token&description=No authentication token received`
            );
        }

        // 2. Exchange the auth token for an access token
        logger.info(LogCategory.VORTEX_AUTH, 'Starting token exchange', {
            authTokenLength: authToken.length,
            authTokenPrefix: authToken.substring(0, 10)
        });

        const session = await vortexAPI.exchangeToken(authToken, 1); // Admin user ID = 1

        logger.info(LogCategory.VORTEX_AUTH, 'Token exchange successful', {
            sessionId: session.id,
            userId: session.userId,
            processingTime: Date.now() - startTime
        });

        // 3. Redirect user to the dashboard
        const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/dashboard?success=true&session=${session.id}`;
        
        logger.info(LogCategory.VORTEX_AUTH, 'Redirecting to dashboard', {
            redirectUrl,
            sessionId: session.id
        });

        return NextResponse.redirect(redirectUrl);

    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        logger.error(LogCategory.VORTEX_AUTH, 'Callback processing failed', error as Error, {
            processingTime,
            authToken: searchParams.get("auth")?.substring(0, 10) + '...',
            error: searchParams.get("error"),
            errorDescription: searchParams.get("error_description")
        });

        // Redirect to login with error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const encodedError = encodeURIComponent(errorMessage);
        
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/auth/login?error=callback_failed&description=${encodedError}`
        );
    }
}
