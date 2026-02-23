import Navbar from "@/components/Navbar";
import { notFound } from "next/navigation";
import {
  buildPageMetadata,
  getBlogPostBySlug,
  getPublicStorageUrl,
  getSiteDefaults,
  getSiteSettings,
  getSiteUrl,
} from "@/lib/seo";

export async function generateMetadata({ params }) {
  const site = await getSiteSettings();
  const { siteDescription } = getSiteDefaults(site);
  const post = await getBlogPostBySlug(params?.slug);

  if (!post) {
    return buildPageMetadata({
      site,
      title: "Blog",
      description: siteDescription,
      path: `/blog/${params?.slug || ""}`,
    });
  }

  const coverUrl = post.cover_image_path
    ? getPublicStorageUrl("portfolio-media", post.cover_image_path)
    : "";

  const images = coverUrl
    ? [
        {
          url: coverUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ]
    : undefined;

  return buildPageMetadata({
    site,
    title: post.title,
    description: post.excerpt || siteDescription,
    path: `/blog/${post.slug}`,
    type: "article",
    images,
  });
}

const toDateLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

const parseBlocks = (content) => {
  const blocks = String(content || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks;
};

const renderBlock = (block, idx) => {
  if (block.startsWith("### ")) {
    return (
      <h4 key={idx} className="mt-4">
        {block.replace(/^###\s+/, "")}
      </h4>
    );
  }
  if (block.startsWith("## ")) {
    return (
      <h3 key={idx} className="mt-4">
        {block.replace(/^##\s+/, "")}
      </h3>
    );
  }
  if (block.startsWith("# ")) {
    return (
      <h2 key={idx} className="mt-4">
        {block.replace(/^#\s+/, "")}
      </h2>
    );
  }

  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const isList = lines.length > 1 && lines.every((line) => line.startsWith("- "));
  if (isList) {
    return (
      <ul key={idx}>
        {lines.map((line, lineIdx) => (
          <li key={lineIdx}>{line.replace(/^-+\s+/, "")}</li>
        ))}
      </ul>
    );
  }

  return <p key={idx}>{lines.join(" ")}</p>;
};

export default async function BlogPostPage({ params }) {
  const post = await getBlogPostBySlug(params?.slug);
  if (!post) notFound();

  const site = await getSiteSettings();
  const { siteTitle } = getSiteDefaults(site);

  const siteUrl = getSiteUrl().toString().replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}/blog/${post.slug}`;
  const coverUrl = post.cover_image_path
    ? getPublicStorageUrl("portfolio-media", post.cover_image_path)
    : "";

  const publishedLabel = toDateLabel(post.published_at || post.created_at);
  const updatedLabel = toDateLabel(post.updated_at);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || "",
    datePublished: post.published_at || post.created_at || undefined,
    dateModified: post.updated_at || post.published_at || post.created_at || undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    ...(coverUrl ? { image: [coverUrl] } : {}),
    author: {
      "@type": "Person",
      name: siteTitle,
    },
    publisher: {
      "@type": "Person",
      name: siteTitle,
    },
  };

  const blocks = parseBlocks(post.content);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="pt-5 pt-lg-5">
        <article className="container py-4" itemScope itemType="https://schema.org/BlogPosting">
          <header className="mb-4">
            <h1 className="display-6 fw-bold">{post.title}</h1>
            <div className="text-muted small">
              {publishedLabel ? <span>Published {publishedLabel}</span> : null}
              {publishedLabel && updatedLabel ? <span className="mx-2">&middot;</span> : null}
              {updatedLabel ? <span>Updated {updatedLabel}</span> : null}
            </div>
          </header>

          {coverUrl ? (
            <img
              src={coverUrl}
              alt={post.title}
              className="img-fluid rounded border mb-4"
              loading="eager"
              decoding="async"
            />
          ) : null}

          <div className="vstack gap-3">{blocks.map(renderBlock)}</div>
        </article>
      </main>
    </>
  );
}
