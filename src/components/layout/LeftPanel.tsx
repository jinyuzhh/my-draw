import { useState, type ChangeEvent, type ReactNode } from "react"
import { useCanvas } from "../../store/CanvasProvider"
import type { ShapeVariant } from "../../types/canvas"

const shapes: { label: string; shape: ShapeVariant }[] = [
  { label: "矩形", shape: "rectangle" },
  { label: "圆形", shape: "circle" },
  { label: "三角形", shape: "triangle" },
]

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3 rounded-2xl border border-canvas-border bg-white/90 p-4 shadow-sm">
    <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    {children}
  </section>
)

export const LeftPanel = () => {
  const { addShape, addText, addImage } = useCanvas()
  const [textValue, setTextValue] = useState("标题文案 / 支持多行输入")

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (!reader.result || typeof reader.result !== "string") return
      const dataUrl = reader.result
      const image = new Image()
      image.crossOrigin = "anonymous"
      image.onload = () => {
        const maxWidth = 480
        const scale = Math.min(1, maxWidth / image.width)
        addImage(dataUrl, {
          width: image.width * scale,
          height: image.height * scale,
        })
      }
      image.onerror = () => {
        console.error("无法加载图片")
      }
      image.src = dataUrl
    }
    reader.readAsDataURL(file)
    event.target.value = ""
  }

  return (
    <aside className="flex w-72 flex-col gap-4 border-r border-canvas-border bg-white/60 p-4">
      <Section title="快速插入图形">
        <div className="grid grid-cols-2 gap-2">
          {shapes.map((shape) => (
            <button
              key={shape.shape}
              type="button"
              onClick={() => addShape(shape.shape)}
              className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-3 py-3 text-sm font-medium text-slate-700 hover:border-canvas-accent hover:text-canvas-accent"
            >
              {shape.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="文本">
        <textarea
          value={textValue}
          onChange={(event) => setTextValue(event.target.value)}
          className="h-24 w-full rounded-xl border border-canvas-border bg-slate-50/60 p-3 text-sm text-slate-700 focus:border-canvas-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={() => addText(textValue)}
          className="w-full rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          添加文字
        </button>
      </Section>

      <Section title="上传图片">
        <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 text-center text-sm text-slate-500 hover:border-canvas-accent hover:text-canvas-accent">
          <span>支持 png / jpg / jpeg</span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleUpload}
          />
        </label>
      </Section>
    </aside>
  )
}
