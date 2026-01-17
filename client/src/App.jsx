import { Navigate, Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import LoginPage from './pages/LoginPage.jsx'
import BuilderPage from './pages/BuilderPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import MealPlannerPage from './pages/MealPlannerPage.jsx'

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/builder" element={<BuilderPage />} />
        <Route path="/meal-planner" element={<MealPlannerPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
