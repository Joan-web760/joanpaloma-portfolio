'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function MarkdownContent({ children, className = '' }) {
  return (
    <div className={`portfolio-markdown ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="markdown-table-scroll my-2">
              <table className="table table-sm table-bordered align-middle mb-0 markdown-table">
                {children}
              </table>
            </div>
          ),
          p: ({ children }) => <p className="mb-2">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 ps-3">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 ps-3">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          h1: ({ children }) => <h1 className="h6 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="h6 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="h6 mb-2">{children}</h3>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-start ps-2 text-muted my-2">
              {children}
            </blockquote>
          ),
          code(props) {
            const { inline, children, className, ...rest } = props

            if (inline) {
              return (
                <code className="bg-light px-1 rounded" {...rest}>
                  {children}
                </code>
              )
            }

            return (
              <pre className="bg-dark text-white p-2 rounded small overflow-auto">
                <code className={className} {...rest}>
                  {children}
                </code>
              </pre>
            )
          },
        }}
      >
        {String(children || '')}
      </ReactMarkdown>
    </div>
  )
}
