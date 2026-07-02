'use client'

import { usePathname } from 'next/navigation'
import ChatbotWidget from '@/components/chatbot/ChatbotWidget'

const hiddenChatbotRoutes = new Set(['/jeconiahjireh'])

export default function PublicChatbotGate(props) {
  const pathname = usePathname()
  const normalizedPathname = String(pathname || '').replace(/\/$/, '') || '/'

  if (hiddenChatbotRoutes.has(normalizedPathname)) {
    return null
  }

  return <ChatbotWidget {...props} />
}
