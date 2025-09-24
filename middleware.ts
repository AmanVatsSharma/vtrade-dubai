// middleware.ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

/**
 * An array of routes that are accessible to the public.
 * These routes do not require authentication.
 * @type {string[]}
 */
const publicRoutes = [
  // "/",
  "/auth/error",
  "/api/graphql",
  "/api/quotes",
  "/api/otp",
  "/api/mpin",
  "/api/health",
  "/api/auth/*"
];

/**
 * An array of routes that are used for authentication.
 * Logged-in users will be redirected from these routes to a protected page (e.g., dashboard).
 * @type {string[]}
 */
const authRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/password-reset",
  "/auth/email-verification",
  "/auth/otp-verification",
  "/auth/mpin-setup",
  "/auth/mpin-verify",
  "/auth/phone-verification",
  "/auth/kyc"
];

/**
 * Routes that require phone verification but not necessarily full authentication
 */
const phoneVerificationRoutes = [
  "/auth/phone-verification"
];

/**
 * Routes that require mPin setup/verification
 */
const mpinRoutes = [
  "/auth/mpin-setup",
  "/auth/mpin-verify"
];

/**
 * Admin routes that require admin or moderator role
 */
const adminRoutes = [
  "/admin"
];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  
  // CORS preflight handling: never redirect OPTIONS
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin') || '*';
    const allowHeaders = req.headers.get('access-control-request-headers') || 'Content-Type, Authorization, Accept, X-Requested-With';
    const res = new NextResponse(null, { status: 204 });
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', allowHeaders);
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Access-Control-Max-Age', '86400');
    return res;
  }
  
  // Enhanced user data from session
  const user = (req.auth as any)?.user;
  const kycStatus = user?.kycStatus as string | undefined;
  const phoneVerified = user?.phoneVerified as boolean | undefined;
  const hasMpin = user?.hasMpin as boolean | undefined;
  const userRole = user?.role as string | undefined;

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicRoute = publicRoutes.some(route =>
    nextUrl.pathname === route || (route.endsWith('/*') && nextUrl.pathname.startsWith(route.slice(0, -1)))
  );
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);
  const isPhoneVerificationRoute = phoneVerificationRoutes.includes(nextUrl.pathname);
  const isMpinRoute = mpinRoutes.includes(nextUrl.pathname);
  const isAdminRoute = adminRoutes.some(route => nextUrl.pathname.startsWith(route));

  // 1. Allow NextAuth specific API routes to always pass through
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // 2. Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 2.5. Admin route access control
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/auth/login', nextUrl));
    }
    
    if (userRole !== 'ADMIN' && userRole !== 'MODERATOR') {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    
    return NextResponse.next();
  }

  // 3. If the user is fully authenticated and tries to access auth routes,
  //    redirect them to appropriate page based on their status
  if (isLoggedIn && isAuthRoute && !isPhoneVerificationRoute && !isMpinRoute && nextUrl.pathname !== "/auth/kyc") {
    // Check user completion status and redirect accordingly
    if (!phoneVerified) {
      return NextResponse.redirect(new URL("/auth/phone-verification", nextUrl));
    }
    
    if (!hasMpin) {
      return NextResponse.redirect(new URL("/auth/mpin-setup", nextUrl));
    }
    
    if (kycStatus !== "APPROVED") {
      return NextResponse.redirect(new URL("/auth/kyc", nextUrl));
    }
    
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // 4. If the user is NOT logged in and is trying to access a protected route,
  //    redirect them to the login page.
  if (!isLoggedIn && !isPublicRoute && !isAuthRoute) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }

  // 5. Enhanced gating for logged-in users
  if (isLoggedIn && !isAuthRoute && !isPublicRoute) {
    
    // Phone verification gating
    if (!phoneVerified && !isPhoneVerificationRoute) {
      return NextResponse.redirect(new URL("/auth/phone-verification", nextUrl));
    }
    
    // mPin setup gating
    if (phoneVerified && !hasMpin && !isMpinRoute) {
      return NextResponse.redirect(new URL("/auth/mpin-setup", nextUrl));
    }
    
    // KYC gating - only after phone and mPin are complete
    if (
      phoneVerified && 
      hasMpin && 
      nextUrl.pathname !== "/auth/kyc" &&
      !nextUrl.pathname.startsWith("/api/") &&
      kycStatus !== "APPROVED"
    ) {
      return NextResponse.redirect(new URL("/auth/kyc", nextUrl));
    }
  }

  // 6. Special handling for trading routes - require full verification
  if (
    isLoggedIn && 
    nextUrl.pathname.startsWith("/trading") &&
    (!phoneVerified || !hasMpin || kycStatus !== "APPROVED")
  ) {
    if (!phoneVerified) {
      return NextResponse.redirect(new URL("/auth/phone-verification", nextUrl));
    }
    if (!hasMpin) {
      return NextResponse.redirect(new URL("/auth/mpin-setup", nextUrl));
    }
    if (kycStatus !== "APPROVED") {
      return NextResponse.redirect(new URL("/auth/kyc", nextUrl));
    }
  }

  // If none of the above conditions match, allow the request to proceed
  return NextResponse.next();
});

// This config specifies which routes the middleware should be invoked on.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|vercel.svg|next.svg).*)"],
};