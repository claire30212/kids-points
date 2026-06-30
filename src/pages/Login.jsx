import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'

export default function Login({ onLogin }) {
  const toast = useToast()
  const [mode, setMode] = useState('choose') // choose | parent-login | parent-register | kid-pin | forgot-password
  const [familyName, setFamilyName] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const handlingRef = useRef(false)

  function resetFields() {
    setFamilyName('')
    setPassword('')
    setPin('')
  }

  async function handleParentRegister() {
    if (handlingRef.current) return
    handlingRef.current = true
    setLoading(true)
    try {
      if (!familyName.trim() || !password.trim()) return toast('請填寫家庭名稱與密碼')
      if (password.length < 4) return toast('密碼至少 4 碼')
      const { data, error } = await supabase
        .from('kp_families')
        .insert({ name: familyName.trim(), password_hash: password })
        .select()
        .single()
      if (error) return toast('建立失敗：' + error.message)
      toast('歡迎！家庭已建立 🎉')
      onLogin({ role: 'parent', family: data })
    } finally {
      setLoading(false)
      handlingRef.current = false
    }
  }

  async function handleParentLogin() {
    if (handlingRef.current) return
    handlingRef.current = true
    setLoading(true)
    try {
      if (!familyName.trim() || !password.trim()) return toast('請填寫家庭名稱與密碼')
      const { data, error } = await supabase
        .from('kp_families')
        .select('*')
        .eq('name', familyName.trim())
        .eq('password_hash', password)
        .maybeSingle()
      if (error || !data) return toast('帳號或密碼錯誤')
      toast('歡迎回來！')
      onLogin({ role: 'parent', family: data })
    } finally {
      setLoading(false)
      handlingRef.current = false
    }
  }

  async function handleKidPin() {
    if (pin.length !== 4) return toast('請輸入 4 位數 PIN')
    setLoading(true)
    const { data, error } = await supabase
      .from('kp_kids')
      .select('*')
      .eq('pin', pin)
      .maybeSingle()
    setLoading(false)
    if (error || !data) return toast('PIN 錯誤，找不到孩子帳號')
    toast(`${data.name} 你好！`)
    onLogin({ role: 'kid', kid: data })
  }

  if (mode === 'choose') return (
    <div className="page-center">
      <div className="login-card">
        <div className="login-logo">集！點！LA！</div>
        <p className="login-sub">親子積分成長記錄</p>
        <button className="btn-primary" onClick={() => { resetFields(); setMode('parent-login') }}>家長登入</button>
        <button className="btn-secondary" onClick={() => { resetFields(); setMode('kid-pin') }}>孩子登入（PIN）</button>
        <button className="btn-text" onClick={() => { resetFields(); setMode('parent-register') }}>初次使用？建立家庭帳號</button>
      </div>
    </div>
  )

  if (mode === 'parent-register') return (
    <div className="page-center">
      <div className="login-card">
        <button className="btn-back" onClick={() => setMode('choose')}>← 返回</button>
        <div className="login-logo">建立家庭</div>
        <input className="input" placeholder="家庭名稱（例如：林家）" value={familyName} onChange={e => setFamilyName(e.target.value)} />
        <input className="input" type="password" placeholder="設定密碼（至少 4 碼）" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="btn-primary" onClick={handleParentRegister} disabled={loading}>
          {loading ? '建立中...' : '建立帳號'}
        </button>
      </div>
    </div>
  )

  if (mode === 'parent-login') return (
    <div className="page-center">
      <div className="login-card">
        <button className="btn-back" onClick={() => { resetFields(); setMode('choose') }}>← 返回</button>
        <div className="login-logo">家長登入</div>
        <input className="input" placeholder="家庭名稱" value={familyName} onChange={e => setFamilyName(e.target.value)} />
        <input className="input" type="password" placeholder="密碼" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="btn-primary" onClick={handleParentLogin} disabled={loading}>
          {loading ? '登入中...' : '登入'}
        </button>
        <button className="btn-text" onClick={() => { resetFields(); setMode('parent-register') }}>還沒有帳號？建立家庭</button>
        <button className="btn-text" style={{ fontSize: '0.8em', opacity: 0.6 }} onClick={() => { resetFields(); setMode('forgot-password') }}>忘記密碼？</button>
      </div>
    </div>
  )

  if (mode === 'kid-pin') return (
    <div className="page-center">
      <div className="login-card">
        <button className="btn-back" onClick={() => setMode('choose')}>← 返回</button>
        <div className="login-logo">孩子登入</div>
        <p className="login-sub">輸入你的 4 位數 PIN</p>
        <input
          className="input input-pin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="●●●●"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
        <button className="btn-primary" onClick={handleKidPin} disabled={loading || pin.length !== 4}>
          {loading ? '確認中...' : '進入'}
        </button>
      </div>
    </div>
  )

  if (mode === 'forgot-password') return (
    <div className="page-center">
      <div className="login-card">
        <button className="btn-back" onClick={() => { resetFields(); setMode('parent-login') }}>← 返回</button>
        <div className="login-logo">忘記密碼</div>
        <p className="login-sub">請輸入你的家庭名稱</p>
        <input className="input" placeholder="家庭名稱" value={familyName} onChange={e => setFamilyName(e.target.value)} />
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9f0d8', borderRadius: '8px', fontSize: '0.9em', color: '#7a5c1e', textAlign: 'center' }}>
          <p style={{ margin: 0 }}>請聯繫管理者協助重設密碼</p>
          {familyName.trim() && <p style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>帳號：{familyName.trim()}</p>}
        </div>
      </div>
    </div>
  )

  return null
}
