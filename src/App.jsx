import { useState } from 'react'
import Login from './pages/Login'
import ParentDashboard from './pages/ParentDashboard'
import KidView from './pages/KidView'
export default function App() {
  const [session, setSession] = useState(null)
  const [selectedKid, setSelectedKid] = useState(null)
  function handleLogin(sess) { setSession(sess); setSelectedKid(null) }
  function handleLogout() { setSession(null); setSelectedKid(null) }
  if (!session) return <Login onLogin={handleLogin} />
  if (session.role === 'parent' && selectedKid)
    return <KidView kid={selectedKid} isParent onBack={() => setSelectedKid(null)} onLogout={handleLogout} />
  if (session.role === 'parent')
    return <ParentDashboard session={session} onSelectKid={setSelectedKid} onLogout={handleLogout} />
  if (session.role === 'kid')
    return <KidView kid={session.kid} isParent={false} onLogout={handleLogout} />
  return null
}
