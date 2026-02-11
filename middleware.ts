// middleware.ts
import { authEdge } from "@/auth-edge"
import { NextResponse } from "next/server"
import { isMaintenanceModeActive, canBypassMaintenance } from "@/lib/maintenance"

/**
 * An array of routes that are accessible to the public.
 * These routes do not require authentication.
 * @type {string[]}
 */
const publicRoutes = [
  "/",
  "/downloads",
  "/blog",
  "/news-blogs",
  "/contact",
  "/why-vtrade",
  "/affiliate",
  "/privacy-policy",
  "/terms",
  "/products",
  "/products/*",
  "/payment-method",
  "/payment-method/*",
  "/auth/error",
  "/api/graphql",
  "/api/quotes",
  "/api/quotes/docs",
  "/api/otp",
  "/api/mpin",
  "/api/health",
  "/api/ready",
  "/api/metrics",
  "/api/auth/*",
  // Milli-search proxy (public; used by frontend, no auth required)
  "/api/milli-search",
  "/api/milli-search/*",
  // Allow console API to handle auth itself (returns 401 JSON)
  // Prevent middleware redirect which breaks client fetch with HTML responses
  "/api/console",
  // Public admin auth entry and OAuth callback for Vortex
  "/admin/auth/login",
  "/admin/api/callback",
  // Static CSV for instruments master (served from /public)
  "/marketInstrumentsData.csv"
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
 * Password reset routes that should be accessible to EVERYONE (logged in or not)
 * These routes allow users to reset their password regardless of their login state
 */
const passwordResetRoutes = [
  "/auth/forgot-password",
  "/auth/password-reset"
];

/**
 * Admin routes that require admin or moderator role
 */
const adminRoutes = [
  "/admin",
  "/admin-console"  // ✅ Added admin-console route protection
];

/**
 * Detect requests for static assets (public/ files) that must NOT be redirected.
 * This is critical on Vercel because middleware redirects (307) break CSS/images.
 */
function isStaticAssetRequest(pathname: string): boolean {
  // Next internals or common static endpoints
  if (pathname.startsWith("/_next/")) return true
  if (pathname === "/favicon.ico") return true

  // Public asset folders we serve directly
  if (pathname.startsWith("/vtrade/")) return true

  // Any path with a file extension (e.g. .png, .jpg, .css, .js, .woff2)
  return /\.[a-zA-Z0-9]+$/.test(pathname)
}

export default authEdge((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  
  // 0. STATIC ASSET BYPASS (must happen before any auth redirects)
  if (isStaticAssetRequest(nextUrl.pathname)) {
    return NextResponse.next()
  }

  // Console logging for debugging
  console.log(`[MIDDLEWARE] 🔍 Request to: ${nextUrl.pathname}, Logged in: ${isLoggedIn}`);
  
  // 0. MAINTENANCE MODE CHECK - Highest priority
  // Check if maintenance mode is active (configured via MAINTENANCE_MODE environment variable)
  if (isMaintenanceModeActive()) {
    console.log(`[MIDDLEWARE] 🔧 Maintenance mode is active (from environment configuration)`);
    
    // Allow maintenance page and API endpoints
    if (nextUrl.pathname === '/maintenance' || nextUrl.pathname.startsWith('/api/maintenance/')) {
      console.log(`[MIDDLEWARE] ✅ Maintenance route - allowing`);
      return NextResponse.next();
    }
    
    // Get user role for bypass check
    const user = (req.auth as any)?.user;
    const userRole = user?.role as string | undefined;
    
    // Check if user can bypass maintenance mode (ADMIN or SUPER_ADMIN)
    if (canBypassMaintenance(userRole)) {
      console.log(`[MIDDLEWARE] ✅ Admin bypass granted for role: ${userRole}`);
      // Continue with normal middleware flow
    } else {
      console.log(`[MIDDLEWARE] 🔒 Maintenance mode - redirecting to maintenance page (user role: ${userRole || 'none'})`);
      return NextResponse.redirect(new URL('/maintenance', nextUrl));
    }
  }
  
  // CORS preflight handling: never redirect OPTIONS
  if (req.method === 'OPTIONS') {
    console.log(`[MIDDLEWARE] ✅ OPTIONS request - allowing CORS preflight`);
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

  // Route classification flags
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicRoute = publicRoutes.some(route =>
    nextUrl.pathname === route || (route.endsWith('/*') && nextUrl.pathname.startsWith(route.slice(0, -1)))
  );
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);
  const isPhoneVerificationRoute = phoneVerificationRoutes.includes(nextUrl.pathname);
  const isMpinRoute = mpinRoutes.includes(nextUrl.pathname);
  const isPasswordResetRoute = passwordResetRoutes.includes(nextUrl.pathname);
  // Check if route is an admin route - includes /admin, /admin/*, and /admin-console
  const isAdminRoute = 
    nextUrl.pathname === "/admin" || 
    nextUrl.pathname.startsWith("/admin/") ||
    nextUrl.pathname === "/admin-console" ||
    nextUrl.pathname.startsWith("/admin-console/");

  // Debug logging for route classification
  console.log(`[MIDDLEWARE] 📊 Route flags:`, {
    isApiAuthRoute,
    isPublicRoute,
    isAuthRoute,
    isPasswordResetRoute,
    isPhoneVerificationRoute,
    isMpinRoute,
    isAdminRoute
  });

  // 1. Allow NextAuth specific API routes to always pass through
  if (isApiAuthRoute) {
    console.log(`[MIDDLEWARE] ✅ API auth route - allowing`);
    return NextResponse.next();
  }

  // 2. Allow public routes
  if (isPublicRoute) {
    console.log(`[MIDDLEWARE] ✅ Public route - allowing`);
    return NextResponse.next();
  }

  // 2.25. CRITICAL: Allow password reset routes for EVERYONE (logged in or not)
  // This is essential for password recovery functionality
  if (isPasswordResetRoute) {
    console.log(`[MIDDLEWARE] 🔓 Password reset route - allowing access for all users (logged in: ${isLoggedIn})`);
    return NextResponse.next();
  }

  // 2.5. Admin route access control
  if (isAdminRoute) {
    console.log(`[MIDDLEWARE] 🛡️ Admin route detected`);
    if (!isLoggedIn) {
      console.log(`[MIDDLEWARE] ❌ Not logged in - redirecting to login`);
      return NextResponse.redirect(new URL('/auth/login', nextUrl));
    }
    
    if (userRole !== 'ADMIN' && userRole !== 'MODERATOR' && userRole !== 'SUPER_ADMIN') {
      console.log(`[MIDDLEWARE] ❌ Insufficient permissions (role: ${userRole}) - redirecting to dashboard`);
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    
    console.log(`[MIDDLEWARE] ✅ Admin access granted`);
    return NextResponse.next();
  }

  // 2.6 Super Admin API access control for /api/super-admin/**
  if (nextUrl.pathname.startsWith('/api/super-admin')) {
    console.log(`[MIDDLEWARE] 🛡️ Super Admin API route detected`)
    if (!isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (userRole !== 'SUPER_ADMIN') {
      console.log(`[MIDDLEWARE] ❌ Super Admin required (role: ${userRole})`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.log(`[MIDDLEWARE] ✅ Super Admin access granted`)
    return NextResponse.next()
  }

  // 3. If the user is fully authenticated and tries to access auth routes,
  //    redirect them to appropriate page based on their status
  //    EXCEPTION: Password reset routes are handled above and always allowed
  if (isLoggedIn && isAuthRoute && !isPhoneVerificationRoute && !isMpinRoute && !isPasswordResetRoute && nextUrl.pathname !== "/auth/kyc") {
    console.log(`[MIDDLEWARE] 🔄 Logged-in user accessing auth route - checking completion status`);
    
    // Check user completion status and redirect accordingly
    if (!phoneVerified) {
      console.log(`[MIDDLEWARE] ⚠️ Phone not verified - redirecting to phone verification`);
      return NextResponse.redirect(new URL("/auth/phone-verification", nextUrl));
    }
    
    if (!hasMpin) {
      console.log(`[MIDDLEWARE] ⚠️ mPin not set - redirecting to mPin setup`);
      return NextResponse.redirect(new URL("/auth/mpin-setup", nextUrl));
    }
    
    if (kycStatus !== "APPROVED") {
      console.log(`[MIDDLEWARE] ⚠️ KYC not approved (status: ${kycStatus}) - redirecting to KYC`);
      return NextResponse.redirect(new URL("/auth/kyc", nextUrl));
    }
    
    console.log(`[MIDDLEWARE] ✅ User fully verified - redirecting to dashboard`);
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // 4. If the user is NOT logged in and is trying to access a protected route,
  //    redirect them to the login page.
  if (!isLoggedIn && !isPublicRoute && !isAuthRoute) {
    console.log(`[MIDDLEWARE] 🔒 Protected route access without login - redirecting to login`);
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }

  // 5. Enhanced gating for logged-in users (ensure proper verification flow)
  if (isLoggedIn && !isAuthRoute && !isPublicRoute && !isPasswordResetRoute) {
    console.log(`[MIDDLEWARE] 🔐 Logged-in user on protected route - checking verification status`);
    
    // Phone verification gating
    if (!phoneVerified && !isPhoneVerificationRoute) {
      console.log(`[MIDDLEWARE] ⚠️ Phone verification required - redirecting`);
      return NextResponse.redirect(new URL("/auth/phone-verification", nextUrl));
    }
    
    // mPin setup gating
    if (phoneVerified && !hasMpin && !isMpinRoute) {
      console.log(`[MIDDLEWARE] ⚠️ mPin setup required - redirecting`);
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
      console.log(`[MIDDLEWARE] ⚠️ KYC verification required (status: ${kycStatus}) - redirecting`);
      return NextResponse.redirect(new URL("/auth/kyc", nextUrl));
    }
    
    console.log(`[MIDDLEWARE] ✅ User verification checks passed`);
  }

  // 6. Special handling for trading routes - require full verification
  if (
    isLoggedIn && 
    nextUrl.pathname.startsWith("/trading") &&
    (!phoneVerified || !hasMpin || kycStatus !== "APPROVED")
  ) {
    console.log(`[MIDDLEWARE] 📊 Trading route - enforcing full verification`);
    if (!phoneVerified) {
      console.log(`[MIDDLEWARE] ❌ Trading blocked - phone not verified`);
      return NextResponse.redirect(new URL("/auth/phone-verification", nextUrl));
    }
    if (!hasMpin) {
      console.log(`[MIDDLEWARE] ❌ Trading blocked - mPin not set`);
      return NextResponse.redirect(new URL("/auth/mpin-setup", nextUrl));
    }
    if (kycStatus !== "APPROVED") {
      console.log(`[MIDDLEWARE] ❌ Trading blocked - KYC not approved`);
      return NextResponse.redirect(new URL("/auth/kyc", nextUrl));
    }
  }

  // If none of the above conditions match, allow the request to proceed
  console.log(`[MIDDLEWARE] ✅ Request allowed - proceeding to ${nextUrl.pathname}`);
  return NextResponse.next();
});

// This config specifies which routes the middleware should be invoked on.
export const config = {
  // Exclude next internals + any file with an extension (public assets, css/js/fonts/images, etc.)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|vercel.svg|next.svg|.*\\..*).*)"],
};