import { useCallback, useEffect, useState } from 'react'
import { loadTemplates, saveTemplates } from '../lib/storage'
import type { LayoutTemplate } from '../types'

export function useTemplates() {
  const [templates, setTemplates] = useState<LayoutTemplate[]>(() => loadTemplates())

  useEffect(() => {
    saveTemplates(templates)
  }, [templates])

  const saveCurrentAsTemplate = useCallback(
    (name: string, snapshot: Omit<LayoutTemplate, 'id' | 'name' | 'createdAt'>) => {
      const trimmed = name.trim()
      if (!trimmed) return { ok: false as const, error: 'Enter a template name' }

      const template: LayoutTemplate = {
        id: `template-${crypto.randomUUID()}`,
        name: trimmed,
        createdAt: Date.now(),
        ...snapshot,
      }
      setTemplates((prev) => [template, ...prev])
      return { ok: true as const }
    },
    [],
  )

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { templates, saveCurrentAsTemplate, deleteTemplate }
}
