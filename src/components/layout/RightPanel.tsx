/**
 * @fileoverview 右侧属性面板组件
 * @file /Volumes/DreamZero/code/project/bytedance-canvas/src/components/layout/RightPanel.tsx
 * 
 * @description 
 * 右侧属性面板组件，用于显示和编辑画布中选中元素的属性。
 * 该组件提供以下功能：
 * 1. 显示选中元素的基本信息（名称、类型）
 * 2. 编辑元素的通用属性（位置、尺寸、旋转、透明度）
 * 3. 根据元素类型提供特定的属性编辑器
 *    - 图形元素：填充色、边框、圆角等
 *    - 文本元素：内容、字体、颜色等
 *    - 图片元素：滤镜、圆角等
 * 4. 提供删除选中元素的功能
 * 
 * @author Canvas Team
 * @version 1.0.0
 */

import type { ReactNode } from "react"
import { useCanvas } from "../../store/CanvasProvider"
import type { CanvasElement, ShapeElement, TextElement, ImageElement } from "../../types/canvas"

/**
 * 表单字段容器组件
 * 
 * @component Field
 * 
 * @description 
 * 可复用的表单字段容器，用于统一属性面板中各个输入控件的布局和样式。
 * 提供标签和输入控件的垂直排列布局，确保界面一致性。
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.label - 字段标签文本，显示在输入控件上方
 * @param {ReactNode} props.children - 输入控件，可以是任何有效的 React 节点
 * 
 * @returns {JSX.Element} 返回带有统一样式的表单字段容器
 * 
 * @example
 * ```tsx
 * // 使用示例
 * <Field label="颜色">
 *   <ColorInput value="#ff0000" onChange={setColor} />
 * </Field>
 * ```
 */
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
      {label}
    </span>
    {children}
  </label>
)

/**
 * 数字输入控件组件
 * 
 * @component NumberInput
 * 
 * @description 
 * 专用于属性面板的数字输入控件，支持范围限制和步进控制。
 * 提供统一的样式和交互体验，确保数值输入的一致性。
 * 
 * @param {Object} props - 组件属性
 * @param {number} props.value - 当前数值
 * @param {Function} props.onChange - 数值变更回调函数
 * @param {number} [props.min] - 最小值限制
 * @param {number} [props.max] - 最大值限制
 * @param {number} [props.step=1] - 步进值，默认为1
 * 
 * @returns {JSX.Element} 返回数字输入控件
 * 
 * @example
 * ```tsx
 * // 使用示例
 * <NumberInput 
 *   value={width} 
 *   onChange={setWidth} 
 *   min={0} 
 *   max={1000} 
 *   step={10}
 * />
 * ```
 */
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
    // 限制小数位数为2位，提高显示精度
    value={Number(value.toFixed(2))}
    onChange={(event) => onChange(Number(event.target.value))}
    className="w-full rounded-lg border border-canvas-border bg-white px-2 py-1 text-sm text-slate-700 focus:border-canvas-accent focus:outline-none"
  />
)

/**
 * 颜色选择器组件
 * 
 * @component ColorInput
 * 
 * @description 
 * 专用于属性面板的颜色选择器，提供直观的颜色选择界面。
 * 使用原生 HTML5 颜色输入控件，确保跨浏览器兼容性。
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.value - 当前颜色值，支持十六进制格式
 * @param {Function} props.onChange - 颜色变更回调函数
 * 
 * @returns {JSX.Element} 返回颜色选择器控件
 * 
 * @example
 * ```tsx
 * // 使用示例
 * <ColorInput 
 *   value="#ff0000" 
 *   onChange={setColor} 
 * />
 * ```
 */
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

/**
 * 属性面板区域容器组件
 * 
 * @component Section
 * 
 * @description 
 * 可复用的属性面板区域容器，用于组织不同类型的属性控件。
 * 提供统一的视觉样式和布局结构，确保属性面板的界面一致性。
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.title - 区域标题，显示在容器顶部
 * @param {ReactNode} props.children - 区域内容，可以是任何有效的 React 节点
 * 
 * @returns {JSX.Element} 返回带有统一样式的区域容器
 * 
 * @example
 * ```tsx
 * // 使用示例
 * <Section title="布局属性">
 *   <Field label="宽度">
 *     <NumberInput value={width} onChange={setWidth} />
 *   </Field>
 * </Section>
 * ```
 */
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-4 rounded-2xl border border-canvas-border bg-white/90 p-4 shadow-sm">
    <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
    {children}
  </section>
)

/**
 * 图形元素属性控制组件
 * 
 * @component ShapeControls
 * 
 * @description 
 * 专用于图形元素的属性编辑控件，提供图形特有的属性调整功能。
 * 根据图形类型显示相应的属性选项，如矩形的圆角设置。
 * 
 * @param {Object} props - 组件属性
 * @param {ShapeElement} props.element - 当前编辑的图形元素
 * @param {Function} props.update - 属性更新函数，接收部分属性变更对象
 * 
 * @returns {JSX.Element} 返回图形属性编辑控件
 * 
 * @example
 * ```tsx
 * // 使用示例
 * <ShapeControls 
 *   element={selectedShape} 
 *   update={handleShapeUpdate} 
 * />
 * ```
 */
const ShapeControls = ({
  element,
  update,
}: {
  element: ShapeElement
  update: (changes: Partial<ShapeElement>) => void
}) => (
  <div className="space-y-3">
    {/* 图形填充颜色控制 */}
    <Field label="填充色">
      <ColorInput value={element.fill} onChange={(value) => update({ fill: value })} />
    </Field>
    {/* 图形边框颜色控制 */}
    <Field label="边框颜色">
      <ColorInput value={element.stroke} onChange={(value) => update({ stroke: value })} />
    </Field>
    {/* 图形边框宽度控制 */}
    <Field label="边框宽度">
      <NumberInput value={element.strokeWidth} onChange={(value) => update({ strokeWidth: value })} min={0} max={20} step={0.5} />
    </Field>
    {/* 仅矩形类型显示圆角控制 */}
    {element.shape === "rectangle" && (
      <Field label="圆角">
        <NumberInput value={element.cornerRadius} onChange={(value) => update({ cornerRadius: value })} min={0} max={80} />
      </Field>
    )}
  </div>
)

/**
 * 文本元素属性控制组件
 * 
 * @component TextControls
 * 
 * @description 
 * 专用于文本元素的属性编辑控件，提供文本特有的属性调整功能。
 * 包括文本内容、字体大小、字体粗细、文字颜色和背景色等属性设置。
 * 
 * @param {Object} props - 组件属性
 * @param {TextElement} props.element - 当前编辑的文本元素
 * @param {Function} props.update - 属性更新函数，接收部分属性变更对象
 * 
 * @returns {JSX.Element} 返回文本属性编辑控件
 * 
 * @example
 * ```tsx
 * // 使用示例
 * <TextControls 
 *   element={selectedText} 
 *   update={handleTextUpdate} 
 * />
 * ```
 */
const TextControls = ({
  element,
  update,
}: {
  element: TextElement
  update: (changes: Partial<TextElement>) => void
}) => (
  <div className="space-y-3">
    {/* 文本内容编辑区域 */}
    <Field label="内容">
      <textarea
        value={element.text}
        onChange={(event) => update({ text: event.target.value })}
        className="h-24 w-full rounded-lg border border-canvas-border bg-white p-2 text-sm text-slate-700 focus:border-canvas-accent focus:outline-none"
      />
    </Field>
    {/* 字体大小控制 */}
    <Field label="字体大小">
      <NumberInput value={element.fontSize} onChange={(value) => update({ fontSize: value })} min={12} max={128} />
    </Field>
    {/* 字体粗细控制 */}
    <Field label="字体粗细">
      <NumberInput value={element.fontWeight} onChange={(value) => update({ fontWeight: value })} min={100} max={900} step={100} />
    </Field>
    {/* 文字颜色选择器 */}
    <Field label="文字颜色">
      <ColorInput value={element.color} onChange={(value) => update({ color: value })} />
    </Field>
    {/* 背景颜色选择器 */}
    <Field label="背景色">
      <ColorInput value={element.background} onChange={(value) => update({ background: value })} />
    </Field>
  </div>
)

/**
 * 图片元素属性控制组件
 * 
 * @component ImageControls
 * 
 * @description 
 * 专用于图片元素的属性编辑控件，提供图片特有的属性调整功能。
 * 包括圆角设置、亮度调节、模糊效果和灰度滤镜等图片处理选项。
 * 
 * @param {Object} props - 组件属性
 * @param {ImageElement} props.element - 当前编辑的图片元素
 * @param {Function} props.update - 属性更新函数，接收部分属性变更对象
 * 
 * @returns {JSX.Element} 返回图片属性编辑控件
 * 
 * @example
 * ```tsx
 * // 使用示例
 * <ImageControls 
 *   element={selectedImage} 
 *   update={handleImageUpdate} 
 * />
 * ```
 */
const ImageControls = ({
  element,
  update,
}: {
  element: ImageElement
  update: (changes: Partial<ImageElement>) => void
}) => (
  <div className="space-y-3">
    {/* 图片圆角控制 */}
    <Field label="圆角">
      <NumberInput value={element.borderRadius} onChange={(value) => update({ borderRadius: value })} min={0} max={120} />
    </Field>
    {/* 图片亮度调节滑块 */}
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
    {/* 图片模糊效果调节滑块 */}
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
    {/* 灰度滤镜开关 */}
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

/**
 * 右侧属性面板组件
 * 
 * @component RightPanel
 * 
 * @description 
 * 画布编辑器的右侧属性面板，用于显示和编辑选中元素的属性。
 * 根据选中元素的类型（图形、文本、图片）显示相应的属性控制选项。
 * 未选中元素时显示提示信息。
 * 
 * @returns {JSX.Element} 返回属性面板组件
 * 
 * @example
 * ```tsx
 * // 使用示例
 * <RightPanel />
 * ```
 */
export const RightPanel = () => {
  const { state, updateElement, deleteSelected } = useCanvas()
  const selectedId = state.selectedIds[0]
  const selectedElement = state.elements.find((el) => el.id === selectedId)

  /**
   * 处理元素属性变更
   * 
   * @function handleChange
   * 
   * @description 
   * 更新当前选中元素的属性。该函数接收部分属性变更对象，
   * 并通过 updateElement 方法将变更应用到画布状态中。
   * 
   * @param {Partial<CanvasElement>} changes - 要变更的属性对象
   * 
   * @returns {void} 无返回值
   */
  const handleChange = (
    changes: Partial<CanvasElement>,
  ) => {
    if (!selectedElement) return
    updateElement(selectedElement.id, changes)
  }

  // 未选中元素时显示的空状态
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

  // 选中元素时显示的属性编辑面板
  return (
    <aside className="flex w-80 flex-col gap-4 overflow-y-auto border-l border-canvas-border bg-white/70 p-4">
      {/* 元素信息头部，显示元素名称和删除按钮 */}
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

      {/* 通用布局属性控制区域 */}
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

      {/* 根据元素类型显示相应的属性控制组件 */}
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
