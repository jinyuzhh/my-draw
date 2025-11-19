import { useEffect, useRef } from "react"
import { useCanvas } from "../../store/CanvasProvider"
import { PixiCanvas } from "../canvas/PixiCanvas"
import type { InteractionMode } from "../../types/canvas"

export const CanvasArea = () => {
  const { state, setInteractionMode } = useCanvas()
  const prevModeRef = useRef<InteractionMode | null>(null)
  const spacePressedRef = useRef(false)
  const modeRef = useRef<InteractionMode>(state.interactionMode)

  useEffect(() => {
    modeRef.current = state.interactionMode
  }, [state.interactionMode])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return
      event.preventDefault()
      if (spacePressedRef.current) return
      spacePressedRef.current = true
      if (modeRef.current !== "pan") {
        prevModeRef.current = modeRef.current
        setInteractionMode("pan")
      } else {
        prevModeRef.current = null
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return
      event.preventDefault()
      spacePressedRef.current = false
      if (prevModeRef.current) {
        setInteractionMode(prevModeRef.current)
        prevModeRef.current = null
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [setInteractionMode])

  return (
    <main className="relative flex-1 overflow-hidden bg-canvas-background">
      <div className="canvas-grid absolute inset-3 rounded-[32px] border border-canvas-border bg-white/70 shadow-inner">
        <PixiCanvas />
      </div>
      <div className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3 rounded-full border border-canvas-border bg-white/70 px-4 py-2 text-xs font-medium text-slate-600 shadow-lg">
        <span>元素：{state.elements.length}</span>
        <span>已选：{state.selectedIds.length}</span>
      </div>
    </main>
  )
}
