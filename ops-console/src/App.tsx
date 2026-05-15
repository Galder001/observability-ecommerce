import { useEffect, useState } from 'react'
import { Layout } from './components/Layout'
import { Overview } from './views/Overview'
import { Activity } from './views/Activity'
import { WorldMap } from './views/WorldMap'
import { Assistant } from './views/Assistant'
import { checkOllamaReady } from './lib/ollama'
import type { View } from './types'

export function App() {
  const [view, setView] = useState<View>('overview')
  const [ollamaReady, setOllamaReady] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    async function probe() {
      const ok = await checkOllamaReady()
      if (mounted) setOllamaReady(ok)
    }
    probe()
    const id = setInterval(probe, 30_000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  return (
    <Layout view={view} onChangeView={setView} ollamaReady={ollamaReady}>
      {view === 'overview' && <Overview />}
      {view === 'activity' && <Activity />}
      {view === 'worldmap' && <WorldMap />}
      {view === 'assistant' && <Assistant />}
    </Layout>
  )
}
