import { NavLink, Outlet } from 'react-router-dom'
import { LibraryIcon, NoteIcon, SparkIcon, UserIcon } from '../icons/AppIcons'

const navItems = [
  { to: '/app', label: '今天吃啥', icon: SparkIcon },
  { to: '/app/record', label: '记录', icon: NoteIcon },
  { to: '/app/library', label: '外卖库', icon: LibraryIcon },
  { to: '/app/profile', label: '我的', icon: UserIcon },
]

export function AppShell() {
  return (
    <div className="app-shell">
      <main className="app-content"><Outlet /></main>
      <nav className="bottom-nav" aria-label="主导航">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/app'} className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}>
            <Icon className="nav-icon" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}