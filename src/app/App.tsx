import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { GuestRoute, ProtectedRoute } from '../features/auth/AuthRoutes'
import { AuthPage } from '../pages/Auth/AuthPage'
import { LibraryPage } from '../pages/Library/LibraryPage'
import { StoreDetailPage } from '../pages/Library/StoreDetailPage'
import { ProfilePage } from '../pages/Profile/ProfilePage'
import { RecordPage } from '../pages/Record/RecordPage'
import { TodayPage } from '../pages/Today/TodayPage'

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="auth" element={<AuthPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<TodayPage />} />
          <Route path="record" element={<RecordPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="library/:storeId" element={<StoreDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
