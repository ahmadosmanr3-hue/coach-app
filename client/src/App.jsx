import { Navigate, Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import LoginPage from './pages/LoginPage.jsx'
import CoachBuilderPO from './pages/CoachBuilderPO.jsx'
import AdminPage from './pages/AdminPage.jsx'
import MealPlannerPage from './pages/MealPlannerPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import ClientAssessmentPage from './pages/ClientAssessmentPage.jsx'

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/assessment" element={<ClientAssessmentPage />} />
        <Route path="/builder" element={<CoachBuilderPO />} />
        <Route path="/meal-planner" element={<MealPlannerPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
