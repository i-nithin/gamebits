import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isGameWriteRoute = createRouteMatcher([
  "/games/new",
  "/games/(.*)/edit",
  "/games/(.*)/launch",
]);

export default process.env.CLERK_SECRET_KEY
  ? clerkMiddleware(async (auth, req) => {
      if (isGameWriteRoute(req)) {
        await auth.protect();
      }
    })
  : function proxy() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
