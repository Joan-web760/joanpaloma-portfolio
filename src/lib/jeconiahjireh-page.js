import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const DEFAULT_JECONIAHJIREH_PAGE = {
  title: "Jeconiah Jireh",
  description: "A private chatbot page for Joan Paloma's daughter.",
  kicker: "Private page",
  heading: "Jeconiah Jireh",
  intro:
    "A private space made for Joan Paloma's daughter, Jeconiah Jireh. Ask questions, draft ideas, learn something new, or talk through everyday thoughts with a gentle assistant.",
  chatbotTitle: "Jeconiah Jireh",
  chatbotSubtitle: "Private everyday assistant",
  statusLabel: "Private assistant",
  placeholder: "Ask anything, Jeconiah Jireh...",
  buttonLabel: "Send",
  welcomeMessage:
    "Hi Jeconiah Jireh. This is your private assistant. You can ask for help with writing, studying, ideas, plans, or anything you want to understand better. I will format replies in Markdown so they are easy to read.",
  quickPrompts: [
    "Help me understand something in simple words.",
    "Help me brainstorm an idea.",
    "Draft a kind message for me.",
    "Give me step-by-step instructions.",
  ],
  leadPrompts: [
    "Ask me clarifying questions first.",
    "Make this sound warmer.",
    "Turn this into action steps.",
  ],
  systemPrompt:
    "Answer as a kind, general-purpose private assistant for Joan Paloma's daughter, Jeconiah Jireh. Jeconiah Jireh is her first name. Help with writing, learning, planning, brainstorming, decisions, and everyday questions. Keep responses warm, clear, age-appropriate, and practical. Use Markdown formatting for every response. Do not request sensitive personal information.",
};

const createPublicClient = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
};

const normalizeStringArray = (value, fallback) => {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);

    if (items.length) return items;
  }

  return fallback;
};

const normalizePage = (row) => {
  if (!row) return DEFAULT_JECONIAHJIREH_PAGE;

  return {
    title: firstNonEmpty(row.title, DEFAULT_JECONIAHJIREH_PAGE.title),
    description: firstNonEmpty(
      row.description,
      DEFAULT_JECONIAHJIREH_PAGE.description
    ),
    kicker: firstNonEmpty(row.kicker, DEFAULT_JECONIAHJIREH_PAGE.kicker),
    heading: firstNonEmpty(row.heading, row.title, DEFAULT_JECONIAHJIREH_PAGE.heading),
    intro: firstNonEmpty(row.intro, DEFAULT_JECONIAHJIREH_PAGE.intro),
    chatbotTitle: firstNonEmpty(
      row.chatbot_title,
      row.title,
      DEFAULT_JECONIAHJIREH_PAGE.chatbotTitle
    ),
    chatbotSubtitle: firstNonEmpty(
      row.chatbot_subtitle,
      DEFAULT_JECONIAHJIREH_PAGE.chatbotSubtitle
    ),
    statusLabel: firstNonEmpty(
      row.status_label,
      DEFAULT_JECONIAHJIREH_PAGE.statusLabel
    ),
    placeholder: firstNonEmpty(
      row.placeholder,
      DEFAULT_JECONIAHJIREH_PAGE.placeholder
    ),
    buttonLabel: firstNonEmpty(
      row.button_label,
      DEFAULT_JECONIAHJIREH_PAGE.buttonLabel
    ),
    welcomeMessage: firstNonEmpty(
      row.welcome_message,
      DEFAULT_JECONIAHJIREH_PAGE.welcomeMessage
    ),
    quickPrompts: normalizeStringArray(
      row.quick_prompts,
      DEFAULT_JECONIAHJIREH_PAGE.quickPrompts
    ),
    leadPrompts: normalizeStringArray(
      row.lead_prompts,
      DEFAULT_JECONIAHJIREH_PAGE.leadPrompts
    ),
    systemPrompt: firstNonEmpty(
      row.system_prompt,
      DEFAULT_JECONIAHJIREH_PAGE.systemPrompt
    ),
  };
};

export const getJeconiahJirehPageContent = cache(async () => {
  const client = createPublicClient();
  if (!client) return DEFAULT_JECONIAHJIREH_PAGE;

  const { data, error } = await client
    .from("jeconiahjireh_page")
    .select(
      "title,description,kicker,heading,intro,chatbot_title,chatbot_subtitle,status_label,placeholder,button_label,welcome_message,quick_prompts,lead_prompts,system_prompt"
    )
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return DEFAULT_JECONIAHJIREH_PAGE;

  return normalizePage(data);
});
