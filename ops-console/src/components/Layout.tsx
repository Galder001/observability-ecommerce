import { Activity, LayoutDashboard, MessagesSquare, Circle, Globe } from 'lucide-react'
import type { View } from '../types'

interface Props {
  view: View
  onChangeView: (v: View) => void
  children: React.ReactNode
  ollamaReady: boolean | null
}

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'worldmap', label: 'World Map', icon: Globe },
  { id: 'assistant', label: 'Copilot', icon: MessagesSquare },
] as const

export function Layout({ view, onChangeView, children, ollamaReady }: Props) {
  return (
    <div className="min-h-screen flex bg-litahi-bg">
      <aside className="w-60 border-r border-litahi-border bg-litahi-surface flex flex-col">
        <div className="p-5 border-b border-litahi-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-litahi-accent flex items-center justify-center font-bold text-white">
              L
            </div>
            <div>
              <div className="font-semibold leading-tight">Li Tahi+</div>
              <div className="text-xs text-litahi-muted">Ops Console</div>
            </div>
          </div>
        </div>
        <nav className="p-3 flex-1">
          {NAV.map((n) => {
            const Icon = n.icon
            const active = view === n.id
            return (
              <button
                key={n.id}
                onClick={() => onChangeView(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md mb-1 text-sm transition-colors ${
                  active
                    ? 'bg-litahi-accent text-white'
                    : 'text-litahi-muted hover:text-litahi-text hover:bg-litahi-bg'
                }`}
              >
                <Icon size={16} />
                {n.label}
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t border-litahi-border text-xs">
          <div className="flex items-center gap-2 text-litahi-muted">
            <Circle
              size={8}
              className={
                ollamaReady === true
                  ? 'fill-litahi-success text-litahi-success'
                  : ollamaReady === false
                  ? 'fill-litahi-danger text-litahi-danger'
                  : 'fill-litahi-muted text-litahi-muted'
              }
            />
            Ollama {ollamaReady === true ? 'conectado' : ollamaReady === false ? 'offline' : '...'}
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
