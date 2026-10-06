import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import BlogPost from '@/views/BlogPost';
import { queries } from '@/queries';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import { blogPostMetadata, notFoundMetadata } from '@/lib/server/metadata';
import { redirectOrNotFound } from '@/lib/server/notFound';
import { isValidSlug } from '@/lib/slugify';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await getQueryClient().fetchQuery(queries.blogPost(id));
  return post ? blogPostMetadata(post) : notFoundMetadata;
}

export default async function BlogPostPage({ params }: Props) {
  const { id } = await params;
  const qc = getQueryClient();
  const [post] = await Promise.all([qc.fetchQuery(queries.blogPost(id)), prefetchShell(qc)]);
  if (!post) await redirectOrNotFound(`/blog/${id}`);
  if (post!.slug && isValidSlug(post!.slug) && id !== post!.slug) permanentRedirect(`/blog/${post!.slug}`);
  await qc.prefetchQuery(queries.relatedPosts(post!.id));
  return (
    <Hydrated qc={qc}>
      <BlogPost />
    </Hydrated>
  );
}
