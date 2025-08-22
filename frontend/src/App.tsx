import './App.css'
import UploadArea from './components/UploadArea'
import Gallery from './components/Gallery'
import './App.css'

function App() {
  return (
    <div className="app" style={{ maxWidth: 960, margin: '0 auto' }}>
      <h1>Manga Panel Viewer</h1>
      <p>Task 1: Project structure complete ✅</p>
      <h2>Task 2: File upload</h2>
      <UploadArea />
      <Gallery />
    </div>
  )
}

export default App
