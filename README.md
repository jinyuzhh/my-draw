# my-draw

# Figma 风格设计工具

一个基于 React + TypeScript + PixiJS 开发的现代化图形设计工具，支持创建和编辑各种设计元素。

## 🚀 项目启动步骤

### 环境要求
- Node.js (推荐版本 18.x 或更高)
- npm 或 yarn 包管理器

### 安装依赖
```bash
npm install
```

### 开发环境启动
```bash
npm run dev
```
应用将在 `http://localhost:5173` 启动，支持热重载。

### 生产环境构建
```bash
npm run build
```
构建结果将输出到 `dist/` 目录。

### 预览构建结果
```bash
npm run preview
```

### 代码质量检查
```bash
npm run lint
```

## 📁 项目结构

```
src/
├── components/          # React 组件
│   ├── canvas/         # 画布相关组件
│   └── layout/         # 布局组件（顶部工具栏、左右面板等）
├── store/              # 状态管理
├── types/              # TypeScript 类型定义
├── assets/             # 静态资源
└── App.tsx             # 主应用组件
```

## 🛠 技术栈

- **React 19.2.0** - 前端框架
- **TypeScript** - 类型安全
- **Vite 7.2.2** - 构建工具
- **PixiJS 8.14.2** - 2D 图形渲染引擎
- **Tailwind CSS 3.4.4** - CSS 框架

## 🎯 主要功能

- **元素创建**: 支持矩形、圆形、三角形、文本、图片等元素
- **交互操作**: 拖拽、缩放、旋转、选择
- **画布控制**: 平移、缩放、撤销/重做
- **图形效果**: 抗锯齿、透明度、滤镜效果
- **状态持久化**: 自动保存到本地存储

## 📝 代码提交规范

### 提交信息格式
我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### 提交类型 (Type)

- **feat**: 新功能
- **fix**: 修复 bug
- **docs**: 文档更新
- **style**: 代码格式调整（不影响功能）
- **refactor**: 代码重构
- **test**: 测试相关
- **chore**: 构建过程或辅助工具的变动

### 示例

```bash
# 添加新功能
git commit -m "feat(canvas): 添加图片拖拽上传功能"

# 修复 bug
git commit -m "fix(selection): 修复多选时选择框显示异常"

# 文档更新
git commit -m "docs(readme): 更新项目启动说明"

# 代码重构
git commit -m "refactor(types): 优化画布元素类型定义"
```

### 提交前检查

1. **代码质量**: 运行 `npm run lint` 确保没有语法错误
2. **功能测试**: 在提交前测试相关功能是否正常工作
3. **代码风格**: 保持代码风格一致性

### 分支命名规范

- **功能分支**: `feature/功能名称`
- **修复分支**: `fix/问题描述`
- **文档分支**: `docs/文档内容`

## 🔧 开发建议

1. **组件化开发**: 保持组件职责单一，便于维护和复用
2. **类型安全**: 充分利用 TypeScript 的类型系统
3. **状态管理**: 合理使用 React Context 管理全局状态
4. **性能优化**: 注意 PixiJS 渲染性能，避免不必要的重绘

## 📄 许可证

MIT License
