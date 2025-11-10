import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [apiStatus, setApiStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Test backend connection
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setApiStatus(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error connecting to backend:', err)
        setApiStatus({ status: 'error', message: 'Backend not connected' })
        setLoading(false)
      })
  }, [])

  return (
    <div className="app">
      <h1>Smart Book Translator</h1>
      <div className="card">
        {loading ? (
          <p>Checking backend connection...</p>
        ) : (
          <div>
            <p><strong>Backend Status:</strong> {apiStatus?.status || 'unknown'}</p>
            <p>{apiStatus?.message || 'No message'}</p>
          </div>
        )}
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
    </div>
  )
}

export default App
