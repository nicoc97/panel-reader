import { useState } from 'react'
import './App.css'
import UploadArea from './components/UploadArea'
import Gallery from './components/Gallery'

function App() {
  const [refreshKey, setRefreshKey] = useState(0)
  const handleUploadSuccess = () => setRefreshKey((prev) => prev + 1)

  return (
    <div className="app" style={{ maxWidth: 960, margin: '0 auto' }}>
      <h1>Manga Panel Viewer</h1>
      <p>Task 1: Project structure complete ✅</p>
      <h2>Task 2: File upload</h2>
      <UploadArea onUploadSuccess={handleUploadSuccess} />
      <Gallery refreshKey={refreshKey} />
    </div>
  )
}

export default App
