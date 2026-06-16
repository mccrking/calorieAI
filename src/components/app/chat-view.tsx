'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCalorieStore } from '@/store/calorie-store'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ChatView() {
  const { chatMessages, addChatMessage, isChatLoading, setIsChatLoading, setChatMessages } = useCalorieStore()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([{
        role: 'assistant',
        content: "Hi! 👋 I'm CalorieAI's nutrition assistant. I can help you with:\n\n• 🥗 Diet advice & meal suggestions\n• 📊 Understanding your macros\n• 🎯 Tips for hitting your goals\n• 🔄 Healthy food alternatives\n\nWhat would you like to know?"
      }])
    }
  }, [chatMessages.length, setChatMessages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatMessages])

  const sendMessage = async () => {
    if (!input.trim() || isChatLoading) return
    const userMsg = input.trim()
    setInput('')
    addChatMessage({ role: 'user', content: userMsg })
    setIsChatLoading(true)

    try {
      const messages = [...chatMessages, { role: 'user', content: userMsg }].map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) })
      const data = await res.json()
      if (data.success) addChatMessage({ role: 'assistant', content: typeof data.data === 'string' ? data.data : data.data?.message || 'No response' })
      else addChatMessage({ role: 'assistant', content: 'Sorry, I had an error. Please try again.' })
    } catch {
      addChatMessage({ role: 'assistant', content: 'Connection error. Please check your internet and try again.' })
    } finally {
      setIsChatLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">NutriBot</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">AI Assistant</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 custom-scrollbar">
        <div className="space-y-3 pb-4">
          <AnimatePresence>
            {chatMessages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border/50 rounded-tl-sm')}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isChatLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-primary" /></div>
              <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} /></div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Quick prompts */}
      {chatMessages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {['How much protein do I need?', 'Suggest a high-protein breakfast', 'What are healthy snack options?', 'How to hit my calorie goal?'].map(q => (
              <button key={q} onClick={() => { setInput(q) }} className="text-[11px] px-2.5 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors">{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-background">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage() }} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about nutrition..." disabled={isChatLoading} className="rounded-xl" />
          <Button type="submit" size="icon" className="rounded-xl h-10 w-10" disabled={!input.trim() || isChatLoading}>
            {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}