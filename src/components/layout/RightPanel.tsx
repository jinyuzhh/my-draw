import type { ReactNode } from "react"
import { useCanvas } from "../../store/CanvasProvider"
import type { CanvasElement, ShapeElement, TextElement, ImageElement } from "../../types/canvas"

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
      {label}
    </span>
    {children}
  </label>
)

const NumberInput = ({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) => (
  <input
    type="number"
    min={min}
    max={max}
    step={step}
    value={Number(value.toFixed(2))}
    onChange={(event) => onChange(Number(event.target.value))}
    className="w-full rounded-lg border border-canvas-border bg-white px-2 py-1 text-sm text-slate-700 focus:border-canvas-accent focus:outline-none"
  />
)

const ColorInput = ({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) => (
  <input
    type="color"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="h-10 w-full cursor-pointer rounded-lg border border-canvas-border bg-white"
  />
)

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-4 rounded-2xl border border-canvas-border bg-white/90 p-4 shadow-sm">
    <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
    {children}
  </section>
)

const ShapeControls = ({
  element,
  update,
}: {
  element: ShapeElement
  update: (changes: Partial<ShapeElement>) => void
}) => (
  <div className="space-y-3">
    <Field label="填充色">
      <ColorInput value={element.fill} onChange={(value) => update({ fill: value })} />
    </Field>
    <Field label="边框颜色">
      <ColorInput value={element.stroke} onChange={(value) => update({ stroke: value })} />
    </Field>
    <Field label="边框宽度">
      <NumberInput value={element.strokeWidth} onChange={(value) => update({ strokeWidth: value })} min={0} max={20} step={0.5} />
    </Field>
    {element.shape === "rectangle" && (
      <Field label="圆角">
        <NumberInput value={element.cornerRadius} onChange={(value) => update({ cornerRadius: value })} min={0} max={80} />
      </Field>
    )}
  </div>
)

const TextControls = ({
  element,
  update,
}: {
  element: TextElement
  update: (changes: Partial<TextElement>) => void
}) => (
  <div className="space-y-3">
    <Field label="内容">
      <textarea
        value={element.text}
        onChange={(event) => update({ text: event.target.value })}
        className="h-24 w-full rounded-lg border border-canvas-border bg-white p-2 text-sm text-slate-700 focus:border-canvas-accent focus:outline-none"
      />
    </Field>
    <Field label="字体大小">
      <NumberInput value={element.fontSize} onChange={(value) => update({ fontSize: value })} min={12} max={128} />
    </Field>
    <Field label="字体粗细">
      <NumberInput value={element.fontWeight} onChange={(value) => update({ fontWeight: value })} min={100} max={900} step={100} />
    </Field>
    <Field label="文字颜色">
      <ColorInput value={element.color} onChange={(value) => update({ color: value })} />
    </Field>
    <Field label="背景色">
      <ColorInput value={element.background} onChange={(value) => update({ background: value })} />
    </Field>
  </div>
)

const ImageControls = ({
  element,
  update,
}: {
  element: ImageElement
  update: (changes: Partial<ImageElement>) => void
}) => (
  <div className="space-y-3">
    <Field label="圆角">
      <NumberInput value={element.borderRadius} onChange={(value) => update({ borderRadius: value })} min={0} max={120} />
    </Field>
    <Field label="亮度">
      <input
        type="range"
        min={0.5}
        max={1.5}
        step={0.05}
        value={element.filters.brightness}
        onChange={(event) =>
          update({ filters: { ...element.filters, brightness: Number(event.target.value) } })
        }
      />
    </Field>
    <Field label="模糊">
      <input
        type="range"
        min={0}
        max={8}
        step={0.5}
        value={element.filters.blur}
        onChange={(event) =>
          update({ filters: { ...element.filters, blur: Number(event.target.value) } })
        }
      />
    </Field>
    <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
      <input
        type="checkbox"
        checked={element.filters.grayscale}
        onChange={(event) =>
          update({ filters: { ...element.filters, grayscale: event.target.checked } })
        }
        className="h-4 w-4 rounded border-canvas-border text-canvas-accent focus:ring-canvas-accent"
      />
      灰度滤镜
    </label>
  </div>
)

export const RightPanel = () => {
  const { state, updateElement, deleteSelected } = useCanvas()
  const selectedId = state.selectedIds[0]
  const selectedElement = state.elements.find((el) => el.id === selectedId)

  const handleChange = (
    changes: Partial<CanvasElement>,
  ) => {
    if (!selectedElement) return
    updateElement(selectedElement.id, changes)
  }

  if (!selectedElement) {
    return (
      <aside className="flex w-80 flex-col gap-3 border-l border-canvas-border bg-white/70 p-6 text-sm text-slate-500">
        <p className="font-semibold text-slate-700">属性</p>
        <p>请选择画布中的元素以编辑属性。</p>
        <ul className="list-disc space-y-1 pl-4 text-xs text-slate-400">
          <li>支持图形、文字、图片基础属性调整</li>
          <li>可在左侧插入新的画布元素</li>
        </ul>
      </aside>
    )
  }

  return (
    <aside className="flex w-80 flex-col gap-4 overflow-y-auto border-l border-canvas-border bg-white/70 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">当前元素</p>
          <p className="text-base font-semibold text-slate-900">
            {selectedElement.name}
          </p>
        </div>
        <button
          type="button"
          onClick={deleteSelected}
          className="text-xs font-medium text-rose-600 hover:text-rose-700"
        >
          删除
        </button>
      </div>

      <Section title="布局">
        <div className="grid grid-cols-2 gap-3">
          <Field label="X">
            <NumberInput
              value={selectedElement.x}
              onChange={(value) => handleChange({ x: value })}
            />
          </Field>
          <Field label="Y">
            <NumberInput
              value={selectedElement.y}
              onChange={(value) => handleChange({ y: value })}
            />
          </Field>
          <Field label="宽度">
            <NumberInput
              value={selectedElement.width}
              onChange={(value) => handleChange({ width: value })}
            />
          </Field>
          <Field label="高度">
            <NumberInput
              value={selectedElement.height}
              onChange={(value) => handleChange({ height: value })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="旋转">
            <NumberInput
              value={selectedElement.rotation}
              onChange={(value) => handleChange({ rotation: value })}
            />
          </Field>
          <Field label="不透明度">
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={selectedElement.opacity}
              onChange={(event) =>
                handleChange({ opacity: Number(event.target.value) })
              }
            />
          </Field>
        </div>
      </Section>

      {selectedElement.type === "shape" && (
        <Section title="图形属性">
          <ShapeControls
            element={selectedElement}
            update={(changes) =>
              handleChange(changes as Partial<CanvasElement>)
            }
          />
        </Section>
      )}

      {selectedElement.type === "text" && (
        <Section title="文字属性">
          <TextControls
            element={selectedElement}
            update={(changes) =>
              handleChange(changes as Partial<CanvasElement>)
            }
          />
        </Section>
      )}

      {selectedElement.type === "image" && (
        <Section title="图片属性">
          <ImageControls
            element={selectedElement}
            update={(changes) =>
              handleChange(changes as Partial<CanvasElement>)
            }
          />
        </Section>
      )}
    </aside>
  )
}
