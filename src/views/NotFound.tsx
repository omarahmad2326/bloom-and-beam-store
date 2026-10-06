'use client';

import { Link } from "@/lib/router";
import { RedirectOrFallback } from "@/components/RedirectOrFallback";

/** 404 message. The robots "noindex" tag and HTTP 404 status come from the server. */
export const NotFoundContent = () => (
  <div className="flex min-h-[60vh] items-center justify-center bg-muted">
    <div className="text-center">
      <h1 className="mb-4 text-4xl font-bold">404</h1>
      <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
      <Link to="/" className="text-primary underline hover:text-primary/90">
        Return to Home
      </Link>
    </div>
  </div>
);

/** Client-side fallback: follows a redirect for the current URL if one exists, else shows the 404 message. */
const NotFound = () => <RedirectOrFallback fallback={<NotFoundContent />} />;

export default NotFound;
