import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Citations from './pages/Citations'
import CitationDetail from './pages/CitationDetail'
import ManualEntry from './pages/Admin/ManualEntry'
import ReviewQueue from './pages/Admin/ReviewQueue'
import PeopleManager from './pages/Admin/PeopleManager'
import SourceManager from './pages/Admin/SourceManager'
<<<<<<< HEAD
=======
import Intelligence from './pages/Admin/Intelligence'
>>>>>>> f3759bd (initial commit)

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/citations" element={<Citations />} />
          <Route path="/citations/:id" element={<CitationDetail />} />
          <Route path="/admin" element={<ManualEntry />} />
          <Route path="/admin/review-queue" element={<ReviewQueue />} />
          <Route path="/admin/people" element={<PeopleManager />} />
          <Route path="/admin/sources" element={<SourceManager />} />
<<<<<<< HEAD
=======
          <Route path="/admin/intelligence" element={<Intelligence />} />
>>>>>>> f3759bd (initial commit)
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
