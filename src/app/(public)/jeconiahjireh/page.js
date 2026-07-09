import ChatbotWidget from "@/components/chatbot/ChatbotWidget";
import { getJeconiahJirehPageContent } from "@/lib/jeconiahjireh-page";

export const revalidate = 60;

export async function generateMetadata() {
  const content = await getJeconiahJirehPageContent();

  return {
    title: content.title,
    description: content.description,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function JeconiahJirehPage() {
  const content = await getJeconiahJirehPageContent();

  return (
    <main className="jeconiahjireh-page">
      <section className="jeconiahjireh-hero">
        <div className="container">
          <div className="jeconiahjireh-shell">
            <div className="jeconiahjireh-intro">
              <div className="jeconiahjireh-sticker jeconiahjireh-sticker--star" aria-hidden="true" />
              <div className="jeconiahjireh-sticker jeconiahjireh-sticker--flower" aria-hidden="true" />
              <p className="jeconiahjireh-kicker">{content.kicker}</p>
              <h1>{content.heading}</h1>
              <p className="jeconiahjireh-copy">
                {content.intro}
              </p>
              <div className="jeconiahjireh-badges" aria-label="Page mood">
                <span>Sweet helper</span>
                <span>Kind ideas</span>
                <span>Cozy learning</span>
              </div>
            </div>

            <div className="jeconiahjireh-chat-stage">
              <div className="jeconiahjireh-ribbon" aria-hidden="true" />
              <ChatbotWidget
                title={content.chatbotTitle}
                subtitle={content.chatbotSubtitle}
                projectName="jeconiahjireh"
                contextConfig={[
                  {
                    name: "jeconiahjireh_page",
                    limit: 1,
                    orderBy: "updated_at",
                  },
                ]}
                displayMode="embedded"
                statusLabel={content.statusLabel}
                showUsageLimit={false}
                showSuggestedPrompt={false}
                initialOpen
                dailyMessageLimit={80}
                usageStorageKey="jeconiahjireh_chatbot_daily_usage_v1"
                conversationStorageKey="jeconiahjireh_chatbot_conversation_v1"
                openStorageKey="jeconiahjireh_chatbot_open_v1"
                proactiveGreetingStorageKey="jeconiahjireh_chatbot_greeting_seen_v1"
                welcomeMessage={content.welcomeMessage}
                welcomeActions={[]}
                placeholder={content.placeholder}
                buttonLabel={content.buttonLabel}
                quickPrompts={content.quickPrompts}
                leadPrompts={content.leadPrompts}
                proactiveBubbleSequence={[]}
                systemPrompt={content.systemPrompt}
              />
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .jeconiahjireh-page {
          min-height: 100dvh;
          color: #432746;
          background:
            linear-gradient(180deg, rgba(255, 251, 254, 0.78), rgba(255, 246, 250, 0.94)),
            url("/images/jeconiah-jireh-cute-hero.png") center top / cover fixed,
            #fff7fb;
          overflow-x: hidden;
        }

        .jeconiahjireh-hero {
          min-height: 100dvh;
          display: grid;
          align-items: center;
          padding: 2rem 0 3rem;
        }

        .jeconiahjireh-shell {
          display: grid;
          grid-template-columns: minmax(0, 0.82fr) minmax(360px, 1fr);
          gap: clamp(1.25rem, 4vw, 3rem);
          align-items: center;
          max-width: 1180px;
          margin: 0 auto;
        }

        .jeconiahjireh-intro {
          position: relative;
          display: grid;
          gap: 1rem;
          align-content: center;
          min-height: 520px;
          padding: clamp(1.25rem, 4vw, 2.5rem);
          border: 1px solid rgba(255, 152, 196, 0.32);
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 28px 70px -48px rgba(141, 69, 114, 0.72);
          backdrop-filter: blur(8px);
        }

        .jeconiahjireh-kicker {
          width: fit-content;
          margin: 0;
          padding: 0.45rem 0.7rem;
          color: #8a3b70;
          font-family: var(--admin-font-body, system-ui, sans-serif);
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          border: 1px solid rgba(255, 136, 189, 0.32);
          border-radius: 999px;
          background: #fff6fb;
        }

        .jeconiahjireh-shell h1 {
          margin: 0;
          max-width: 9ch;
          color: #5f315f;
          font-size: clamp(3.4rem, 9vw, 7rem);
          line-height: 0.86;
          text-wrap: balance;
          text-shadow: 0 8px 0 rgba(255, 210, 232, 0.6);
        }

        .jeconiahjireh-copy {
          max-width: 38rem;
          margin: 0;
          color: #6d536d;
          font-size: clamp(1.05rem, 1.7vw, 1.28rem);
          line-height: 1.7;
        }

        .jeconiahjireh-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          margin-top: 0.4rem;
        }

        .jeconiahjireh-badges span {
          display: inline-flex;
          align-items: center;
          min-height: 40px;
          padding: 0.45rem 0.78rem;
          border: 1px solid rgba(129, 87, 202, 0.18);
          border-radius: 999px;
          color: #5d4775;
          background: linear-gradient(135deg, #fff, #f7f0ff);
          font-family: var(--admin-font-body, system-ui, sans-serif);
          font-size: 0.86rem;
          font-weight: 800;
          box-shadow: 0 12px 24px -20px rgba(96, 52, 132, 0.65);
        }

        .jeconiahjireh-sticker {
          position: absolute;
          pointer-events: none;
        }

        .jeconiahjireh-sticker--star {
          top: 1.1rem;
          right: 1.3rem;
          width: 52px;
          height: 52px;
          background: #ffe68f;
          clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 92%, 50% 70%, 21% 92%, 32% 57%, 2% 35%, 39% 35%);
          filter: drop-shadow(0 12px 12px rgba(167, 111, 33, 0.16));
          transform: rotate(10deg);
        }

        .jeconiahjireh-sticker--flower {
          right: 2rem;
          bottom: 1.3rem;
          width: 58px;
          height: 58px;
          border-radius: 999px;
          background:
            radial-gradient(circle at center, #ffe78f 0 18%, transparent 19%),
            radial-gradient(circle at 50% 6%, #ff9dcc 0 20%, transparent 21%),
            radial-gradient(circle at 94% 50%, #ff9dcc 0 20%, transparent 21%),
            radial-gradient(circle at 50% 94%, #ff9dcc 0 20%, transparent 21%),
            radial-gradient(circle at 6% 50%, #ff9dcc 0 20%, transparent 21%);
          opacity: 0.88;
          transform: rotate(-12deg);
        }

        .jeconiahjireh-chat-stage {
          position: relative;
          padding: clamp(0.7rem, 2vw, 1rem);
          border: 1px solid rgba(255, 165, 201, 0.34);
          border-radius: 28px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 245, 250, 0.86)),
            repeating-linear-gradient(45deg, rgba(255, 216, 233, 0.34) 0 10px, rgba(255, 255, 255, 0.34) 10px 20px);
          box-shadow: 0 26px 80px -48px rgba(111, 61, 119, 0.78);
          backdrop-filter: blur(10px);
        }

        .jeconiahjireh-ribbon {
          position: absolute;
          top: -16px;
          left: 50%;
          width: 150px;
          height: 34px;
          border-radius: 999px 999px 12px 12px;
          background: linear-gradient(135deg, #ff8fbe, #ffc6df);
          box-shadow: 0 14px 24px -18px rgba(129, 45, 92, 0.85);
          transform: translateX(-50%) rotate(-1deg);
          z-index: 2;
        }

        .jeconiahjireh-ribbon::before,
        .jeconiahjireh-ribbon::after {
          content: "";
          position: absolute;
          top: 8px;
          width: 42px;
          height: 28px;
          border-radius: 50% 50% 42% 42%;
          background: #ffacd0;
        }

        .jeconiahjireh-ribbon::before {
          left: -22px;
          transform: rotate(-24deg);
        }

        .jeconiahjireh-ribbon::after {
          right: -22px;
          transform: rotate(24deg);
        }

        .jeconiahjireh-page .portfolio-chatbot-widget-wrap--embedded {
          width: 100%;
        }

        .jeconiahjireh-page .portfolio-chatbot-card {
          border: 1px solid rgba(255, 159, 199, 0.44) !important;
          border-radius: 22px;
          background:
            linear-gradient(180deg, rgba(255, 252, 254, 0.96), rgba(255, 247, 251, 0.98));
          box-shadow: 0 22px 58px -40px rgba(83, 47, 92, 0.72) !important;
        }

        .jeconiahjireh-page .portfolio-chatbot-header {
          color: #593058;
          background:
            linear-gradient(135deg, rgba(255, 212, 231, 0.96), rgba(214, 232, 255, 0.96) 55%, rgba(219, 250, 231, 0.96));
        }

        .jeconiahjireh-page .portfolio-chatbot-avatar {
          color: #8a3b70;
          background: rgba(255, 255, 255, 0.74);
          border-color: rgba(255, 255, 255, 0.88);
        }

        .jeconiahjireh-page .portfolio-chatbot-subtitle {
          color: #795d78;
          opacity: 1;
        }

        .jeconiahjireh-page .portfolio-chatbot-meta {
          background: #fff7fb;
          border-bottom-color: rgba(255, 184, 214, 0.5);
        }

        .jeconiahjireh-page .portfolio-chatbot-status__dot {
          background: #ff86ba;
          box-shadow: 0 0 0 4px rgba(255, 134, 186, 0.18);
        }

        .jeconiahjireh-page .portfolio-chatbot-bubble--assistant {
          border-color: rgba(255, 168, 204, 0.38);
          background: #ffffff;
        }

        .jeconiahjireh-page .portfolio-chatbot-bubble--user,
        .jeconiahjireh-page .portfolio-chatbot-card .btn-primary {
          background: linear-gradient(135deg, #a65ac2, #ff7db7);
          border-color: #a65ac2;
        }

        .jeconiahjireh-page .portfolio-chatbot-input-shell {
          border-color: rgba(255, 144, 191, 0.42);
          border-radius: 22px;
        }

        .jeconiahjireh-page .portfolio-chatbot-textarea {
          border-radius: 22px;
        }

        @media (max-width: 991.98px) {
          .jeconiahjireh-page {
            background-attachment: scroll;
          }

          .jeconiahjireh-shell {
            grid-template-columns: 1fr;
            max-width: 760px;
          }

          .jeconiahjireh-intro {
            min-height: 0;
          }

          .jeconiahjireh-shell h1 {
            max-width: 100%;
          }
        }

        @media (max-width: 575.98px) {
          .jeconiahjireh-hero {
            padding: 1rem 0 1.5rem;
          }

          .jeconiahjireh-intro {
            border-radius: 22px;
            padding: 1.1rem;
          }

          .jeconiahjireh-shell h1 {
            font-size: clamp(3rem, 18vw, 4.35rem);
            text-shadow: 0 5px 0 rgba(255, 210, 232, 0.64);
          }

          .jeconiahjireh-copy {
            font-size: 1rem;
          }

          .jeconiahjireh-chat-stage {
            padding: 0.45rem;
            border-radius: 18px;
          }

          .jeconiahjireh-ribbon {
            width: 118px;
          }
        }
      `}</style>
    </main>
  );
}
