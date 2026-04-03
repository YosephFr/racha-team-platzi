'use client'

import { Plus, Trash2, MessageSquare, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ChatDrawer({
  open,
  onClose,
  conversations,
  activeId,
  onNewChat,
  onSelect,
  onDelete,
}) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[61]" onClick={onClose} />
      <aside className="fixed top-0 left-0 bottom-0 w-72 bg-card z-[62] flex flex-col shadow-elevated">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-foreground">Conversaciones</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:bg-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pb-3">
          <button
            onClick={() => {
              onNewChat()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/10 text-accent-dim font-medium text-sm transition-colors active:bg-accent/20"
          >
            <Plus size={18} />
            Nueva conversacion
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none px-3 pb-6">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted text-sm">
              <MessageSquare size={24} className="mb-2 opacity-50" />
              <span>Sin conversaciones</span>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelect(conv.id)
                    onClose()
                  }}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors',
                    conv.id === activeId ? 'bg-accent/10' : 'hover:bg-surface active:bg-elevated'
                  )}
                >
                  <MessageSquare
                    size={16}
                    className={cn(
                      'flex-shrink-0',
                      conv.id === activeId ? 'text-accent-dim' : 'text-muted'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        'text-sm truncate block',
                        conv.id === activeId ? 'text-accent-dim font-medium' : 'text-foreground'
                      )}
                    >
                      {conv.title}
                    </span>
                    {conv.last_message && (
                      <span className="text-xs text-muted truncate block mt-0.5">
                        {conv.last_message.slice(0, 40)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(conv.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-all flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
