'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, MailX } from 'lucide-react';
import { Link } from '@/lib/router';
import { Button } from '@/components/ui/button';

/**
 * Unsubscribe page (link at the bottom of every newsletter). Asks for one click rather than
 * unsubscribing on page load, so link scanners in mail systems cannot unsubscribe people.
 */
export default function NewsletterUnsubscribe({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const unsubscribe = async () => {
    setState('working');
    const res = await fetch(`/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.ok && body?.ok) setState('done');
    else {
      setMessage(body?.error || 'Something went wrong. Please try again.');
      setState('error');
    }
  };

  return (
    <section className="bg-muted py-16 md:py-24">
      <div className="container mx-auto max-w-lg px-4 text-center">
        {state === 'done' ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
            <h1 className="mt-4 font-display text-3xl font-bold">You are unsubscribed</h1>
            <p className="mt-3 text-muted-foreground">You will not receive the Mr.Bedmed newsletter any more. You can sign up again at any time in the website footer.</p>
            <Button asChild className="mt-8"><Link to="/">Back to the website</Link></Button>
          </>
        ) : !token ? (
          <>
            <MailX className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <h1 className="mt-4 font-display text-3xl font-bold">Unsubscribe</h1>
            <p className="mt-3 text-muted-foreground">
              Please use the unsubscribe link at the bottom of one of our emails, or <Link to="/contact-us" className="text-primary underline">contact us</Link> and we will remove your address.
            </p>
          </>
        ) : (
          <>
            <MailX className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
            <h1 className="mt-4 font-display text-3xl font-bold">Unsubscribe from the newsletter?</h1>
            <p className="mt-3 text-muted-foreground">You will stop receiving Mr.Bedmed newsletter emails.</p>
            {state === 'error' && <p className="mt-4 text-destructive" role="alert">{message}</p>}
            <Button size="lg" className="mt-8" onClick={unsubscribe} disabled={state === 'working'}>
              {state === 'working' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Unsubscribe
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
