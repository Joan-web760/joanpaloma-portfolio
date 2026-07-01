# Joan Paloma Portfolio

A professional personal portfolio and content management system built for Joan Paloma. The project presents Joan's services, skills, work samples, certifications, testimonials, pricing, blog content, and contact details through a polished public website, while also providing a protected admin dashboard for updating content without touching code.

The portfolio is designed for clients, recruiters, and collaborators who need to quickly understand Joan's professional background and decide whether she is a good fit for virtual assistant, administrative support, operations, customer support, or freelance work.

## Project Overview

This application is more than a static portfolio. It works as a CMS-style business website with a public-facing experience, authenticated admin tools, editable content sections, SEO metadata, and a polished presentation layer.

The public site highlights Joan's personal brand and professional value through structured sections:

- Hero introduction with headline, subheadline, calls to action, badges, and media support
- Portfolio gallery for featured work samples, project links, tags, and measurable results
- Certifications section for proof of learning and professional development
- Services catalog for virtual assistant and business support offerings
- Skills and tools sections for technical and operational strengths
- Blog section for authority building and search visibility
- Testimonials for social proof
- Pricing and packages for lead qualification
- Contact section with public email, social links, booking link, hours, and availability details

The admin side gives the portfolio owner a practical dashboard for managing those sections, checking published content status, editing records, reviewing contact messages, and keeping portfolio content up to date.

## Key Features

### Public Portfolio Website

- Responsive one-page portfolio experience using the Next.js App Router
- Dedicated public blog detail pages with markdown-style content rendering
- Dynamic metadata and JSON-LD structured data for better SEO
- Section-based layout for home, portfolio, certifications, services, skills, blog, testimonials, pricing, and contact
- Bootstrap and custom CSS styling for a clean, professional interface
- Font Awesome icons and Open Sans typography
- Vercel Analytics integration

### Admin Dashboard

- Authenticated admin area
- Secure access flow for portfolio management
- Dashboard overview showing content readiness, published item counts, and last updated timestamps
- Chart.js-powered completion and published-content visualizations
- CRUD-style admin pages for:
  - Home section
  - About section
  - Services
  - Skills
  - Tools
  - Work experience
  - Portfolio items
  - Certifications
  - Blog posts
  - Testimonials
  - Pricing packages
  - Contact settings and inbox
  - Footer and global site settings
  - Section background images

### Content Management

- Public sections display curated, published portfolio content
- Admin pages support organized editing for each major portfolio section
- Content can be maintained through structured forms instead of direct code changes
- The dashboard helps track which sections are ready, published, or still need updates

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** JavaScript / JSX
- **UI:** React 19, Bootstrap 5.3.3, custom CSS
- **Icons:** Font Awesome
- **Charts:** Chart.js
- **Markdown:** react-markdown and remark-gfm
- **Analytics:** Vercel Analytics
- **Linting:** ESLint

## Security and Privacy

This public project description intentionally avoids exposing private credentials, API keys, admin account details, or deployment secrets. Sensitive values are handled through environment configuration and are not included in the repository documentation.

Security-focused implementation details include:

- Authenticated admin-only editing workflows
- Published-content filtering for public pages
- Separation between public portfolio content and private admin workflows
- No credentials or private configuration values included in the README

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open the public portfolio:

```text
http://localhost:3000
```

## Available Scripts

```bash
npm run dev
```

Starts the local development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run start
```

Runs the production build locally.

```bash
npm run lint
```

Runs ESLint checks.

## Portfolio Value

This project demonstrates the ability to build a real client-ready web application with both public presentation and private content operations. It combines frontend design, CMS-style architecture, authentication, SEO, analytics, and admin workflows in one cohesive portfolio product.

The strongest technical highlights are:

- Next.js architecture using the App Router
- Structured content management and authentication
- Practical admin dashboard with charts and content-status reporting
- SEO-ready public pages with metadata and structured data
- Modular component organization for scalable section development
- Clear separation between public visitor experience and private admin tools

## Deployment

The app can be deployed to Vercel or any platform that supports Next.js. Before deploying, configure the required environment values in the hosting provider and keep private credentials out of the public repository.
