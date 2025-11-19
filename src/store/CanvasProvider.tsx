import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react"
import type { ReactNode } from "react"
import type { Application } from "pixi.js"
import type {
  CanvasContextValue,
  CanvasElement,
  CanvasState,
  InteractionMode,
  ShapeVariant,
} from "../types/canvas"

// 生成唯一ID
const createId = () => crypto.randomUUID()

// 深拷贝函数，优先使用 structuredClone API，降级到 JSON 方法
const deepCopy = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value))
}

// 本地存储键名
const STORAGE_KEY = "my-figma:canvas-state"

// 画布基础状态定义
const baseState: CanvasState = {
  elements: [],                 // 画布上的元素列表
  selectedIds: [],              // 当前选中的元素ID列表
  zoom: 1,                      // 当前缩放比例
  pan: { x: 0, y: 0 },          // 当前平移偏移量
  interactionMode: "select",    // 当前交互模式（选择/绘制等）
  history: [],                  // 操作历史记录栈，用于撤销功能
  redoStack: [],                // 重做操作栈，用于重做功能
}

// 获取初始状态函数
// 尝试从 localStorage 恢复状态，如果失败则返回默认状态
const getInitialState = (): CanvasState => {
  // 创建基础状态的深拷贝作为回退选项
  const fallback = deepCopy(baseState)
  // 检查是否在浏览器环境中
  if (typeof window === "undefined") return fallback
  try {
    // 尝试从本地存储获取保存的状态
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return fallback
    // 解析存储的数据
    const parsed = JSON.parse(stored)
    // 返回合并后的状态，确保数据完整性
    return {
      ...fallback,
      elements: Array.isArray(parsed?.elements) ? parsed.elements : [],
      pan:
        parsed?.pan && typeof parsed.pan.x === "number" && typeof parsed.pan.y === "number"
          ? parsed.pan
          : fallback.pan,
      zoom: typeof parsed?.zoom === "number" ? parsed.zoom : fallback.zoom,
    }
  } catch {
    // 如果解析失败，返回默认状态
    return fallback
  }
}

// 定义所有可能的状态变更 Action 类型
type Action =
  // 更新元素列表的 Action
  | {
      type: "SET_ELEMENTS"
      payload: {
        updater: (elements: CanvasElement[]) => CanvasElement[]  // 元素更新函数
        recordHistory: boolean                                    // 是否记录历史
        historySnapshot?: CanvasElement[]                         // 可选的历史快照
      }
    }
  // 设置选中元素的 Action
  | { type: "SET_SELECTION"; payload: string[]; additive?: boolean }
  // 清除选中状态的 Action
  | { type: "CLEAR_SELECTION" }
  // 设置缩放级别的 Action
  | { type: "SET_ZOOM"; payload: number }
  // 平移画布的 Action
  | { type: "PAN_BY"; payload: { x: number; y: number } }
  // 设置交互模式的 Action
  | { type: "SET_MODE"; payload: InteractionMode }
  // 撤销操作的 Action
  | { type: "UNDO" }
  // 重做操作的 Action
  | { type: "REDO" }

// 画布状态 Reducer 函数
// 根据不同的 Action 类型处理状态变更
const canvasReducer = (state: CanvasState, action: Action): CanvasState => {
  switch (action.type) {
    case "SET_ELEMENTS": {
      // 创建当前元素的深拷贝作为工作副本
      const workingCopy = deepCopy(state.elements)
      // 应用更新函数
      const updated = action.payload.updater(workingCopy)
      // 是否记录历史
      const shouldRecord = action.payload.recordHistory
      return {
        ...state,
        elements: updated,
        // 如果需要记录历史，将当前状态添加到历史栈
        history: shouldRecord
          ? [...state.history, action.payload.historySnapshot ?? deepCopy(state.elements)]
          : state.history,
        // 记录历史时清空重做栈
        redoStack: shouldRecord ? [] : state.redoStack,
      }
    }
    case "SET_SELECTION":
      return {
        ...state,
        // additive 为 true 时追加选中，false 时替换选中
        selectedIds: action.additive
          ? Array.from(new Set([...state.selectedIds, ...action.payload]))
          : action.payload,
      }
    case "CLEAR_SELECTION":
      return { ...state, selectedIds: [] }
    case "SET_ZOOM":
      return { ...state, zoom: action.payload }
    case "PAN_BY":
      return {
        ...state,
        pan: {
          x: state.pan.x + action.payload.x,
          y: state.pan.y + action.payload.y,
        },
      }
    case "SET_MODE":
      return { ...state, interactionMode: action.payload }
    case "UNDO": {
      // 如果没有历史记录，直接返回当前状态
      if (!state.history.length) return state
      // 获取上一个状态
      const previous = state.history[state.history.length - 1]
      // 移除最后一个历史记录
      const nextHistory = state.history.slice(0, -1)
      return {
        ...state,
        elements: previous,
        history: nextHistory,
        // 将当前状态添加到重做栈
        redoStack: [deepCopy(state.elements), ...state.redoStack],
        selectedIds: [],  // 撤销时清除选中状态
      }
    }
    case "REDO": {
      // 如果没有重做记录，直接返回当前状态
      if (!state.redoStack.length) return state
      // 获取下一个状态和剩余的重做栈
      const [next, ...rest] = state.redoStack
      return {
        ...state,
        elements: next,
        // 将当前状态添加到历史栈
        history: [...state.history, deepCopy(state.elements)],
        redoStack: rest,
        selectedIds: [],  // 重做时清除选中状态
      }
    }
    default:
      return state
  }
}

// 创建画布上下文对象
const CanvasContext = createContext<CanvasContextValue | null>(null)

// 画布状态提供者组件
export const CanvasProvider = ({ children }: { children: ReactNode }) => {
  // 使用 useReducer 管理画布状态，初始化时调用 getInitialState
  const [state, dispatch] = useReducer(canvasReducer, undefined, getInitialState)
  // 引用 PIXI 应用实例
  const appRef = useRef<Application | null>(null)

  // 使用 useRef 作为内部剪贴板，存储复制的元素
  const clipboardRef = useRef<CanvasElement[]>([])

  // 元素变更函数，用于更新画布元素列表
  const mutateElements = useCallback(
    (
      updater: (elements: CanvasElement[]) => CanvasElement[],
      options?: { recordHistory?: boolean; historySnapshot?: CanvasElement[] }
    ) =>
      dispatch({
        type: "SET_ELEMENTS",
        payload: {
          updater,
          recordHistory: options?.recordHistory ?? true,  // 默认记录历史
          historySnapshot: options?.historySnapshot,
        },
      }),
    []
  )

  // 设置选中元素的函数
  const setSelection = useCallback(
    (ids: string[], additive = false) =>
      dispatch({ type: "SET_SELECTION", payload: ids, additive }),
    []
  )

  // 复制选中元素到内部剪贴板
  const copy = useCallback(() => {
    // 筛选出当前选中的元素
    const selectedElements = state.elements.filter((el) =>
      state.selectedIds.includes(el.id)
    )
    if (selectedElements.length > 0) {
      // 深拷贝存储，防止引用关联
      clipboardRef.current = deepCopy(selectedElements)
    }
  }, [state.elements, state.selectedIds])

  // 从剪贴板粘贴元素到画布
  const paste = useCallback(() => {
    const clipboard = clipboardRef.current
    if (!clipboard.length) return

    const newElements: CanvasElement[] = []
    const newIds: string[] = []

    clipboard.forEach((item) => {
      const id = createId()
      newIds.push(id)
      // 生成新元素：新ID，位置偏移 20px
      const newElement = {
        ...deepCopy(item), // 再次深拷贝，确保新粘贴的元素与剪贴板断开关联
        id,
        name: `${item.name} 副本`,
        x: item.x + 20,
        y: item.y + 20,
      }
      newElements.push(newElement)
    })

    // 将新元素添加到画布
    mutateElements((prev) => [...prev, ...newElements])
    // 选中新粘贴的元素
    dispatch({ type: "SET_SELECTION", payload: newIds })
  }, [mutateElements])



  // 清除选中状态的函数
  const clearSelection = () => dispatch({ type: "CLEAR_SELECTION" })

  // 添加形状元素到画布
  const addShape = useCallback(
    (shape: ShapeVariant) => {
      const id = createId()
      // 根据形状类型设置默认尺寸
      const size = shape === "rectangle" ? { width: 220, height: 140 } : { width: 160, height: 160 }
      const element: CanvasElement = {
        id,
        type: "shape",
        name: `${shape} ${state.elements.length + 1}`,
        x: 320,
        y: 180,
        width: size.width,
        height: size.height,
        rotation: 0,
        opacity: 1,
        shape,
        fill: "#f8fafc",
        stroke: "#0f172a",
        strokeWidth: 2,
        cornerRadius: shape === "rectangle" ? 12 : 0,
      }
      // 添加元素到画布
      mutateElements((elements) => [...elements, element])
      // 选中新添加的元素
      dispatch({ type: "SET_SELECTION", payload: [id] })
    },
    [mutateElements, state.elements.length]
  )

  // 添加文本元素到画布
  const addText = useCallback(
    (text = "双击编辑文本") => {
      const id = createId()
      const element: CanvasElement = {
        id,
        type: "text",
        name: `文本 ${state.elements.length + 1}`,
        x: 360,
        y: 220,
        width: 260,
        height: 80,
        rotation: 0,
        opacity: 1,
        text,
        fontSize: 24,
        fontFamily: "Inter",
        fontWeight: 500,
        align: "left",
        color: "#0f172a",
        background: "#ffffff",
        lineHeight: 1.3,
      }
      // 添加元素到画布
      mutateElements((elements) => [...elements, element])
      // 选中新添加的元素
      dispatch({ type: "SET_SELECTION", payload: [id] })
    },
    [mutateElements, state.elements.length]
  )

  // 添加图片元素到画布
  const addImage = useCallback(
    (src: string, size?: { width: number; height: number }) => {
      const id = createId()
      const element: CanvasElement = {
        id,
        type: "image",
        name: `图片 ${state.elements.length + 1}`,
        x: 280,
        y: 160,
        width: size?.width ?? 240,
        height: size?.height ?? 160,
        rotation: 0,
        opacity: 1,
        src,
        filters: {
          grayscale: false,
          blur: 0,
          brightness: 1,
        },
        borderRadius: 12,
      }
      // 添加元素到画布
      mutateElements((elements) => [...elements, element])
      // 选中新添加的元素
      dispatch({ type: "SET_SELECTION", payload: [id] })
    },
    [mutateElements, state.elements.length]
  )

  // 更新单个元素的属性
  const updateElement = useCallback(
    (id: string, changes: Partial<CanvasElement>) => {
      mutateElements(
        (elements) =>
          elements.map((el) => (el.id === id ? { ...el, ...changes } : el)) as CanvasElement[]
      )
    },
    [mutateElements]
  )

  // 批量更新选中元素的属性
  const updateSelectedElements = useCallback(
    (updater: (element: CanvasElement) => Partial<CanvasElement>) => {
      const ids = state.selectedIds
      if (!ids.length) return
      mutateElements(
        (elements) =>
          elements.map((el) =>
            ids.includes(el.id) ? { ...el, ...updater(el) } : el
          ) as CanvasElement[]
      )
    },
    [mutateElements, state.selectedIds]
  )

  // 删除选中的元素
  const deleteSelected = useCallback(() => {
    if (!state.selectedIds.length) return
    mutateElements((elements) =>
      elements.filter((el) => !state.selectedIds.includes(el.id))
    )
    // 删除后清除选中状态
    dispatch({ type: "CLEAR_SELECTION" })
  }, [mutateElements, state.selectedIds])

  // 设置画布缩放级别（限制在 0.25-3 之间）
  const setZoom = useCallback((zoom: number) => {
    const next = Math.min(3, Math.max(0.25, zoom))
    dispatch({ type: "SET_ZOOM", payload: next })
  }, [])

  // 平移画布视图
  const panBy = useCallback((delta: { x: number; y: number }) => {
    dispatch({ type: "PAN_BY", payload: delta })
  }, [])

  // 设置交互模式
  const setInteractionMode = useCallback(
    (mode: InteractionMode) => dispatch({ type: "SET_MODE", payload: mode }),
    []
  )

  // 撤销操作
  const undo = useCallback(() => dispatch({ type: "UNDO" }), [])
  // 重做操作
  const redo = useCallback(() => dispatch({ type: "REDO" }), [])

  // 注册 PIXI 应用实例
  const registerApp = useCallback((app: Application | null) => {
    appRef.current = app
  }, [])

  // 导出画布为图片
  const exportAsImage = useCallback(() => {
    const app = appRef.current
    if (!app) return null
    const extractor = app.renderer.extract
    if (!extractor || typeof extractor.canvas !== "function") {
      return null
    }
    const getCanvas = extractor.canvas as
      | ((displayObject: unknown) => HTMLCanvasElement)
      | undefined
    if (!getCanvas) return null
    const canvas = getCanvas.call(extractor, app.stage)
    return canvas?.toDataURL("image/png") ?? null
  }, [])

  // 状态持久化：监听状态变化并保存到 localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    const payload = JSON.stringify({
      elements: state.elements,
      pan: state.pan,
      zoom: state.zoom,
    })
    window.localStorage.setItem(STORAGE_KEY, payload)
  }, [state.elements, state.pan, state.zoom])

  // 创建上下文值，使用 useMemo 优化性能
  const value = useMemo<CanvasContextValue>(
    () => ({
      state,                    // 当前画布状态
      addShape,                 // 添加形状
      addText,                  // 添加文本
      addImage,                 // 添加图片
      updateElement,            // 更新单个元素
      updateSelectedElements,   // 批量更新选中元素
      mutateElements,           // 元素变更函数
      setSelection,             // 设置选中状态
      clearSelection,          // 清除选中状态
      deleteSelected,           // 删除选中元素
      setZoom,                  // 设置缩放
      panBy,                    // 平移画布
      setInteractionMode,       // 设置交互模式
      undo,                     // 撤销
      redo,                     // 重做
      registerApp,              // 注册 PIXI 应用
      exportAsImage,            // 导出图片
      copy,                     // 复制
      paste,                    // 粘贴
    }),
    [
      state,
      addShape,
      addText,
      addImage,
      updateElement,
      updateSelectedElements,
      mutateElements,
      setSelection,
      clearSelection,
      deleteSelected,
      setZoom,
      panBy,
      setInteractionMode,
      undo,
      redo,
      registerApp,
      exportAsImage,
      copy,
      paste,
    ]
  )

  // 提供上下文值给子组件
  return (
    <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>
  )
}

// 自定义 Hook：用于在组件中访问画布上下文
export const useCanvas = () => {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error("useCanvas must be used within CanvasProvider")
  }
  return context
}
