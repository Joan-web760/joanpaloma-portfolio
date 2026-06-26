import { Ollama } from "ollama";

export const TESTIMONIAL_BOT_ROLES = [
  "Happy Client",
  "Busy Founder",
  "Operations Manager",
  "Insurance Adviser",
  "Executive Partner",
  "Agency Lead",
  "Small Business Owner",
];

const ROLE_GUIDANCE = {
  "Happy Client": "warm, grateful, and specific about the relief they felt",
  "Busy Founder": "direct, outcome-focused, and appreciative of saved time",
  "Operations Manager": "organized, practical, and focused on smoother workflows",
  "Insurance Adviser": "credible, client-service focused, and aware of admin details",
  "Executive Partner": "polished, concise, and focused on reliability",
  "Agency Lead": "fast-moving, collaborative, and focused on delivery support",
  "Small Business Owner": "plainspoken, practical, and focused on trust",
};

const FALLBACK_DRAFTS = [
  {
    quote:
      "Joan brought structure to the details that used to slow our day down. Her follow-ups, documentation, and steady communication made the whole workflow feel easier to manage.",
    name: "Alex Morgan",
    role: "Founder",
    company: "",
  },
  {
    quote:
      "Working with Joan helped us stay on top of admin tasks without losing focus on clients. She is reliable, organized, and quick to understand what needs attention.",
    name: "Sam Reyes",
    role: "Operations Lead",
    company: "Northline Support",
  },
  {
    quote:
      "Joan handled the moving parts with care, from CRM updates to client follow-ups. Her support gave our team more time to focus on higher-priority work.",
    name: "Mia Santos",
    role: "Client Services Manager",
    company: "HarborPoint Advisory",
  },
  {
    quote:
      "Joan was dependable with the admin work we needed most, especially follow-ups and documentation. A few handoffs still needed our review at first, but her support quickly made our process more organized.",
    name: "Taylor Cruz",
    role: "Team Coordinator",
    company: "",
  },
];

const DEFAULT_BRIEF =
  "Generate a polished fictional testimonial for Joan Paloma's virtual admin assistant portfolio. Focus on reliable administrative support, CRM updates, scheduling, documentation, quotations, renewals, client follow-ups, claims coordination, inbox support, reporting, and smoother operations for a busy client team.";

function clean(value = "", max = 600) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function clampRating(value) {
  const rating = Number(value);
  if (Number.isNaN(rating)) return 5;
  return Math.min(5, Math.max(1, Math.round(rating)));
}

function pickBalancedRating(options = {}) {
  if (options.ratingPreference === "balanced_4_5" || options.rating === undefined || options.rating === null || options.rating === "") {
    return Math.random() < 0.45 ? 4 : 5;
  }

  return clampRating(options.rating);
}

function parseJsonObject(value = "") {
  const raw = String(value || "").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function pickFallback(role, brief, rating) {
  const seed = `${role} ${brief}`.length;
  const draft = FALLBACK_DRAFTS[seed % FALLBACK_DRAFTS.length];

  return {
    ...draft,
    rating: clampRating(rating),
    persona: role,
    source: "fallback",
  };
}

export async function generateTestimonialDraft(options = {}) {
  const role = TESTIMONIAL_BOT_ROLES.includes(options.role) ? options.role : "Happy Client";
  const brief = clean(options.brief || DEFAULT_BRIEF, 1000);
  const rating = pickBalancedRating(options);

  const fallback = pickFallback(role, brief, rating);

  if (!process.env.OLLAMA_API_KEY) {
    return { ...fallback, source: "fallback_missing_ollama_key" };
  }

  try {
    const ollama = new Ollama({
      host: "https://ollama.com",
      headers: {
        Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
      },
    });

    const response = await ollama.chat({
      model: process.env.OLLAMA_MODEL || "llama3.2:3b",
      stream: false,
      format: "json",
      messages: [
        {
          role: "system",
          content:
            "You create editable testimonial drafts for Joan Paloma's admin portfolio. Return only valid JSON. Do not wrap it in markdown. The draft must be fictional unless the admin provides exact approved client details. Do not claim a real endorsement. Keep it concise, natural, and suitable for admin review before publishing. Company can be an empty string when no approved company name is provided.",
        },
        {
          role: "user",
          content: `Persona: ${role}
Persona guidance: ${ROLE_GUIDANCE[role]}
Desired rating: ${rating}
Client scenario or notes: ${brief}

Rating guidance:
- For a 5-star draft, sound warmly satisfied and specific.
- For a 4-star draft, stay positive but include a mild realistic nuance, such as early handoff alignment, review time, or a process that improved after setup.
- Do not make 4-star feedback negative or damaging.

Return this exact JSON shape:
{
  "quote": "1-3 sentence testimonial draft about Joan's virtual assistant, admin, operations, CRM, documentation, scheduling, client support, or workflow help",
  "name": "fictional client display name unless a real approved name was provided",
  "role": "job title",
  "company": "approved company or team name, otherwise blank",
  "rating": ${rating}
}`,
        },
      ],
    });

    const parsed = parseJsonObject(response?.message?.content);
    if (!parsed) return { ...fallback, source: "fallback_parse_error" };

    return {
      quote: clean(parsed.quote || fallback.quote, 420),
      name: clean(parsed.name || fallback.name, 80),
      role: clean(parsed.role || fallback.role, 80),
      company: Object.prototype.hasOwnProperty.call(parsed, "company")
        ? clean(parsed.company, 80)
        : fallback.company,
      rating: clampRating(parsed.rating || rating),
      persona: role,
      source: "llm",
    };
  } catch {
    return { ...fallback, source: "fallback_llm_error" };
  }
}
