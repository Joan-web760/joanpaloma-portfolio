import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const FALLBACK_SITE_TITLE = "My Portfolio";
const FALLBACK_DESCRIPTION = "Portfolio showcasing services, projects, and experience.";

const encodePath = (path) =>
  String(path || "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

const createPublicClient = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export const getSiteSettings = cache(async () => {
  const client = createPublicClient();
  if (!client) return null;

  const { data, error } = await client.from("site_settings").select("*").limit(1).maybeSingle();
  if (error) return null;
  return data || null;
});

export const getContactSettings = cache(async () => {
  const client = createPublicClient();
  if (!client) return null;

  const { data, error } = await client
    .from("section_contact_settings")
    .select("*")
    .eq("is_published", true)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data || null;
});

export const getPublishedBlogPosts = cache(async () => {
  const client = createPublicClient();
  if (!client) return [];

  const { data, error } = await client
    .from("blog_posts")
    .select("slug,published_at,updated_at,created_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  if (error) return [];
  return data || [];
});

export const getBlogPostBySlug = cache(async (slug) => {
  const client = createPublicClient();
  if (!client || !slug) return null;

  const { data, error } = await client
    .from("blog_posts")
    .select("id,title,slug,excerpt,content,cover_image_path,published_at,updated_at,created_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data || null;
});

export const getSiteUrl = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
};

export const getSiteDefaults = (site) => {
  const siteTitle = site?.site_title?.trim() || FALLBACK_SITE_TITLE;
  const siteDescription = site?.site_description?.trim() || FALLBACK_DESCRIPTION;
  const siteKeywords = site?.site_keywords?.trim() || "";
  const isPublished = site?.is_published !== false;

  return { siteTitle, siteDescription, siteKeywords, isPublished };
};

export const getPublicStorageUrl = (bucket, path) => {
  if (!SUPABASE_URL || !bucket || !path) return "";
  const cleanPath = encodePath(path);
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanPath}`;
};

export const buildPageMetadata = ({ title, description, path, site, type = "website", images }) => {
  const { siteTitle, siteDescription, siteKeywords, isPublished } = getSiteDefaults(site);
  const pageTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const pageDescription = description || siteDescription;

  const openGraph = {
    title: pageTitle,
    description: pageDescription,
    type,
    siteName: siteTitle,
    url: path || "/",
  };

  if (images?.length) openGraph.images = images;

  const twitter = {
    card: images?.length ? "summary_large_image" : "summary",
    title: pageTitle,
    description: pageDescription,
  };

  if (images?.length) {
    twitter.images = images.map((img) => (typeof img === "string" ? img : img.url)).filter(Boolean);
  }

  return {
    title: title || siteTitle,
    description: pageDescription,
    keywords: siteKeywords || undefined,
    alternates: { canonical: path || "/" },
    openGraph,
    twitter,
    robots: { index: isPublished, follow: true },
  };
};
