import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing    from '@/pages/Landing'
import Dashboard  from '@/pages/Dashboard'
import Fleet      from '@/pages/Fleet'
import Skills     from '@/pages/Skills'
import WorldModel from '@/pages/WorldModel'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<Landing />}    />
        <Route path="/dashboard"   element={<Dashboard />}  />
        <Route path="/fleet"       element={<Fleet />}      />
        <Route path="/skills"      element={<Skills />}     />
        <Route path="/world-model" element={<WorldModel />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
