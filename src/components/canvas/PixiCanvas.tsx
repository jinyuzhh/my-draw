/**
 * @fileoverview Pixi 画布渲染组件
 * @file /Volumes/DreamZero/code/project/bytedance-canvas/src/components/canvas/PixiCanvas.tsx
 * 
 * @description 
 * 基于 PixiJS 的画布渲染组件，负责渲染和管理画布中的所有元素。
 * 该组件提供以下功能：
 * 1. 初始化和管理 PixiJS 应用实例
 * 2. 渲染各种类型的画布元素（形状、文本、图像）
 * 3. 处理元素的交互（选择、移动、调整大小）
 * 4. 实现画布的缩放和平移
 * 5. 提供区域选择功能
 * 6. 管理元素的选中状态和视觉反馈
 * 
 * @author Canvas Team
 * @version 1.0.0
 */

import { useEffect, useRef, useCallback } from "react"
import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  BlurFilter,
  ColorMatrixFilter,
  FederatedPointerEvent,
  Rectangle,
  Texture,
} from "pixi.js"
import type { TextStyleFontWeight } from "pixi.js"
import { useCanvas } from "../../store/CanvasProvider"
import type { CanvasElement } from "../../types/canvas"

// 调整大小的方向类型定义
type ResizeDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw"

// 所有可能的调整大小方向数组
const RESIZE_DIRECTIONS: ResizeDirection[] = [
  "n",   // 北
  "ne",  // 东北
  "e",   // 东
  "se",  // 东南
  "s",   // 南
  "sw",  // 西南
  "w",   // 西
  "nw",  // 西北
]

// 不同调整方向对应的鼠标指针样式
const RESIZE_CURSORS: Record<ResizeDirection, string> = {
  n: "ns-resize",      // 南北调整
  ne: "nesw-resize",   // 东北-西南调整
  e: "ew-resize",      // 东西调整
  se: "nwse-resize",   // 西北-东南调整
  s: "ns-resize",      // 南北调整
  sw: "nesw-resize",   // 东北-西南调整
  w: "ew-resize",      // 东西调整
  nw: "nwse-resize",   // 西北-东南调整
}

// 元素最小尺寸限制
const MIN_ELEMENT_SIZE = 0

// 限制元素尺寸不小于最小值
const clampSize = (value: number) => Math.max(MIN_ELEMENT_SIZE, value)

// 选中框颜色（蓝色）
const SELECTION_COLOR = 0x39b5ff

// 调整大小手柄激活状态颜色（青色）
const HANDLE_ACTIVE_COLOR = 0x00cae0


/**
 * 将十六进制颜色字符串转换为数字
 * 
 * @function hexToNumber
 * @param {string} value - 十六进制颜色字符串（如 "#FF0000"）
 * @returns {number} 转换后的数字颜色值
 */
const hexToNumber = (value: string) =>
  Number.parseInt(value.replace("#", ""), 16)

/**
 * 深度克隆元素数组（深拷贝）
 * 
 * @function cloneElements
 * @param {CanvasElement[]} elements - 要克隆的元素数组
 * @returns {CanvasElement[]} 克隆后的元素数组
 * 
 * @description 
 * 优先使用 structuredClone API，如果不可用则使用 JSON 方法作为后备。
 * 确保返回的数组与原数组完全独立，修改不会影响原数组。
 */
const cloneElements = (elements: CanvasElement[]) => {
  if (typeof structuredClone === "function") {
    return structuredClone(elements)
  }
  return JSON.parse(JSON.stringify(elements))
}

/**
 * 深度克隆单个元素
 * 
 * @function cloneElement
 * @param {CanvasElement} element - 要克隆的元素
 * @returns {CanvasElement} 克隆后的元素
 */
const cloneElement = (element: CanvasElement): CanvasElement =>
  cloneElements([element])[0]

/**
 * 获取调整大小手柄的位置
 * 
 * @function getHandlePosition
 * @param {ResizeDirection} direction - 调整方向
 * @param {number} width - 元素宽度
 * @param {number} height - 元素高度
 * @returns {{x: number, y: number}} 手柄相对于元素左上角的位置
 * 
 * @description 
 * 根据调整方向计算手柄在元素边界上的位置。
 * 例如，北方向的手柄位于顶部中央，东北方向的手柄位于右上角。
 */
const getHandlePosition = (
  direction: ResizeDirection,
  width: number,
  height: number
) => {
  switch (direction) {
    case "n":   // 北：顶部中央
      return { x: width / 2, y: 0 }
    case "e":   // 东：右侧中央
      return { x: width, y: height / 2 }
    case "s":   // 南：底部中央
      return { x: width / 2, y: height }
    case "w":   // 西：左侧中央
      return { x: 0, y: height / 2 }
    case "nw":  // 西北：左上角
      return { x: 0, y: 0 }
    case "ne":  // 东北：右上角
      return { x: width, y: 0 }
    case "se":  // 东南：右下角
      return { x: width, y: height }
    case "sw":  // 西南：左下角
      return { x: 0, y: height }
    default:
      return { x: width, y: height }
  }
}

/**
 * 创建画布元素的 PixiJS 可视化表示
 * 
 * @function createShape
 * @param {CanvasElement} element - 要渲染的画布元素
 * @param {boolean} selected - 元素是否被选中
 * @param {"select" | "pan"} interactionMode - 当前交互模式
 * @param {Function} onPointerDown - 指针按下事件处理函数
 * @returns {Container} 包含元素可视化表示的容器
 * 
 * @description 
 * 根据元素类型创建相应的 PixiJS 对象并添加到容器中。
 * 支持的元素类型包括：形状（矩形、圆形、三角形）、文本和图像。
 * 如果元素被选中，会添加选中框轮廓。
 */
const createShape = (
  element: CanvasElement,
  selected: boolean,
  interactionMode: "select" | "pan",
  onPointerDown: (event: FederatedPointerEvent) => void
) => {
  // 创建元素容器，用于组合多个图形对象
  const container = new Container()
  
  // 设置元素的基本属性
  container.position.set(element.x, element.y)  // 位置
  container.angle = element.rotation            // 旋转角度
  container.alpha = element.opacity             // 透明度
  
  // 设置交互属性
  container.eventMode = "static"                // 启用事件交互
  container.cursor = interactionMode === "select" ? "move" : "grab"  // 根据模式设置鼠标样式
  container.hitArea = new Rectangle(0, 0, element.width, element.height)  // 设置点击区域

  // 如果元素被选中，添加选中框轮廓
  if (selected) {
    const outline = new Graphics()
    outline.roundRect(0, 0, element.width, element.height, 2)  // 绘制圆角矩形轮廓
    outline.stroke({ width: 1.4, color: SELECTION_COLOR, alpha: 1 })  // 设置轮廓样式
    outline.zIndex = 5  // 设置层级，确保轮廓在元素上方
    container.addChild(outline)
  }

  // 处理形状类型元素（矩形、圆形、三角形）
  if (element.type === "shape") {
    // 创建填充和描边图形对象
    const fill = new Graphics()
    const stroke = new Graphics()
    const fillColor = hexToNumber(element.fill)      // 转换填充颜色
    const strokeColor = hexToNumber(element.stroke)    // 转换描边颜色

    /**
     * 根据形状类型绘制路径
     * 
     * @function drawPath
     * @param {Graphics} target - 要绘制路径的图形对象
     */
    const drawPath = (target: Graphics) => {
      switch (element.shape) {
        case "rectangle":  // 矩形
          target.roundRect(
            0,
            0,
            element.width,
            element.height,
            Math.max(element.cornerRadius, 0)  // 确保圆角半径不为负
          )
          break
        case "circle": {   // 圆形
          // 计算半径，取宽高中的较小值的一半
          const radius = Math.max(
            Math.min(element.width, element.height) / 2,
            0
          )
          target.circle(element.width / 2, element.height / 2, radius)
          break
        }
        case "triangle":  // 三角形
          target.moveTo(element.width / 2, 0)        // 顶点
          target.lineTo(element.width, element.height)  // 右下角
          target.lineTo(0, element.height)             // 左下角
          target.closePath()  // 闭合路径
          break
      }
    }

    // 绘制填充部分
    drawPath(fill)
    fill.fill({ color: fillColor, alpha: 1 })
    container.addChild(fill)

    // 如果有描边，绘制描边部分
    if (element.strokeWidth > 0) {
      drawPath(stroke)
      stroke.stroke({
        width: element.strokeWidth,
        color: strokeColor,
        alignment: 1,  // 描边对齐方式：1 表示外部对齐
      })
      container.addChild(stroke)
    }
  }

  // 处理文本类型元素
  if (element.type === "text") {
    // 如果背景色不是透明，绘制背景
    if (element.background !== "transparent") {
      const bg = new Graphics()
      bg.roundRect(0, 0, element.width, element.height, 12)  // 圆角背景
      bg.fill({ color: hexToNumber(element.background), alpha: 0.8 })
      container.addChild(bg)
    }
    
    // 创建文本对象
    const text = new Text({
      text: element.text,
      style: new TextStyle({
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        fontWeight: `${element.fontWeight}` as TextStyleFontWeight,
        fill: element.color,
        align: element.align,
        lineHeight: element.fontSize * element.lineHeight,
        wordWrap: true,           // 启用自动换行
        wordWrapWidth: element.width,  // 换行宽度
      }),
    })
    text.position.set(12, 12)  // 设置文本内边距
    container.addChild(text)
  }

  // 处理图像类型元素
  if (element.type === "image") {
    // 从图像源创建纹理
    const texture = Texture.from(element.src)
    const sprite = new Sprite(texture)
    
    // 设置精灵属性
    sprite.eventMode = "none"  // 禁用精灵的事件交互（由容器处理）
    sprite.width = element.width
    sprite.height = element.height
    
    // 创建圆角遮罩
    const mask = new Graphics()
    mask.roundRect(0, 0, element.width, element.height, element.borderRadius)
    mask.fill({ color: 0xffffff })
    mask.alpha = 0  // 遮罩本身不可见
    mask.eventMode = "none"
    sprite.mask = mask  // 应用遮罩
    
    // 处理图像滤镜效果
    const filters = []
    
    // 模糊滤镜
    if (element.filters.blur > 0) {
      filters.push(new BlurFilter({ strength: element.filters.blur }))
    }
    
    // 灰度和亮度滤镜
    if (element.filters.grayscale || element.filters.brightness !== 1) {
      const colorMatrix = new ColorMatrixFilter()
      
      // 灰度效果
      if (element.filters.grayscale) {
        colorMatrix.greyscale(1, false)
      }
      
      // 亮度调整
      if (element.filters.brightness !== 1) {
        colorMatrix.brightness(element.filters.brightness, false)
      }
      
      filters.push(colorMatrix)
    }
    
    // 应用滤镜（如果有）
    sprite.filters = filters.length ? filters : undefined
    
    // 将遮罩和精灵添加到容器
    container.addChild(mask)
    container.addChild(sprite)
  }

  // 在选择模式下，为容器添加指针按下事件监听
  if (interactionMode === "select") {
    container.on("pointerdown", onPointerDown)
  }

  return container
}

/**
 * PixiCanvas 画布组件
 * 
 * @component PixiCanvas
 * @description 
 * 基于 PixiJS 实现的画布渲染组件，负责：
 * 1. 初始化和管理 PixiJS 应用实例
 * 2. 渲染和管理画布元素（形状、文本、图像）
 * 3. 处理用户交互（选择、移动、调整大小、平移）
 * 4. 管理画布缩放和视口
 * 5. 实现区域选择功能
 */
export const PixiCanvas = () => {
  // 从 Canvas Context 获取状态和方法
  const {
    state,              // 画布状态（元素列表、选中项、缩放等）
    setSelection,       // 设置选中元素
    clearSelection,     // 清除选中状态
    mutateElements,     // 修改元素属性
    panBy,              // 平移画布
    registerApp,        // 注册 PixiJS 应用实例
  } = useCanvas()
  
  // DOM 和 PixiJS 对象引用
  const wrapperRef = useRef<HTMLDivElement | null>(null)      // 画布容器 DOM 元素引用
  const appRef = useRef<Application | null>(null)              // PixiJS 应用实例引用
  const contentRef = useRef<Container | null>(null)            // 内容容器引用（存放所有元素）
  const backgroundRef = useRef<Graphics | null>(null)          // 背景图形对象引用
  
  // 交互状态引用
  const dragRef = useRef<{
    ids: string[]                                    // 正在拖动的元素 ID 列表
    startPointer: { x: number; y: number }          // 拖动开始时的指针位置
    snapshot: Record<string, CanvasElement>         // 拖动开始时的元素快照
    historySnapshot: CanvasElement[]                // 拖动开始时的历史记录快照
    moved: boolean                                  // 是否已移动（用于区分点击和拖动）
  } | null>(null)                                    // 拖动操作状态引用
  
  const resizeRef = useRef<{
    id: string                                      // 正在调整大小的元素 ID
    direction: ResizeDirection                      // 调整大小的方向
    startPointer: { x: number; y: number }          // 调整开始时的指针位置
    startElement: CanvasElement                     // 调整开始时的元素状态
    historySnapshot: CanvasElement[]                // 调整开始时的历史记录快照
    moved: boolean                                  // 是否已调整大小
  } | null>(null)                                    // 调整大小操作状态引用
  
  const panRef = useRef<{ lastPointer: { x: number; y: number } } | null>(null)  // 平移操作状态引用
  
  // 状态同步和观察器引用
  const stateRef = useRef(state)                     // 状态引用（用于在回调中获取最新状态）
  const resizeObserverRef = useRef<ResizeObserver | null>(null)  // 容器大小变化观察器引用

  // 区域选择相关引用
  const selectionBoxRef = useRef<Graphics | null>(null)          // 选择框图形对象引用
  const isSelectedRef = useRef(false)                           // 是否正在区域选择状态
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null)  // 区域选择开始位置

  // 同步状态到引用，确保在回调中获取最新状态
  useEffect(() => {
    stateRef.current = state
  }, [state])

  /**
 * 执行元素调整大小操作
 * 
 * @function performResize
 * @param {Object} info - 调整大小信息
 * @param {string} info.id - 要调整大小的元素 ID
 * @param {ResizeDirection} info.direction - 调整大小的方向
 * @param {CanvasElement} info.startElement - 调整开始时的元素状态
 * @param {number} dx - 水平方向上的移动距离
 * @param {number} dy - 垂直方向上的移动距离
 * 
 * @description 
 * 根据调整方向和移动距离计算元素的新尺寸和位置：
 * - 东(e)/西(w)：调整宽度
 * - 南(s)/北(n)：调整高度
 * - 西(w)/北(n)：同时调整位置以保持对边不动
 */
  const performResize = useCallback(
    (
      info: {
        id: string
        direction: ResizeDirection
        startElement: CanvasElement
      },
      dx: number,
      dy: number
    ) => {
      const { direction, startElement, id } = info
      let { x, y, width, height } = startElement

      // 东方向：调整右边界
      if (direction.includes("e")) {
        width = clampSize(startElement.width + dx)
      }
      // 南方向：调整下边界
      if (direction.includes("s")) {
        height = clampSize(startElement.height + dy)
      }
      // 西方向：调整左边界，同时移动位置
      if (direction.includes("w")) {
        const updatedWidth = clampSize(startElement.width - dx)
        const delta = startElement.width - updatedWidth
        width = updatedWidth
        x = startElement.x + delta
      }
      // 北方向：调整上边界，同时移动位置
      if (direction.includes("n")) {
        const updatedHeight = clampSize(startElement.height - dy)
        const delta = startElement.height - updatedHeight
        height = updatedHeight
        y = startElement.y + delta
      }

      // 应用新的尺寸和位置
      mutateElements(
        (elements) =>
          elements.map((el) =>
            el.id === id ? { ...el, x, y, width, height } : el
          ) as CanvasElement[],
        { recordHistory: false }
      )
    },
    [mutateElements]
  )

  /**
 * 初始化 PixiJS 应用和设置事件监听器
 * 
 * @description 
 * 这个 useEffect 负责：
 * 1. 创建和初始化 PixiJS 应用实例
 * 2. 设置背景层和内容层
 * 3. 配置事件监听器（指针按下、移动、释放）
 * 4. 设置容器大小变化观察器
 * 5. 在组件卸载时清理资源
 */
  useEffect(() => {
    let destroyed = false

    // 更新背景层大小和交互区域
    const updateBackground = () => {
      const app = appRef.current
      const background = backgroundRef.current
      if (!app || !background) return
      background.clear()
      background.rect(0, 0, app.screen.width, app.screen.height)
      background.fill({ color: 0xffffff, alpha: 0 })
      background.hitArea = app.screen
    }

    // 初始化 PixiJS 应用
    const setup = async () => {
      if (!wrapperRef.current) return
      const app = new Application()
      await app.init({
        antialias: true,                    // 启用抗锯齿
        backgroundAlpha: 0,                  // 透明背景
        resolution: window.devicePixelRatio || 1,  // 设备像素比
        resizeTo: wrapperRef.current,       // 自动调整大小到容器
      })
      if (destroyed) {
        app.destroy()
        return
      }
      
      // 将画布添加到 DOM
      wrapperRef.current.appendChild(app.canvas)
      
      // 设置舞台交互模式
      app.stage.eventMode = "static"
      app.stage.hitArea = app.screen
      
      // 创建背景层（用于处理画布点击和平移）
      const background = new Graphics()
      background.alpha = 0
      background.eventMode = "static"
      background.cursor = "default"
      background.hitArea = app.screen
      app.stage.addChild(background)

      // 创建内容层（用于存放所有画布元素）
      const content = new Container()
      content.eventMode = "static"
      app.stage.addChild(content)

      // 保存引用
      appRef.current = app
      contentRef.current = content
      backgroundRef.current = background
      registerApp(app)

      // 设置容器大小变化观察器
      const resizeObserver = new ResizeObserver(() => {
        app.resize()
        updateBackground()
      })
      resizeObserver.observe(wrapperRef.current)
      resizeObserverRef.current = resizeObserver

      // 背景层指针按下事件处理
      background.on("pointerdown", (event: FederatedPointerEvent) => {
        // 平移模式：初始化平移状态
        if (stateRef.current.interactionMode === "pan") {
          panRef.current = {
            lastPointer: { x: event.global.x, y: event.global.y },
          }
          background.cursor = "grabbing"
        } 
        // 选择模式：处理区域选择
        else if (stateRef.current.interactionMode === "select") {
          const nativeEvent = event.originalEvent as unknown as MouseEvent;
          // 只有在没有修饰键且点击的是背景时才开始区域选择
          if (!(nativeEvent.shiftKey || nativeEvent.metaKey || nativeEvent.ctrlKey) && event.target === background) {
            // 记录选择开始位置
            const localPos = event.getLocalPosition(content);
            selectionStartRef.current = { x: localPos.x, y: localPos.y };
            isSelectedRef.current = true;

            // 创建选择框
            const selectionBox = new Graphics();
            selectionBox.lineStyle(1, SELECTION_COLOR, 0.8);
            selectionBox.fill({color: SELECTION_COLOR, alpha: 0.1});
            selectionBox.zIndex = 100;
            content.addChild(selectionBox);
            selectionBoxRef.current = selectionBox;
          }
        } else {
          // 其他模式：清除选择
          clearSelection()
        }
      })

      // 舞台指针移动事件处理
      app.stage.on("pointermove", (event: FederatedPointerEvent) => {
        const content = contentRef.current
        if (!content) return

        // 区域选择处理：更新选择框大小
        if (isSelectedRef.current && selectionStartRef.current && selectionBoxRef.current) {
          const localPos = event.getLocalPosition(content);
          const start = selectionStartRef.current;
          
          // 计算选择框的位置和尺寸
          const x = Math.min(start.x, localPos.x);
          const y = Math.min(start.y, localPos.y);
          const width = Math.abs(start.x - localPos.x);
          const height = Math.abs(start.y - localPos.y);

          // 绘制选择框
          const selectionBox = selectionBoxRef.current;
          selectionBox.clear();
          selectionBox.lineStyle(1, SELECTION_COLOR, 0.8);
          selectionBox.beginFill(SELECTION_COLOR, 0.1);
          selectionBox.drawRect(x, y, width, height);
          selectionBox.endFill();
          return;
        }

        // 调整大小处理：更新元素尺寸
        if (resizeRef.current) {
          const current = resizeRef.current
          const local = event.getLocalPosition(content)
          const dx = local.x - current.startPointer.x
          const dy = local.y - current.startPointer.y
          current.moved = true
          performResize(current, dx, dy)
          return
        }
        
        // 拖动处理：更新元素位置
        if (dragRef.current) {
          const current = dragRef.current
          const local = event.getLocalPosition(content)
          const dx = local.x - current.startPointer.x
          const dy = local.y - current.startPointer.y
          // 只有移动距离足够大才认为是拖动（避免误触）
          if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
            current.moved = true
            mutateElements(
              (elements) =>
                elements.map((el) => {
                  if (!current.ids.includes(el.id)) return el
                  const base = current.snapshot[el.id] ?? el
                  return { ...el, x: base.x + dx, y: base.y + dy }
                }) as CanvasElement[],
              { recordHistory: false }
            )
          }
          return
        }
        
        // 平移处理：更新画布视口
        if (panRef.current) {
          const last = panRef.current.lastPointer
          const dx = event.global.x - last.x
          const dy = event.global.y - last.y
          panRef.current.lastPointer = { x: event.global.x, y: event.global.y }
          panBy({ x: dx, y: dy })
        }
      })

      // 停止所有交互操作
      const stopInteractions = () => {
        // 区域选择完成处理
        if (isSelectedRef.current && selectionBoxRef.current && selectionStartRef.current) {
          const selectionBox = selectionBoxRef.current;
          // 获取选择框的边界
          const bounds = selectionBox.getBounds();
          const selectionRect = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);

          // 找出与选择框相交的所有元素
          const selectedElements = stateRef.current.elements.filter(elem => {
            const elemRect = new Rectangle( elem.x, elem.y, elem.width, elem.height );
            return selectionRect.intersects(elemRect); // 检查元素是否与选择框相交
          });

          // 更新选择状态
          if (selectedElements.length > 0) {
            setSelection(selectedElements.map((el) => el.id));
          } else {
            clearSelection();
          }

          // 清除选择框
          selectionBox.destroy();
          selectionBoxRef.current = null;
        }

        // 重置区域选择状态
        isSelectedRef.current = false;
        selectionStartRef.current = null;

        // 重置平移光标
        const background = backgroundRef.current
        if (panRef.current && background) {
          background.cursor = "default"
        }
        
        // 记录拖动操作的历史
        if (dragRef.current?.moved) {
          mutateElements(
            (elements) => elements,
            {
              historySnapshot: dragRef.current.historySnapshot,
            }
          )
        }
        
        // 记录调整大小操作的历史
        if (resizeRef.current?.moved) {
          mutateElements(
            (elements) => elements,
            {
              historySnapshot: resizeRef.current.historySnapshot,
            }
          )
        }
        
        // 清除所有交互状态
        dragRef.current = null
        resizeRef.current = null
        panRef.current = null
      }

      app.stage.on("pointerup", stopInteractions)
      app.stage.on("pointerupoutside", stopInteractions)
    }

    setup()

    return () => {
      destroyed = true
      resizeObserverRef.current?.disconnect()
      const app = appRef.current
      app?.stage.removeAllListeners()
      app?.destroy(true)
      registerApp(null)
      appRef.current = null
      contentRef.current = null
      backgroundRef.current = null
    }
  }, [clearSelection, mutateElements, panBy, registerApp, performResize, setSelection])

  /**
 * 处理元素指针按下事件
 * 
 * @function handleElementPointerDown
 * @param {FederatedPointerEvent} event - 指针事件对象
 * @param {string} elementId - 被点击的元素 ID
 * 
 * @description 
 * 处理元素点击和拖动开始：
 * 1. 根据修饰键决定是添加到选择还是替换选择
 * 2. 更新选择状态
 * 3. 初始化拖动状态
 */
  const handleElementPointerDown = useCallback(
    (event: FederatedPointerEvent, elementId: string) => {
      event.stopPropagation()
      if (stateRef.current.interactionMode !== "select") return
      const { selectedIds, elements } = stateRef.current
    const nativeEvent = event.originalEvent as unknown as
      | {
          shiftKey?: boolean
          metaKey?: boolean
          ctrlKey?: boolean
        }
      | undefined
    // 检查是否按下了修饰键（Shift/Ctrl/Cmd），用于多选
    const additive = Boolean(
      nativeEvent?.shiftKey || nativeEvent?.metaKey || nativeEvent?.ctrlKey
    )
    // 计算新的选择状态
    const selection = additive
      ? Array.from(new Set([...selectedIds, elementId]))  // 添加到现有选择
      : selectedIds.includes(elementId)
        ? selectedIds                                      // 已选中则保持不变
        : [elementId]                                      // 否则只选中当前元素
    setSelection(selection)
    const content = contentRef.current
    if (!content) return
    const local = event.getLocalPosition(content)
    // 创建选中元素的快照，用于拖动时的位置计算
    const snapshot: Record<string, CanvasElement> = {}
    elements.forEach((el) => {
      if (selection.includes(el.id)) {
        snapshot[el.id] = cloneElement(el)
      }
    })
    // 初始化拖动状态
    dragRef.current = {
      ids: selection,
      startPointer: local,
      snapshot,
      historySnapshot: cloneElements(elements),
      moved: false,
    }
  }, [setSelection])

  /**
 * 处理调整大小开始事件
 * 
 * @function handleResizeStart
 * @param {FederatedPointerEvent} event - 指针事件对象
 * @param {string} elementId - 要调整大小的元素 ID
 * @param {ResizeDirection} direction - 调整大小的方向
 * 
 * @description 
 * 初始化元素调整大小操作：
 * 1. 验证当前是否为选择模式
 * 2. 查找目标元素
 * 3. 记录初始状态和指针位置
 */
  const handleResizeStart = useCallback(
    (event: FederatedPointerEvent, elementId: string, direction: ResizeDirection) => {
      event.stopPropagation()
      if (stateRef.current.interactionMode !== "select") return
      const content = contentRef.current
      if (!content) return
      const element = stateRef.current.elements.find((el) => el.id === elementId)
      if (!element) return
      const local = event.getLocalPosition(content)
      // 初始化调整大小状态
      resizeRef.current = {
        id: elementId,
        direction,
        startPointer: local,
        startElement: cloneElement(element),  // 保存元素初始状态
        historySnapshot: cloneElements(stateRef.current.elements),  // 保存历史快照
        moved: false,
      }
    },
    []
  )

  /**
 * 渲染画布元素和选择控制柄
 * 
 * @description 
 * 当元素列表、选择状态或交互模式变化时：
 * 1. 清除现有内容
 * 2. 为每个元素创建可视化表示
 * 3. 为选中的单个元素添加调整大小控制柄
 */
  useEffect(() => {
    const content = contentRef.current
    const app = appRef.current
    if (!content || !app) return
    // 清除现有内容并销毁子对象
    content.removeChildren().forEach((child) => child.destroy({ children: true }))
    // 启用子元素排序（用于控制柄层级）
    content.sortableChildren = true
    
    // 为每个元素创建可视化表示
    state.elements.forEach((element) => {
      const selected = state.selectedIds.includes(element.id)
      const node = createShape(element, selected, state.interactionMode, (event) =>
        handleElementPointerDown(event, element.id)
      )
      node.zIndex = 1
      content.addChild(node)
      
      // 为选中的单个元素添加调整大小控制柄
      if (
        selected &&
        state.selectedIds.length === 1 &&
        state.interactionMode === "select"
      ) {
        // 创建控制柄容器
        const handlesLayer = new Container()
        handlesLayer.sortableChildren = true
        handlesLayer.zIndex = 10
        handlesLayer.position.set(element.x, element.y)
        handlesLayer.angle = element.rotation
        // 根据缩放级别调整控制柄大小
        const handleSize = Math.max(6, 10 / state.zoom)
        const edgeThickness = Math.max(16 / state.zoom, handleSize * 1.6)
        const activeDirection = resizeRef.current?.direction ?? null

        // 绘制调整大小控制柄
        const drawHandle = (
          target: Graphics,
          direction: ResizeDirection,
          opts: { hovered: boolean; active: boolean }
        ) => {
          const { hovered, active } = opts
          const isHighlighted = hovered || active
          const fill = isHighlighted ? HANDLE_ACTIVE_COLOR : 0xffffff
          const stroke = isHighlighted ? HANDLE_ACTIVE_COLOR : SELECTION_COLOR
          target.clear()
          
          // 根据方向绘制不同形状的控制柄
          if (direction === "n" || direction === "s") {
            // 南北方向：水平矩形
            target.roundRect(
              -handleSize,
              -handleSize / 2,
              handleSize * 2,
              handleSize,
              4
            )
          } else if (direction === "e" || direction === "w") {
            // 东西方向：垂直矩形
            target.roundRect(
              -handleSize / 2,
              -handleSize,
              handleSize,
              handleSize * 2,
              4
            )
          } else {
            // 角落方向：正方形
            target.roundRect(
              -handleSize / 2,
              -handleSize / 2,
              handleSize,
              handleSize,
              4
            )
          }
          target.fill({ color: fill })
          target.stroke({ width: active ? 1.6 : 1, color: stroke })
        }

        // 为每个方向创建调整大小控制柄
        RESIZE_DIRECTIONS.forEach((direction) => {
          const handle = new Graphics()
          handle.eventMode = "static"
          handle.cursor = RESIZE_CURSORS[direction]  // 设置对应方向的光标样式
          handle.zIndex = 2
          let hovered = false
          const isActive = activeDirection === direction
          const updateStyle = (forcedActive?: boolean) =>
            drawHandle(handle, direction, {
              hovered,
              active: forcedActive ?? isActive,
            })
          updateStyle()
          // 计算控制柄位置
          const pos = getHandlePosition(direction, element.width, element.height)
          handle.position.set(pos.x, pos.y)
          // 只显示当前活动的控制柄或所有控制柄
          handle.visible = !activeDirection || isActive

          // 设置控制柄的交互区域（比视觉区域更大，便于操作）
          switch (direction) {
            case "n":
              handle.hitArea = new Rectangle(
                -element.width / 2,
                -edgeThickness,
                element.width,
                edgeThickness * 2
              )
              break
            case "s":
              handle.hitArea = new Rectangle(
                -element.width / 2,
                -edgeThickness,
                element.width,
                edgeThickness * 2
              )
              break
            case "e":
              handle.hitArea = new Rectangle(
                -edgeThickness,
                -element.height / 2,
                edgeThickness * 2,
                element.height
              )
              break
            case "w":
              handle.hitArea = new Rectangle(
                -edgeThickness,
                -element.height / 2,
                edgeThickness * 2,
                element.height
              )
              break
            default:
              handle.hitArea = new Rectangle(
                -edgeThickness / 2,
                -edgeThickness / 2,
                edgeThickness,
                edgeThickness
              )
              break
          }

          // 控制柄事件处理
          handle.on("pointerdown", (event) => {
            hovered = true
            updateStyle(true)
            handleResizeStart(event, element.id, direction)
          })
          handle.on("pointerover", () => {
            hovered = true
            if (!isActive) updateStyle()
          })
          handle.on("pointerout", () => {
            hovered = false
            if (!isActive) updateStyle()
          })
          handlesLayer.addChild(handle)
        })
        content.addChild(handlesLayer)
      }
    })
  }, [
    state.elements,
    state.selectedIds,
    state.interactionMode,
    state.zoom,
    handleElementPointerDown,
    handleResizeStart,
  ])

  // 更新画布内容的位置和缩放
  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    // 根据平移和缩放状态更新内容容器的变换
    content.position.set(state.pan.x, state.pan.y)
    content.scale.set(state.zoom)
  }, [state.pan, state.zoom])

  // 更新背景光标样式
  useEffect(() => {
    const background = backgroundRef.current
    if (!background) return
    // 根据交互模式设置光标样式：平移模式显示抓手光标
    background.cursor = state.interactionMode === "pan" ? "grab" : "default"
  }, [state.interactionMode])

  // 渲染画布容器
  return <div ref={wrapperRef} className="h-full w-full rounded-[32px]" />
}
