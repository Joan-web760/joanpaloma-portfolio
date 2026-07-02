'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import MarkdownContent from '@/components/MarkdownContent'

const MAX_STORED_MESSAGES = 30
const MAX_TEXTAREA_HEIGHT = 180
const DESKTOP_BREAKPOINT = 990

export default function ChatbotWidget({
  title = 'Portfolio Assistant',
  subtitle = 'Services and availability guide',
  apiPath = '/api/chatbot',
  model = '',
  projectName = 'Joan Paloma Portfolio',
  systemPrompt = `
You are Joan Paloma's portfolio assistant.
You are speaking about Joan in third person, not as Joan herself.
Help clients, recruiters, and collaborators quickly understand her virtual assistant services, skills, portfolio, experience, pricing, and how to contact or hire her.
Keep answers clear, professional, and conversion-focused.
Recommend the most relevant services or strengths based on the visitor's needs.
Always refer to Joan as "Joan", "she", or "her" instead of "I", "me", or "my".
`,
  contextConfig = [],
  placeholder = 'Ask about services, experience, pricing, or availability...',
  initialOpen = false,
  displayMode = 'floating',
  position = 'bottom-right',
  buttonLabel = 'Send Message',
  statusLabel = 'Client and recruiter assistant',
  showUsageLimit = true,
  allowBringYourOwnKey = false,
  apiKeyStorageKey = 'portfolio_chatbot_ollama_api_key_v1',
  apiKeyLabel = 'Ollama API key',
  apiKeyPlaceholder = 'ollama_...',
  dailyMessageLimit = 20,
  usageStorageKey = 'portfolio_chatbot_daily_usage_v3',
  conversationStorageKey = 'portfolio_chatbot_conversation_v3',
  openStorageKey = 'portfolio_chatbot_open_v3',
  proactiveGreetingStorageKey = 'portfolio_chatbot_proactive_greeting_seen_v1',
  proactiveGreetingDelay = 1400,
  proactiveGreetingMessage = "Hi! Need a quick reason to hire Joan or see which services fit your needs?",
  proactiveFollowUpDelay = 1800,
  proactiveFollowUpMessage = "Would you like me to summarize Joan's services, skills, pricing, or how to contact her?",
  proactiveBubbleSequence = null,
  welcomeMessage = `Hi! This is Joan Paloma's portfolio assistant.

Joan helps clients with virtual assistant support, admin work, organization, and business operations.

What would you like to do?
- Hire Joan
- See her services
- Ask a question`,
  welcomeActions = [
    'Hire Joan',
    'See her services',
    'Ask a question',
  ],
  quickPrompts = [
    'Introduce Joan Paloma in 3 concise points.',
    'What services does she offer?',
    'What are her strongest skills?',
    'Show me her portfolio highlights.',
    'Is she available for freelance or full-time work?',
    'How can I contact or hire her?',
  ],
  leadPrompts = [
    'I need admin support.',
    'I need inbox or calendar help.',
    'I need customer support help.',
    'Help me choose a service package.',
  ],
}) {
  const textareaId = useId()

  const [open, setOpen] = useState(false)
  const [isOpenReady, setIsOpenReady] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [dailyUsage, setDailyUsage] = useState(0)
  const [limitReached, setLimitReached] = useState(false)
  const [error, setError] = useState('')
  const [ollamaApiKey, setOllamaApiKey] = useState('')
  const [rememberApiKey, setRememberApiKey] = useState(false)
  const [suggestedPromptIndex, setSuggestedPromptIndex] = useState(0)
  const [visibleProactiveBubbles, setVisibleProactiveBubbles] = useState([])

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const openRef = useRef(false)
  const isEmbedded = displayMode === 'embedded'

  const welcomeActionPromptMap = useMemo(
    () => ({
      'Hire Joan':
        'I want to hire Joan Paloma. What services does she offer and how can I get started?',
      'See her services':
        "Show me Joan Paloma's most relevant services and strengths.",
      'Ask a question':
        'Give me a quick overview of Joan Paloma and what she can help with.',
    }),
    []
  )

  const proactiveSequence = useMemo(() => {
    if (Array.isArray(proactiveBubbleSequence) && proactiveBubbleSequence.length) {
      return proactiveBubbleSequence
        .map((item, index) => ({
          id: item.id || `proactive-sequence-${index}`,
          eyebrow: item.eyebrow || (index === 0 ? 'Hi!' : 'Quick question'),
          content: item.content || '',
          delay:
            Number.isFinite(Number(item.delay)) && Number(item.delay) >= 0
              ? Number(item.delay)
              : index === 0
                ? proactiveGreetingDelay
                : proactiveFollowUpDelay,
        }))
        .filter((item) => item.content)
    }

    return [
      {
        id: 'proactive-greeting',
        eyebrow: 'Hi!',
        content: proactiveGreetingMessage,
        delay: proactiveGreetingDelay,
      },
      {
        id: 'proactive-follow-up',
        eyebrow: 'Quick question',
        content: proactiveFollowUpMessage,
        delay: proactiveFollowUpDelay,
      },
    ].filter((item) => item.content)
  }, [
    proactiveBubbleSequence,
    proactiveFollowUpDelay,
    proactiveFollowUpMessage,
    proactiveGreetingDelay,
    proactiveGreetingMessage,
  ])

  const getResponsiveDefaultOpenState = useCallback(() => {
    if (isEmbedded) return true
    if (typeof window === 'undefined') return false
    return window.innerWidth >= DESKTOP_BREAKPOINT ? initialOpen : false
  }, [initialOpen, isEmbedded])

  const addVisibleProactiveBubble = useCallback((nextBubble) => {
    setVisibleProactiveBubbles((prev) => {
      if (prev.some((bubble) => bubble.id === nextBubble.id)) return prev
      return [...prev, nextBubble].slice(-3)
    })
  }, [])

  useEffect(() => {
    try {
      const savedConversation = localStorage.getItem(conversationStorageKey)

      if (savedConversation) {
        const parsed = JSON.parse(savedConversation)
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed.slice(-MAX_STORED_MESSAGES))
          return
        }
      }
    } catch { }

    setMessages([{ id: 'welcome', role: 'assistant', content: welcomeMessage }])
  }, [conversationStorageKey, welcomeMessage])

  useEffect(() => {
    if (!allowBringYourOwnKey) return

    try {
      const savedKey = localStorage.getItem(apiKeyStorageKey)
      if (savedKey) {
        setOllamaApiKey(savedKey)
        setRememberApiKey(true)
      }
    } catch { }
  }, [allowBringYourOwnKey, apiKeyStorageKey])

  useEffect(() => {
    if (!allowBringYourOwnKey) return

    try {
      if (rememberApiKey && ollamaApiKey.trim()) {
        localStorage.setItem(apiKeyStorageKey, ollamaApiKey.trim())
      } else {
        localStorage.removeItem(apiKeyStorageKey)
      }
    } catch { }
  }, [allowBringYourOwnKey, apiKeyStorageKey, ollamaApiKey, rememberApiKey])

  useEffect(() => {
    try {
      localStorage.setItem(
        conversationStorageKey,
        JSON.stringify(messages.slice(-MAX_STORED_MESSAGES))
      )
    } catch { }
  }, [messages, conversationStorageKey])

  useEffect(() => {
    try {
      const savedOpenState = localStorage.getItem(openStorageKey)

      if (savedOpenState !== null) {
        setOpen(savedOpenState === 'true')
      } else {
        setOpen(getResponsiveDefaultOpenState())
      }
    } catch {
      setOpen(getResponsiveDefaultOpenState())
    } finally {
      setIsOpenReady(true)
    }
  }, [openStorageKey, getResponsiveDefaultOpenState])

  useEffect(() => {
    if (!isOpenReady || isEmbedded) return

    try {
      localStorage.setItem(openStorageKey, String(open))
    } catch { }
  }, [open, openStorageKey, isOpenReady, isEmbedded])

  useEffect(() => {
    openRef.current = isEmbedded || open
  }, [open, isEmbedded])

  useEffect(() => {
    if (!isOpenReady || proactiveSequence.length === 0 || messages.length === 0) {
      return undefined
    }

    let alreadySeen = false

    try {
      alreadySeen = sessionStorage.getItem(proactiveGreetingStorageKey) === 'true'
    } catch { }

    if (alreadySeen) return undefined

    try {
      sessionStorage.setItem(proactiveGreetingStorageKey, 'true')
    } catch { }

    let elapsed = 0
    const timers = proactiveSequence.map((bubble) => {
      elapsed += bubble.delay
      return window.setTimeout(() => {
        setMessages((prev) => {
          const messageId = `proactive-${bubble.id}`
          if (prev.some((msg) => msg.id === messageId)) return prev

          return [
            ...prev,
            {
              id: messageId,
              role: 'assistant',
              content: bubble.content,
            },
          ].slice(-MAX_STORED_MESSAGES)
        })

        if (!openRef.current) {
          addVisibleProactiveBubble(bubble)
        }
      }, elapsed)
    })

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [
    isOpenReady,
    messages.length,
    proactiveGreetingStorageKey,
    proactiveSequence,
    addVisibleProactiveBubble,
  ])

  useEffect(() => {
    if (isEmbedded || open) {
      setVisibleProactiveBubbles([])
    }
  }, [open, isEmbedded])

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)

    try {
      const savedUsage = localStorage.getItem(usageStorageKey)

      if (!savedUsage) {
        localStorage.setItem(
          usageStorageKey,
          JSON.stringify({ date: today, count: 0 })
        )
        setDailyUsage(0)
        setLimitReached(false)
        return
      }

      const parsed = JSON.parse(savedUsage)

      if (parsed?.date !== today) {
        localStorage.setItem(
          usageStorageKey,
          JSON.stringify({ date: today, count: 0 })
        )
        setDailyUsage(0)
        setLimitReached(false)
        return
      }

      const count = Number(parsed?.count || 0)
      setDailyUsage(count)
      setLimitReached(showUsageLimit && count >= dailyMessageLimit)
    } catch {
      localStorage.setItem(
        usageStorageKey,
        JSON.stringify({ date: today, count: 0 })
      )
      setDailyUsage(0)
      setLimitReached(false)
    }
  }, [dailyMessageLimit, usageStorageKey, showUsageLimit])

  useEffect(() => {
    if (!isEmbedded && !open) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open, isEmbedded])

  useEffect(() => {
    autoResizeTextarea()
  }, [input])

  useEffect(() => {
    const suggestions = [...quickPrompts, ...leadPrompts].filter(Boolean)
    if (suggestions.length <= 1) return undefined

    const timer = window.setInterval(() => {
      setSuggestedPromptIndex((prev) => (prev + 1) % suggestions.length)
    }, 15000)

    return () => window.clearInterval(timer)
  }, [quickPrompts, leadPrompts])

  function autoResizeTextarea() {
    const el = textareaRef.current
    if (!el) return

    el.style.height = '0px'
    const nextHeight = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)
    el.style.height = `${nextHeight}px`
    el.style.overflowY =
      el.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden'
  }

  function increaseDailyUsage() {
    const today = new Date().toISOString().slice(0, 10)
    const nextCount = dailyUsage + 1

    try {
      localStorage.setItem(
        usageStorageKey,
        JSON.stringify({ date: today, count: nextCount })
      )
    } catch { }

    setDailyUsage(nextCount)
    setLimitReached(nextCount >= dailyMessageLimit)
  }

  function applyQuickPrompt(prompt) {
    if (loading || limitReached) return
    setInput(prompt)
    if (!isEmbedded) {
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }

  function openChatbotFromGreeting() {
    setVisibleProactiveBubbles([])
    setOpen(true)
  }

  async function sendMessage(customText) {
    const text = String(customText ?? input).trim()

    if (!text || loading || limitReached) return

    if (allowBringYourOwnKey && !ollamaApiKey.trim()) {
      setError('Enter your Ollama API key before sending a message.')
      return
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    }

    const assistantPlaceholder = {
      id: `assistant-${Date.now()}-pending`,
      role: 'assistant',
      content: '',
    }

    const historyForApi = [...messages, userMessage]
    const nextMessages = [...historyForApi, assistantPlaceholder].slice(
      -MAX_STORED_MESSAGES
    )

    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError('')
    if (showUsageLimit) {
      increaseDailyUsage()
    }

    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          projectName,
          systemPrompt,
          contextConfig,
          ollamaApiKey: allowBringYourOwnKey ? ollamaApiKey.trim() : '',
          pageUrl:
            typeof window !== 'undefined' ? window.location.href : '',
          messages: historyForApi.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      })

      if (res.status === 429) {
        throw new Error(
          'Rate limit reached. Please wait about a minute and try again.'
        )
      }

      if (!res.ok || !res.body) {
        let message = 'Failed to fetch chatbot response.'
        try {
          const json = await res.json()
          if (json?.error) message = json.error
        } catch { }
        throw new Error(message)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let done = false

      while (!done) {
        const result = await reader.read()
        done = result.done

        if (result.value) {
          const chunk = decoder.decode(result.value, { stream: true })
          fullText += chunk
        }
      }

      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          id: assistantPlaceholder.id,
          role: 'assistant',
          content: fullText.trim()
            ? fullText
            : 'Sorry, I could not generate a response right now.',
        }
        return updated.slice(-MAX_STORED_MESSAGES)
      })
    } catch (err) {
      const message =
        err?.message || 'Sorry, something went wrong. Please try again later.'

      setError(message)

      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          id: assistantPlaceholder.id,
          role: 'assistant',
          content: message,
        }
        return updated.slice(-MAX_STORED_MESSAGES)
      })
    } finally {
      setLoading(false)
      requestAnimationFrame(() => {
        if (!isEmbedded) {
          textareaRef.current?.focus()
        }
        autoResizeTextarea()
      })
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const remainingCount = Math.max(dailyMessageLimit - dailyUsage, 0)

  const canSend = useMemo(() => {
    return !loading && !limitReached && Boolean(input.trim())
  }, [loading, limitReached, input])

  const rotatingSuggestions = useMemo(
    () => [...quickPrompts, ...leadPrompts].filter(Boolean),
    [quickPrompts, leadPrompts]
  )

  const suggestedPrompt =
    rotatingSuggestions[suggestedPromptIndex] ||
    'Introduce Joan Paloma in 3 concise points.'

  const positionClass =
    position === 'bottom-left' ? 'start-0 ms-3' : 'end-0 me-3'
  const isChatOpen = isEmbedded || open

  if (!isOpenReady) {
    return null
  }

  return (
    <>
      <div
        className={`${isEmbedded ? 'portfolio-chatbot-widget-wrap--embedded' : `position-fixed ${positionClass}`} portfolio-chatbot-widget-wrap`}
        style={isEmbedded ? undefined : { bottom: '20px', zIndex: 1080 }}
      >
        {!isChatOpen && (
          <>
            {visibleProactiveBubbles.length > 0 && (
              <div className="portfolio-chatbot-proactive-stack">
                {visibleProactiveBubbles.map((bubble) => (
                  <button
                    key={bubble.id}
                    type="button"
                    className="portfolio-chatbot-proactive border-0 shadow"
                    onClick={openChatbotFromGreeting}
                    aria-label="Open portfolio assistant greeting"
                  >
                    <span className="portfolio-chatbot-proactive__hi">
                      {bubble.eyebrow}
                    </span>
                    <span>{bubble.content}</span>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              className="portfolio-chatbot-launcher btn border-0 shadow-lg"
              onClick={() => {
                setVisibleProactiveBubbles([])
                setOpen(true)
              }}
              aria-label="Open portfolio assistant"
            >
              <span className="portfolio-chatbot-launcher__icon">
                <i className="fa-solid fa-briefcase" aria-hidden="true" />
              </span>
              <span>
                <span className="portfolio-chatbot-launcher__eyebrow">
                  Tap to open the chatbot
                </span>
                <span className="portfolio-chatbot-launcher__text">
                  Ask Joan&apos;s assistant about services, skills, or hiring
                </span>
              </span>
            </button>
          </>
        )}

        {isChatOpen && (
          <div className="portfolio-chatbot-card card border-0 shadow-lg">
            <div className="portfolio-chatbot-header">
              <div className="portfolio-chatbot-header__left">
                <div className="portfolio-chatbot-avatar">
                  <i className="fa fa-user" aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <div className="portfolio-chatbot-title">{title}</div>
                  <div className="portfolio-chatbot-subtitle">{subtitle}</div>
                </div>
              </div>

              {!isEmbedded && (
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-light border-0 portfolio-chatbot-close"
                  onClick={() => setOpen(false)}
                  aria-label="Close chatbot"
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </div>
              )}
            </div>

            <div className="portfolio-chatbot-meta">
              <div className="portfolio-chatbot-status">
                <span className="portfolio-chatbot-status__dot" />
                {statusLabel}
              </div>
              {showUsageLimit && (
                <div className="portfolio-chatbot-usage">
                  {remainingCount} question{remainingCount === 1 ? '' : 's'} left
                  today
                </div>
              )}
            </div>

            <div className="portfolio-chatbot-body">
              {messages.map((msg) => {
                const isUser = msg.role === 'user'
                const isEmptyAssistantPlaceholder =
                  msg.role === 'assistant' && !String(msg.content || '').trim()
                const showWelcomeActions =
                  msg.id === 'welcome' &&
                  msg.role === 'assistant' &&
                  Array.isArray(welcomeActions) &&
                  welcomeActions.length > 0

                if (isEmptyAssistantPlaceholder) {
                  return null
                }

                return (
                  <div
                    key={msg.id || `${msg.role}-${msg.content}`}
                    className={`d-flex mb-3 ${isUser ? 'justify-content-end' : 'justify-content-start'
                      }`}
                  >
                    <div
                      className={`portfolio-chatbot-bubble ${isUser
                          ? 'portfolio-chatbot-bubble--user'
                          : 'portfolio-chatbot-bubble--assistant'
                        }`}
                    >
                      <div className="portfolio-chatbot-bubble__label">
                        {isUser ? 'You' : 'Assistant'}
                      </div>

                      {isUser ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </div>
                      ) : (
                        <>
                          <MarkdownContent className="portfolio-chatbot-markdown">
                            {msg.content || ''}
                          </MarkdownContent>

                          {showWelcomeActions && (
                            <div className="portfolio-chatbot-chip-row mt-2">
                              {welcomeActions.map((action) => (
                                <button
                                  key={action}
                                  type="button"
                                  className="portfolio-chatbot-chip portfolio-chatbot-chip--inline"
                                  onClick={() =>
                                    applyQuickPrompt(
                                      welcomeActionPromptMap[action] || action
                                    )
                                  }
                                  disabled={loading || limitReached}
                                >
                                  {action}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}

              {loading && (
                <div className="d-flex justify-content-start mb-2">
                  <div className="portfolio-chatbot-bubble portfolio-chatbot-bubble--assistant">
                    <div className="portfolio-chatbot-bubble__label">
                      Assistant
                    </div>
                    <div className="portfolio-chatbot-typing">
                      Preparing a response...
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="portfolio-chatbot-footer">
              {error && (
                <div className="alert alert-danger py-2 px-3 small mb-2">
                  {error}
                </div>
              )}

              {showUsageLimit && limitReached && (
                <div className="alert alert-warning py-2 px-3 small mb-2">
                  Daily chat limit reached. Please come back tomorrow.
                </div>
              )}

              <label htmlFor={textareaId} className="visually-hidden">
                Ask the portfolio assistant
              </label>

              {allowBringYourOwnKey && (
                <div className="portfolio-chatbot-key-panel">
                  <label className="portfolio-chatbot-key-label" htmlFor={`${textareaId}-api-key`}>
                    {apiKeyLabel}
                  </label>
                  <div className="portfolio-chatbot-key-input-row">
                    <input
                      id={`${textareaId}-api-key`}
                      className="form-control portfolio-chatbot-key-input"
                      type="password"
                      placeholder={apiKeyPlaceholder}
                      value={ollamaApiKey}
                      onChange={(e) => setOllamaApiKey(e.target.value)}
                      autoComplete="off"
                    />
                    <label className="portfolio-chatbot-key-remember">
                      <input
                        type="checkbox"
                        checked={rememberApiKey}
                        onChange={(e) => setRememberApiKey(e.target.checked)}
                      />
                      <span>Remember</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="portfolio-chatbot-prompt-dock">
                <span className="portfolio-chatbot-prompt-dock__label">
                  Suggested to ask
                </span>
                <button
                  type="button"
                  className="portfolio-chatbot-chip portfolio-chatbot-chip--soft portfolio-chatbot-chip--single"
                  onClick={() => applyQuickPrompt(suggestedPrompt)}
                  disabled={loading || limitReached}
                >
                  {suggestedPrompt}
                </button>
              </div>

              <div className="portfolio-chatbot-input-shell">
                <textarea
                  id={textareaId}
                  ref={textareaRef}
                  className="form-control portfolio-chatbot-textarea"
                  rows="2"
                  placeholder={placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading || limitReached}
                  maxLength={1200}
                />
              </div>

              <div className="portfolio-chatbot-footer__bottom">
                <div className="d-flex gap-2 portfolio-chatbot-footer__actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => sendMessage()}
                    disabled={!canSend}
                  >
                    {loading ? 'Sending...' : buttonLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .portfolio-chatbot-widget-wrap {
          --chatbot-ink: #111827;
          --chatbot-deep: #00040d;
          --chatbot-primary: #0f62fe;
          --chatbot-primary-dark: #073b9a;
          --chatbot-sky: #2f80ed;
          --chatbot-gold: #8a6d3b;
          --chatbot-cream: #fbfaf7;
          --chatbot-cream-2: #f2ede4;
          --chatbot-border: rgba(17, 24, 39, 0.16);
        }

        .portfolio-chatbot-widget-wrap--embedded {
          position: relative;
          width: min(920px, 100%);
          margin: 0 auto;
          z-index: 1;
        }

        .portfolio-chatbot-card {
          width: 448px;
          max-width: calc(100vw - 24px);
          height: min(680px, calc(100vh - 32px));
          border-radius: 18px;
          overflow: hidden;
          background:
            radial-gradient(
              circle at top right,
              rgba(47, 128, 237, 0.16),
              transparent 28%
            ),
            linear-gradient(180deg, var(--chatbot-cream) 0%, #ffffff 100%);
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(12px);
        }

        .portfolio-chatbot-widget-wrap--embedded .portfolio-chatbot-card {
          width: 100%;
          max-width: 100%;
          height: min(760px, calc(100dvh - 72px));
          min-height: 620px;
          border-radius: 8px;
          box-shadow: 0 26px 70px -46px rgba(17, 24, 39, 0.46) !important;
        }

        .portfolio-chatbot-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 18px 14px;
          color: #e9fff2;
          background: linear-gradient(
            135deg,
            #00040d 0%,
            var(--chatbot-primary-dark) 58%,
            var(--chatbot-primary) 100%
          );
        }

        .portfolio-chatbot-header__left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .portfolio-chatbot-avatar {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          letter-spacing: 0.04em;
          background: rgba(233, 255, 242, 0.16);
          border: 1px solid rgba(233, 255, 242, 0.3);
          flex-shrink: 0;
          box-shadow: inset 0 1px 0 rgba(233, 255, 242, 0.18);
          overflow: hidden;
        }

        .portfolio-chatbot-avatar .fa-user {
          font-size: 1.25rem;
        }

        .portfolio-chatbot-title {
          font-weight: 700;
          font-size: 15px;
          line-height: 1.2;
        }

        .portfolio-chatbot-subtitle {
          font-size: 12px;
          opacity: 0.82;
          margin-top: 3px;
        }

        .portfolio-chatbot-close {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .portfolio-chatbot-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 18px;
          font-size: 12px;
          border-bottom: 1px solid rgba(207, 233, 214, 0.9);
          background: rgba(246, 255, 249, 0.92);
        }

        .portfolio-chatbot-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--chatbot-ink);
          font-weight: 600;
        }

        .portfolio-chatbot-status__dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--chatbot-primary);
          box-shadow: 0 0 0 4px rgba(15, 98, 254, 0.16);
        }

        .portfolio-chatbot-usage {
          color: #4f6a5d;
          white-space: nowrap;
        }

        .portfolio-chatbot-chip-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: thin;
        }

        .portfolio-chatbot-prompt-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .portfolio-chatbot-prompt-grid--compact {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .portfolio-chatbot-chip {
          text-align: left;
          border: 1px solid rgba(30, 41, 59, 0.14);
          background: #fff;
          color: var(--chatbot-ink);
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 12px;
          line-height: 1.4;
          transition: all 0.2s ease;
          min-height: 52px;
        }

        .portfolio-chatbot-chip--inline {
          min-height: 0;
          white-space: nowrap;
          flex: 0 0 auto;
          padding: 9px 12px;
          border-radius: 999px;
        }

        .portfolio-chatbot-chip:hover:not(:disabled) {
          background: #f7fbff;
          border-color: rgba(15, 98, 254, 0.34);
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(15, 98, 254, 0.12);
        }

        .portfolio-chatbot-chip--soft {
          background: #eef5ff;
        }

        .portfolio-chatbot-chip:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .portfolio-chatbot-body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 18px;
          margin-top: 8px;
          background: linear-gradient(
            180deg,
            rgba(251, 250, 247, 0.72) 0%,
            rgba(255, 255, 255, 0.9) 100%
          );
        }

        .portfolio-chatbot-bubble {
          max-width: 88%;
          min-width: 0;
          padding: 12px 14px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.6;
          overflow-wrap: anywhere;
          box-shadow: 0 10px 28px rgba(15, 44, 30, 0.08);
        }

        .portfolio-chatbot-bubble__label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
          opacity: 0.72;
        }

        .portfolio-chatbot-bubble--assistant {
          background: #ffffff;
          border: 1px solid rgba(30, 41, 59, 0.14);
          color: var(--chatbot-ink);
          border-top-left-radius: 8px;
        }

        .portfolio-chatbot-bubble--user {
          background: linear-gradient(135deg, var(--chatbot-primary-dark), var(--chatbot-primary));
          color: #ffffff;
          border-top-right-radius: 8px;
        }

        .portfolio-chatbot-footer {
          padding: 14px 18px 18px;
          border-top: 1px solid rgba(207, 233, 214, 0.9);
          background: rgba(251, 250, 247, 0.96);
        }

        .portfolio-chatbot-prompt-dock {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .portfolio-chatbot-key-panel {
          display: grid;
          gap: 8px;
          margin-bottom: 12px;
          padding: 10px;
          border: 1px solid rgba(30, 41, 59, 0.12);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.78);
        }

        .portfolio-chatbot-key-label {
          font-family: var(--admin-font-body, system-ui, sans-serif);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--chatbot-primary-dark);
        }

        .portfolio-chatbot-key-input-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          align-items: center;
        }

        .portfolio-chatbot-key-input {
          min-height: 40px;
          border-radius: 12px;
          font-family: var(--admin-font-body, system-ui, sans-serif);
          font-size: 13px;
        }

        .portfolio-chatbot-key-remember {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 40px;
          margin: 0;
          padding: 0 10px;
          border-radius: 12px;
          border: 1px solid rgba(30, 41, 59, 0.14);
          background: #ffffff;
          color: #334155;
          font-family: var(--admin-font-body, system-ui, sans-serif);
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .portfolio-chatbot-prompt-dock__label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--chatbot-gold);
        }

        .portfolio-chatbot-chip--single {
          width: 100%;
          min-height: 0;
          padding: 10px 12px;
          border-radius: 14px;
        }

        .portfolio-chatbot-input-shell {
          border: 1px solid rgba(30, 41, 59, 0.14);
          border-radius: 18px;
          background: #fff;
          box-shadow: inset 0 1px 2px rgba(15, 44, 30, 0.05);
        }

        .portfolio-chatbot-textarea {
          resize: vertical;
          min-height: 112px;
          max-height: ${MAX_TEXTAREA_HEIGHT}px;
          border-radius: 18px;
          padding: 14px 15px;
          border: 0;
          box-shadow: none !important;
        }

        .portfolio-chatbot-footer__bottom {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .portfolio-chatbot-footer__actions {
          flex-wrap: wrap;
        }

        .portfolio-chatbot-card .btn-primary {
          color: #ffffff;
          background: linear-gradient(135deg, var(--chatbot-primary-dark), var(--chatbot-primary));
          border-color: var(--chatbot-primary-dark);
          font-weight: 700;
          box-shadow: 0 12px 22px -18px rgba(15, 98, 254, 0.7);
        }

        .portfolio-chatbot-card .btn-primary:hover:not(:disabled),
        .portfolio-chatbot-card .btn-primary:focus:not(:disabled) {
          color: #ffffff;
          background: linear-gradient(135deg, #052e7d, #0b5ed7);
          border-color: #052e7d;
        }

        .portfolio-chatbot-card .btn-primary:disabled {
          color: rgba(255, 255, 255, 0.82);
          background: #9bbcf4;
          border-color: #9bbcf4;
        }

        .portfolio-chatbot-close {
          color: var(--chatbot-primary-dark);
          background: rgba(233, 255, 242, 0.92);
        }

        .portfolio-chatbot-close:hover,
        .portfolio-chatbot-close:focus {
          color: #0b1a13;
          background: #ffffff;
        }

        .portfolio-chatbot-markdown table {
          font-size: 13px;
        }

        .portfolio-chatbot-launcher {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          border-radius: 999px;
          padding: 13px 17px;
          background: linear-gradient(135deg, #00040d 0%, #073b9a 58%, #0f62fe 100%);
          color: #ffffff;
          min-width: 312px;
          border: 1px solid rgba(255, 255, 255, 0.32) !important;
          box-shadow:
            0 22px 46px rgba(0, 4, 13, 0.32),
            0 0 0 4px rgba(15, 98, 254, 0.14) !important;
        }

        .portfolio-chatbot-launcher:hover,
        .portfolio-chatbot-launcher:focus {
          color: #ffffff;
          background: linear-gradient(135deg, #00040d 0%, #052e7d 58%, #0b5ed7 100%);
          transform: translateY(-1px);
        }

        .portfolio-chatbot-launcher__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
          flex-shrink: 0;
        }

        .portfolio-chatbot-launcher__eyebrow {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #cfe2ff;
          opacity: 1;
          margin-bottom: 2px;
        }

        .portfolio-chatbot-launcher__text {
          display: block;
          font-weight: 600;
          font-size: 14px;
          line-height: 1.3;
          color: #ffffff;
        }

        .portfolio-chatbot-proactive {
          display: block;
          width: min(360px, calc(100vw - 32px));
          padding: 12px 14px;
          border-radius: 18px 18px 6px 18px;
          color: #111827;
          text-align: left;
          font-size: 0.9rem;
          line-height: 1.35;
          background: #ffffff;
          border: 1px solid rgba(15, 98, 254, 0.2);
          box-shadow:
            0 18px 36px rgba(17, 24, 39, 0.16),
            0 0 0 3px rgba(15, 98, 254, 0.08);
          animation: chatbot-proactive-pop 0.34s ease-out;
        }

        .portfolio-chatbot-proactive-stack {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          margin: 0 0 10px auto;
        }

        .portfolio-chatbot-proactive__hi {
          display: block;
          margin-bottom: 2px;
          color: var(--chatbot-primary-dark);
          font-weight: 800;
        }

        @keyframes chatbot-proactive-pop {
          from {
            opacity: 0;
            transform: translate3d(0, 10px, 0) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        .portfolio-chatbot-typing {
          display: inline-flex;
          align-items: center;
          min-height: 18px;
          color: #4f6a5d;
          font-size: 13px;
          font-weight: 500;
        }

        .min-w-0 {
          min-width: 0;
        }

        @media (max-width: 767.98px) {
          .portfolio-chatbot-widget-wrap {
            left: 50% !important;
            right: auto !important;
            width: calc(100vw - 16px);
            max-width: calc(100vw - 16px);
            margin-right: 0 !important;
            margin-left: 0 !important;
            transform: translateX(-50%);
          }

          .portfolio-chatbot-widget-wrap--embedded {
            left: auto !important;
            right: auto !important;
            width: 100%;
            max-width: 100%;
            transform: none;
          }

          .portfolio-chatbot-card {
            width: calc(100vw - 16px);
            max-width: calc(100vw - 16px);
            height: min(620px, calc(100dvh - 96px));
            border-radius: 20px;
          }

          .portfolio-chatbot-widget-wrap--embedded .portfolio-chatbot-card {
            width: 100%;
            max-width: 100%;
            height: min(700px, calc(100dvh - 32px));
            min-height: 580px;
            border-radius: 8px;
          }

          .portfolio-chatbot-header {
            padding: 14px 14px 12px;
          }

          .portfolio-chatbot-meta {
            padding: 10px 14px;
            flex-direction: column;
            align-items: flex-start;
          }

          .portfolio-chatbot-body {
            padding: 14px;
            margin-top: 0;
          }

          .portfolio-chatbot-footer {
            padding: 12px 14px 14px;
          }

          .portfolio-chatbot-textarea {
            min-height: 88px;
          }

          .portfolio-chatbot-meta {
            flex-direction: column;
            align-items: flex-start;
          }

          .portfolio-chatbot-footer__bottom {
            flex-direction: column;
            align-items: stretch;
          }

          .portfolio-chatbot-footer__actions .btn {
            flex: 1 1 auto;
          }

          .portfolio-chatbot-launcher {
            width: 100%;
            min-width: 0;
            justify-content: flex-start;
            border-radius: 20px;
            padding: 14px 16px;
          }

          .portfolio-chatbot-proactive {
            width: 100%;
            max-width: 100%;
            margin-right: 0;
            border-radius: 18px 18px 18px 6px;
          }

          .portfolio-chatbot-proactive-stack {
            width: 100%;
            align-items: stretch;
          }
        }
      `}</style>
    </>
  )
}
