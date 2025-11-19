import { CanvasProvider } from "./store/CanvasProvider"
import { TopBar } from "./components/layout/TopBar"
import { LeftPanel } from "./components/layout/LeftPanel"
import { CanvasArea } from "./components/layout/CanvasArea"
import { RightPanel } from "./components/layout/RightPanel"

const App = () => (
  <CanvasProvider>
    <div className="flex h-screen flex-col bg-canvas-background text-slate-900">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />
        <CanvasArea />
        <RightPanel />
      </div>
    </div>
  </CanvasProvider>
)

export default App
