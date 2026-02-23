import { getPublishedBlogPosts, getSiteUrl } from "@/lib/seo";

export default async function sitemap() {
  const siteUrl = getSiteUrl().toString().replace(/\/$/, "");
  const now = new Date();

  const staticRoutes = [
    "",
    "/about",
    "/experience",
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
  }));

  const posts = await getPublishedBlogPosts();
  const blogRoutes = (posts || [])
    .filter((post) => post?.slug)
    .map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.updated_at || post.published_at || post.created_at || now,
    }));

  return [...staticRoutes, ...blogRoutes];
}
