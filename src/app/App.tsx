import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { GuestRoute, ProtectedRoute } from '../features/auth/AuthRoutes'
import { AuthPage } from '../pages/Auth/AuthPage'
import { LibraryPage } from '../pages/Library/LibraryPage'
import { StoreDetailPage } from '../pages/Library/StoreDetailPage'
import { ProfilePage } from '../pages/Profile/ProfilePage'
import { RecordPage } from '../pages/Record/RecordPage'
import { SelfDeployPage } from '../pages/Showcase/SelfDeployPage'
import { ShowcasePage } from '../pages/Showcase/ShowcasePage'
import { TodayPage } from '../pages/Today/TodayPage'

export default function App() {
  return (
    <Routes>
      <Route index element={<ShowcasePage />} />
      <Route path="deploy" element={<SelfDeployPage />} />
      <Route element={<GuestRoute />}><Route path="auth" element={<AuthPage />} /></Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="app" element={<TodayPage />} />
          <Route path="app/record" element={<RecordPage />} />
          <Route path="app/library" element={<LibraryPage />} />
          <Route path="app/library/:storeId" element={<StoreDetailPage />} />
          <Route path="app/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}