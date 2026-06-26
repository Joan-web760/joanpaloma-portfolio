import { Ollama } from 'ollama'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const ipStore = new Map()

const LIMITS = {
  WINDOW_MS: 60 * 1000,
  MAX_REQUESTS_PER_WINDOW: 8,
  MAX_MESSAGES_PER_REQUEST: 14,
  MAX_CHARS_PER_MESSAGE: 1800,
  MAX_TABLES_PER_REQUEST: 13,
  MAX_ROWS_PER_TABLE: 12,
}

const SAFE_CONTEXT_SOURCES = {
  site_settings: {
    label: 'Site Settings',
    columns:
      'id, site_title, site_description, site_keywords, is_published, updated_at',
    defaultLimit: 1,
    allowedOrderBy: ['updated_at', 'created_at', 'id'],
    defaultOrderBy: 'updated_at',
    defaultAscending: false,
  },
  section_home: {
    label: 'Home',
    columns:
      'id, headline, subheadline, badges, primary_cta_label, primary_cta_url, secondary_cta_label, secondary_cta_url, is_published, updated_at',
    defaultLimit: 1,
    allowedOrderBy: ['updated_at', 'created_at', 'id'],
    defaultOrderBy: 'updated_at',
    defaultAscending: false,
    filters: [{ column: 'is_published', value: true }],
  },
  section_about: {
    label: 'About',
    columns:
      'id, short_bio, long_bio, values_json, is_published, updated_at',
    defaultLimit: 1,
    allowedOrderBy: ['updated_at', 'created_at', 'id'],
    defaultOrderBy: 'updated_at',
    defaultAscending: false,
    filters: [{ column: 'is_published', value: true }],
  },
  services: {
    label: 'Services',
    columns:
      'id, title, description, bullets, is_published, sort_order, created_at, updated_at',
    table: 'service_items',
    defaultLimit: 8,
    allowedOrderBy: ['sort_order', 'created_at', 'updated_at', 'id'],
    defaultOrderBy: 'sort_order',
    defaultAscending: true,
    filters: [{ column: 'is_published', value: true }],
  },
  portfolio: {
    label: 'Portfolio',
    columns:
      'id, title, subtitle, description, tags, results, project_url, repo_url, is_featured, is_published, sort_order, created_at, updated_at',
    table: 'portfolio_items',
    defaultLimit: 6,
    allowedOrderBy: ['is_featured', 'sort_order', 'created_at', 'updated_at', 'id'],
    defaultOrderBy: 'sort_order',
    defaultAscending: true,
    filters: [{ column: 'is_published', value: true }],
  },
  skills: {
    label: 'Skills',
    columns: 'id, name, type, level, is_published, sort_order, created_at, updated_at',
    table: 'skill_items',
    defaultLimit: 8,
    allowedOrderBy: ['level', 'type', 'sort_order', 'created_at', 'updated_at', 'id'],
    defaultOrderBy: 'sort_order',
    defaultAscending: true,
    filters: [{ column: 'is_published', value: true }],
  },
  certifications: {
    label: 'Certifications',
    columns:
      'id, title, provider, issued_date, verification_url, is_published, sort_order, created_at, updated_at',
    table: 'certification_items',
    defaultLimit: 6,
    allowedOrderBy: ['issued_date', 'sort_order', 'created_at', 'updated_at', 'id'],
    defaultOrderBy: 'sort_order',
    defaultAscending: true,
    filters: [{ column: 'is_published', value: true }],
  },
  experience: {
    label: 'Experience',
    columns:
      'id, role_title, company, client, location, start_date, end_date, is_current, summary, responsibilities, achievements, tools, tags, is_published, sort_order, created_at, updated_at',
    table: 'experience_items',
    defaultLimit: 6,
    allowedOrderBy: ['sort_order', 'start_date', 'created_at', 'updated_at', 'id'],
    defaultOrderBy: 'sort_order',
    defaultAscending: true,
    filters: [{ column: 'is_published', value: true }],
  },
  pricing: {
    label: 'Pricing',
    columns:
      'id, name, description, price, billing_type, inclusions, addons, is_featured, is_published, sort_order, created_at, updated_at',
    table: 'package_items',
    defaultLimit: 6,
    allowedOrderBy: ['is_featured', 'sort_order', 'created_at', 'updated_at', 'id'],
    defaultOrderBy: 'sort_order',
    defaultAscending: true,
    filters: [{ column: 'is_published', value: true }],
  },
  testimonials: {
    label: 'Testimonials',
    columns:
      'id, quote, name, role, company, rating, is_featured, is_published, sort_order, created_at, updated_at',
    table: 'testimonial_items',
    defaultLimit: 10,
    allowedOrderBy: ['is_featured', 'sort_order', 'created_at', 'updated_at', 'id'],
    defaultOrderBy: 'sort_order',
    defaultAscending: true,
    filters: [{ column: 'is_published', value: true }],
  },
  blogs: {
    label: 'Blog Posts',
    columns:
      'id, title, slug, excerpt, content, is_published, published_at, created_at, updated_at',
    table: 'blog_posts',
    defaultLimit: 8,
    allowedOrderBy: ['published_at', 'created_at', 'updated_at', 'id'],
    defaultOrderBy: 'published_at',
    defaultAscending: false,
    filters: [{ column: 'is_published', value: true }],
  },
  contact: {
    label: 'Contact',
    columns:
      'id, heading, subheading, public_email, phone, booking_url, socials, hours_text, timezone, is_published, updated_at',
    table: 'section_contact_settings',
    defaultLimit: 1,
    allowedOrderBy: ['updated_at', 'created_at', 'id'],
    defaultOrderBy: 'updated_at',
    defaultAscending: false,
    filters: [{ column: 'is_published', value: true }],
  },
  chatbot_knowledge: {
    label: 'Chatbot Knowledge',
    columns:
      'id, category, question, answer, keywords, visibility, is_published, priority, updated_at',
    defaultLimit: 10,
    allowedOrderBy: ['priority', 'updated_at', 'created_at', 'id'],
    defaultOrderBy: 'priority',
    defaultAscending: false,
    filters: [
      { column: 'visibility', value: 'public' },
      { column: 'is_published', value: true },
    ],
  },
}

function getClientIp(req) {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return 'unknown'
}

function isRateLimited(ip) {
  const now = Date.now()
  const record = ipStore.get(ip)

  if (!record) {
    ipStore.set(ip, { count: 1, start: now })
    return false
  }

  if (now - record.start > LIMITS.WINDOW_MS) {
    ipStore.set(ip, { count: 1, start: now })
    return false
  }

  record.count += 1
  ipStore.set(ip, record)

  return record.count > LIMITS.MAX_REQUESTS_PER_WINDOW
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function safeString(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables.')
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function getApprovedContextConfig(requestedConfig) {
  const approved = []
  const seen = new Set()

  for (const item of requestedConfig) {
    const name = String(item?.name || '').trim()
    if (!name || seen.has(name)) continue

    const safeSource = SAFE_CONTEXT_SOURCES[name]
    if (!safeSource) continue

    const requestedLimit = Number(item?.limit)
    const requestedOrderBy = String(item?.orderBy || '').trim()
    const approvedOrderBy = safeSource.allowedOrderBy.includes(requestedOrderBy)
      ? requestedOrderBy
      : safeSource.defaultOrderBy

    approved.push({
      name,
      table: safeSource.table || name,
      label: safeSource.label,
      columns: safeSource.columns,
      limit: Math.min(
        Number.isFinite(requestedLimit) && requestedLimit > 0
          ? requestedLimit
          : safeSource.defaultLimit,
        LIMITS.MAX_ROWS_PER_TABLE
      ),
      orderBy: approvedOrderBy || null,
      ascending:
        typeof item?.ascending === 'boolean'
          ? item.ascending
          : safeSource.defaultAscending,
      filters: safeSource.filters || [],
    })

    seen.add(name)
  }

  return approved
}

async function fetchTableContext(supabase, tableConfig) {
  const table = tableConfig?.table || tableConfig?.name
  if (!table) return null

  const columns = tableConfig?.columns || '*'
  const limit = Math.min(
    Number(tableConfig?.limit || 5),
    LIMITS.MAX_ROWS_PER_TABLE
  )
  const orderBy = tableConfig?.orderBy || null
  const ascending = Boolean(tableConfig?.ascending)
  const label = tableConfig?.label || table

  let query = supabase.from(table).select(columns).limit(limit)

  for (const filter of safeArray(tableConfig?.filters)) {
    if (!filter?.column) continue
    query = query.eq(filter.column, filter.value)
  }

  if (orderBy) {
    query = query.order(orderBy, { ascending })
  }

  const { data, error } = await query

  if (error) {
    return {
      table,
      label,
      error: error.message,
      rows: [],
    }
  }

  return {
    table,
    label,
    rows: safeArray(data),
  }
}

function compactRows(rows) {
  return rows.map((row) => {
    const compact = {}

    for (const [key, value] of Object.entries(row)) {
      if (
        value === null ||
        value === undefined ||
        value === '' ||
        key === 'password' ||
        key === 'hashed_password'
      ) {
        continue
      }

      if (typeof value === 'string') {
        compact[key] = value.slice(0, 600)
      } else if (Array.isArray(value)) {
        compact[key] = value.slice(0, 8)
      } else if (typeof value === 'object') {
        compact[key] = JSON.stringify(value).slice(0, 600)
      } else {
        compact[key] = value
      }
    }

    return compact
  })
}

function buildSupabaseContext(results) {
  if (!results.length) {
    return 'No approved Supabase context was loaded.'
  }

  return results
    .map((item, index) => {
      if (item.error) {
        return `
Source ${index + 1}
Label: ${item.label}
Table: ${item.table}
Error: ${item.error}
        `.trim()
      }

      return `
Source ${index + 1}
Label: ${item.label}
Table: ${item.table}
Rows:
${JSON.stringify(compactRows(item.rows), null, 2)}
      `.trim()
    })
    .join('\n\n---\n\n')
}

function buildDefaultPortfolioSystemPrompt(projectName) {
  return `
You are the portfolio assistant for ${projectName}.

Your main job:
- Help clients, recruiters, and collaborators quickly understand Joan's services, skills, experience, portfolio, pricing, and contact options.
- Turn visitors into qualified leads, interview opportunities, or service inquiries.

How to answer:
- Be concise, clear, confident, and helpful.
- Speak about the portfolio owner in third person, not in first person.
- Use "Joan", "she", or "her" when referring to the portfolio owner.
- Prefer short paragraphs and bullet points when useful.
- Give direct answers first.
- Recommend relevant services, skills, portfolio items, packages, or contact next steps based on the visitor's intent.
- When the user sounds like a recruiter or client, optimize for trust and conversion.
- When helpful, end with a soft call-to-action such as inviting them to contact, hire, or discuss the project.

What you should help with:
- Intro / professional summary
- Strongest skills
- Services offered
- Best-fit portfolio items and examples
- Work experience, certificates, and achievements
- Pricing and service packages
- Availability and contact details
- Why Joan is a good fit for a role, client, or support need

Behavior rules:
- Use the provided Supabase context first when relevant.
- When the Chatbot Knowledge source includes a relevant answer, treat it as the highest-priority custom source.
- Do not invent personal facts, projects, experience, pricing, or contact details that are not in the prompt or data context.
- If exact data is missing, say so briefly and still provide the most helpful general answer possible.
- Do not claim access to browser storage, private device files, hidden app state, unpublished data, private tables, or internal security configuration.
- Never reveal, infer, guess, or discuss admin credentials, secrets, access tokens, API keys, passwords, usernames for restricted areas, or internal security details.
- If asked for credentials, passwords, usernames, hidden configuration, or anything security-sensitive, refuse briefly and redirect to safe portfolio help.
- If asked something unrelated to the portfolio, answer briefly and steer back to portfolio-relevant help when appropriate.

Response style:
- Sound professional but human.
- Avoid unnecessary hype.
- If the visitor asks vague questions like "Why should I hire you?", structure the answer around strengths, proof, and next step.
- If they ask for portfolio work or examples, recommend the most relevant ones based on their goal.
- If they ask about hiring, explain how to proceed clearly.
  `.trim()
}

async function insertChatbotLog(supabase, payload) {
  try {
    const { error } = await supabase.from('chatbot_logs').insert(payload)
    if (error) {
      console.error('Chatbot log insert failed:', error.message)
    }
  } catch (error) {
    console.error('Chatbot log insert failed:', error)
  }
}

export async function POST(req) {
  try {
    const ip = getClientIp(req)

    if (isRateLimited(ip)) {
      return Response.json(
        {
          error:
            'Too many requests. Please wait about a minute before sending another message.',
        },
        { status: 429 }
      )
    }

    if (!process.env.OLLAMA_API_KEY) {
      return Response.json(
        { error: 'Missing OLLAMA_API_KEY in .env.local' },
        { status: 500 }
      )
    }

    const body = await req.json()

    const model = body?.model || process.env.OLLAMA_MODEL || 'llama3.2:3b'
    const messages = safeArray(body?.messages)
    const projectName = body?.projectName || 'Joan Paloma Portfolio'
    const customSystemPrompt = safeString(body?.systemPrompt).trim()
    const pageUrl = safeString(body?.pageUrl).slice(0, 500)
    const userAgent = safeString(req.headers.get('user-agent')).slice(0, 500)
    const requestedContextConfig = safeArray(body?.contextConfig).slice(
      0,
      LIMITS.MAX_TABLES_PER_REQUEST
    )
    const approvedContextConfig = getApprovedContextConfig(requestedContextConfig)

    const safeMessages = messages
      .slice(-LIMITS.MAX_MESSAGES_PER_REQUEST)
      .map((msg) => ({
        role: msg?.role === 'assistant' ? 'assistant' : 'user',
        content: safeString(msg?.content).slice(0, LIMITS.MAX_CHARS_PER_MESSAGE),
      }))

    const latestUserMessage =
      [...safeMessages].reverse().find((msg) => msg.role === 'user')?.content ||
      ''

    let supabaseContext = 'No approved database context loaded.'
    let supabase = null

    if (approvedContextConfig.length) {
      supabase = createSupabaseServerClient()
      const results = await Promise.all(
        approvedContextConfig.map((tableConfig) =>
          fetchTableContext(supabase, tableConfig)
        )
      )
      supabaseContext = buildSupabaseContext(results.filter(Boolean))
    }

    if (!supabase) {
      supabase = createSupabaseServerClient()
    }

    const basePrompt = buildDefaultPortfolioSystemPrompt(projectName)

    const fullSystemPrompt = `
${basePrompt}

Additional portfolio instructions:
${customSystemPrompt || 'No extra custom instructions provided.'}

Supabase context:
${supabaseContext}
    `.trim()

    const ollama = new Ollama({
      host: 'https://ollama.com',
      headers: {
        Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
      },
    })

    const finalMessages = [
      { role: 'system', content: fullSystemPrompt },
      ...safeMessages,
    ]

    const stream = await ollama.chat({
      model,
      messages: finalMessages,
      stream: true,
    })

    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        let fullAssistantResponse = ''

        try {
          for await (const part of stream) {
            const chunk = part?.message?.content || ''
            if (chunk) {
              fullAssistantResponse += chunk
              controller.enqueue(encoder.encode(chunk))
            }
          }

          await insertChatbotLog(supabase, {
            project_name: projectName,
            page_url: pageUrl || null,
            user_agent: userAgent || null,
            ip_address: ip || null,
            user_message: latestUserMessage || '(empty)',
            assistant_response: fullAssistantResponse || null,
            model,
            status: 'completed',
          })

          controller.close()
        } catch (error) {
          await insertChatbotLog(supabase, {
            project_name: projectName,
            page_url: pageUrl || null,
            user_agent: userAgent || null,
            ip_address: ip || null,
            user_message: latestUserMessage || '(empty)',
            assistant_response: fullAssistantResponse || null,
            model,
            status: 'error',
          })

          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    })
  } catch (error) {
    console.error('Chatbot API error:', error)

    return Response.json(
      {
        error: error?.message || 'Failed to generate chatbot response.',
      },
      { status: 500 }
    )
  }
}


