'use client';

import InlineImage from './InlineImage';
import BlogPostCTAButton from './BlogPostCTAButton';

export default function ContentBlocks({ blocks = [] }) {
  if (!blocks?.length) return null;

  return (
    <div className="mt-4">
      {blocks.map((b) => {
        const d = b.data || {};

        if (b.type === 'heading') {
          const level = Number(d.level || 2);
          const text = d.text || '';
          const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4';
          return (
            <Tag key={b.id} className={`mt-4 ${level >= 3 ? 'h5' : 'h4'}`}>
              {text}
            </Tag>
          );
        }

        if (b.type === 'paragraph') {
          return (
            <p key={b.id} className="opacity-75">
              {d.text || ''}
            </p>
          );
        }

        if (b.type === 'list') {
          const items = Array.isArray(d.items) ? d.items : [];
          const ordered = !!d.ordered;

          if (!items.length) return null;

          if (ordered) {
            return (
              <ol key={b.id} className="opacity-75">
                {items.map((it, idx) => (
                  <li key={`${b.id}-${idx}`}>{it}</li>
                ))}
              </ol>
            );
          }

          return (
            <ul key={b.id} className="opacity-75">
              {items.map((it, idx) => (
                <li key={`${b.id}-${idx}`}>{it}</li>
              ))}
            </ul>
          );
        }

        if (b.type === 'quote') {
          return (
            <blockquote key={b.id} className="border-start border-3 ps-3 my-4">
              <div className="opacity-75">“{d.text || ''}”</div>
              {d.author ? <div className="small opacity-75 mt-2">— {d.author}</div> : null}
            </blockquote>
          );
        }

        if (b.type === 'image') {
          return <InlineImage key={b.id} data={d} />;
        }

        if (b.type === 'code') {
          return (
            <div key={b.id} className="my-4">
              {d.language ? <div className="small opacity-75 mb-2">{d.language}</div> : null}
              <pre className="bg-black p-3 rounded overflow-auto mb-0">
                <code>{d.code || ''}</code>
              </pre>
            </div>
          );
        }

        if (b.type === 'cta') {
          return (
            <div key={b.id} className="card bg-dark text-light border-0 my-4">
              <div className="card-body text-center py-4">
                {d.title ? <div className="h5 mb-2">{d.title}</div> : null}
                {d.subtitle ? <div className="opacity-75 mb-3">{d.subtitle}</div> : null}
                <BlogPostCTAButton href={d.href} label={d.label} />
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
