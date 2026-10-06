import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml',
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Always the canonical domain, so preview/staging origins never leak into the sitemap.
    const baseUrl = (Deno.env.get('SITE_URL') || 'https://mrbedmed.com').replace(/\/+$/, '')

    const [posts, products, parts, services, categories] = await Promise.all([
      supabase.from('blog_posts').select('slug, id, updated_at').eq('published', true),
      supabase.from('products').select('id, slug, updated_at'),
      supabase.from('parts').select('id, slug, updated_at'),
      supabase.from('services').select('slug, updated_at').eq('published', true),
      supabase.from('categories').select('slug, updated_at'),
    ])

    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'weekly' },
      { loc: '/products', priority: '0.9', changefreq: 'daily' },
      { loc: '/parts', priority: '0.8', changefreq: 'weekly' },
      { loc: '/services', priority: '0.7', changefreq: 'monthly' },
      { loc: '/about-us', priority: '0.6', changefreq: 'monthly' },
      { loc: '/contact-us', priority: '0.6', changefreq: 'monthly' },
      { loc: '/faq', priority: '0.7', changefreq: 'weekly' },
      { loc: '/blog', priority: '0.8', changefreq: 'daily' },
      { loc: '/warranty', priority: '0.4', changefreq: 'yearly' },
      { loc: '/privacy', priority: '0.3', changefreq: 'yearly' },
      { loc: '/terms', priority: '0.3', changefreq: 'yearly' },
    ]

    const entries: string[] = []
    const add = (path: string, changefreq: string, priority: string, updatedAt?: string) => {
      entries.push(`  <url>
    <loc>${escapeXml(baseUrl + path)}</loc>${updatedAt ? `
    <lastmod>${new Date(updatedAt).toISOString()}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`)
    }

    for (const page of staticPages) add(page.loc, page.changefreq, page.priority)
    for (const c of categories.data ?? []) add(`/category/${c.slug}`, 'weekly', '0.8', c.updated_at)
    for (const s of services.data ?? []) add(`/services/${s.slug}`, 'monthly', '0.7', s.updated_at)
    for (const p of products.data ?? []) add(`/products/${p.slug || p.id}`, 'weekly', '0.8', p.updated_at)
    for (const p of parts.data ?? []) add(`/part/${p.slug || p.id}`, 'weekly', '0.7', p.updated_at)
    for (const p of posts.data ?? []) add(`/blog/${p.slug || p.id}`, 'monthly', '0.7', p.updated_at)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`

    console.log(`Sitemap generated with ${entries.length} URLs`)

    return new Response(xml, { headers: corsHeaders })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new Response('Error generating sitemap', { status: 500 })
  }
})
