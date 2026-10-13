'use client';

import AdminLayout from './AdminLayout';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { SITE_URL } from '@/lib/site';

export default function AdminMedia() {
  const host = SITE_URL.replace(/^https?:\/\//, '');
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Media Library</h1>
          <p className="max-w-3xl text-muted-foreground">
            Upload images once and use them anywhere. Every image gets an address on your own domain (for example{' '}
            <code className="rounded bg-muted px-1 text-sm">{host}/media/stryker-1007-stretcher.webp</code>), so it can be inserted in
            the editor, linked from other websites, and found in Google Images under {host}. Name files well before uploading: the file name becomes the address.
          </p>
        </div>
        <MediaPicker mode="manage" />
        <p className="text-xs text-muted-foreground">
          Deleting an image is permanent and breaks every page or website that still links to it.
        </p>
      </div>
    </AdminLayout>
  );
}
