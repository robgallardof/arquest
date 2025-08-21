'use client'

import { Sidebar } from '@/components/sidebar'
import { Workspace } from '@/components/workspace'
import { ImportExport } from '@/components/ui/import-export'
import { useEffect } from 'react'
import { gsap } from 'gsap'

export default function Home(): JSX.Element {
  useEffect(() => {
    gsap.fromTo(
      '#rootfade',
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
    )
  }, [])

  return (
    <div
      id="rootfade"
      className={`
        h-dvh min-h-dvh w-full
        overflow-hidden
        grid grid-rows-[auto_1fr]
        md:grid-rows-[auto_1fr] md:grid-cols-[18rem_1fr]
      `}
    >
      {/* Sidebar: occupies the first column on md+ and the first row on mobile */}
      <Sidebar />

      {/* Right panel: sticky header + content that manages its own scrolling */}
      <div className="min-w-0 min-h-0 flex flex-col">
        {/* Top bar: sticky (does not scroll) */}
        <div className="sticky top-0 z-10 border-b p-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold truncate">ThunderPost</div>
            <div className="shrink-0">
              <ImportExport />
            </div>
          </div>
        </div>

        {/* Main content: let Workspace control its own scrollable areas */}
        <div className="min-h-0 flex-1 min-w-0 overflow-hidden">
          <Workspace />
        </div>
      </div>
    </div>
  )
}
