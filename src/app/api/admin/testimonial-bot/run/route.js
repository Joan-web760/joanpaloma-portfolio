import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { generateTestimonialDraft, TESTIMONIAL_BOT_ROLES } from "@/lib/testimonial-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearerToken(request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
}

function getSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase configuration.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function requireAdminUser(request) {
  const token = getBearerToken(request);
  if (!token) return null;

  const supabase = getSupabaseAuthClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  return data.user;
}

export async function GET(request) {
  try {
    const user = await requireAdminUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    return NextResponse.json(
      { ok: true, roles: TESTIMONIAL_BOT_ROLES },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Could not load testimonial bot." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await requireAdminUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    const draft = await generateTestimonialDraft({
      brief: payload?.brief,
      role: payload?.role,
      rating: payload?.rating,
      ratingPreference: payload?.ratingPreference,
    });

    return NextResponse.json(
      { ok: true, draft },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Could not run testimonial bot." },
      { status: 500 }
    );
  }
}
