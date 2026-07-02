import ChatbotWidget from "@/components/chatbot/ChatbotWidget";

export const metadata = {
  title: "jeconiahjireh",
  description: "Private chatbot page.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function JeconiahJirehPage() {
  return (
    <main className="jeconiahjireh-page">
      <section className="jeconiahjireh-hero">
        <div className="container">
          <div className="jeconiahjireh-shell">
            <p className="jeconiahjireh-kicker">Private page</p>
            <h1>jeconiahjireh</h1>
            <p className="jeconiahjireh-copy">
              Talk through anything with a private chatbot powered by the default API key.
            </p>

            <ChatbotWidget
              title="Jeconiah Jireh"
              subtitle="General private chatbot"
              projectName="jeconiahjireh"
              displayMode="embedded"
              statusLabel="General assistant"
              showUsageLimit={false}
              initialOpen
              dailyMessageLimit={80}
              usageStorageKey="jeconiahjireh_chatbot_daily_usage_v1"
              conversationStorageKey="jeconiahjireh_chatbot_conversation_v1"
              openStorageKey="jeconiahjireh_chatbot_open_v1"
              proactiveGreetingStorageKey="jeconiahjireh_chatbot_greeting_seen_v1"
              welcomeMessage={`Hi. Ask me anything you want to work through. I will format responses in Markdown so they are easy to read.`}
              welcomeActions={[]}
              placeholder="Ask anything..."
              buttonLabel="Send"
              quickPrompts={[
                "Help me brainstorm an idea.",
                "Summarize this in plain language.",
                "Draft a short professional reply.",
                "Think through this decision with me.",
              ]}
              leadPrompts={[
                "Make this sound warmer.",
                "Turn this into action steps.",
                "Ask me clarifying questions first.",
              ]}
              proactiveBubbleSequence={[]}
              systemPrompt={`
Answer as a general-purpose private assistant. Help with writing, planning, learning, coding, brainstorming, decisions, and everyday questions.
Use Markdown formatting for every response. Prefer concise sections, bullet points, numbered steps, tables, and fenced code blocks when useful.
              `}
            />
          </div>
        </div>
      </section>

      <style>{`
        .jeconiahjireh-page {
          min-height: 100dvh;
          color: #152235;
          background:
            linear-gradient(135deg, rgba(247, 250, 255, 0.96), rgba(238, 247, 242, 0.98)),
            #f7fafc;
        }

        .jeconiahjireh-hero {
          min-height: 100dvh;
          display: grid;
          align-items: center;
          padding: 2.5rem 0 4rem;
        }

        .jeconiahjireh-shell {
          display: grid;
          gap: 1rem;
          max-width: 980px;
          margin: 0 auto;
        }

        .jeconiahjireh-kicker {
          margin-bottom: 0.75rem;
          color: #146b5c;
          font-family: var(--admin-font-body, system-ui, sans-serif);
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .jeconiahjireh-shell h1 {
          margin: 0;
          font-size: clamp(3rem, 9vw, 7rem);
          line-height: 0.9;
        }

        .jeconiahjireh-copy {
          max-width: 34rem;
          margin: 0 0 1rem;
          color: #526173;
          font-size: clamp(1.15rem, 2vw, 1.45rem);
          line-height: 1.55;
        }
      `}</style>
    </main>
  );
}
