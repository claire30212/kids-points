import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import { COLORS, PETS, calcScore } from '../lib/constants'

export default function ParentDashboard({ session, onSelectKid, onLogout }) {
  const toast = useToast()
  const [kids, setKids] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddKid, setShowAddKid] = useState(false)
  const [editKid, setEditKid] = useState(null)

  useEffect(() => { loadKids() }, [])

  async function loadKids() {
    setLoading(true)
    const { data } = await supabase
      .from('kp_kids')
      .select('*')
      .eq('family_id', session.family.id)
      .order('created_at')
    setKids(data || [])
    setLoading(false)
  }

  async function deleteKid(kid) {
    if (!confirm(`確定要刪除 ${kid.name}？所有資料將一併刪除。`)) return
    await supabase.from('kp_kids').delete().eq('id', kid.id)
    toast(`已刪除 ${kid.name}`)
    loadKids()
  }

  return (
    <div className="page">
      <header className="header">
        <div className="header-title">集！點！LA！</div>
        <div className="header-sub">{session.family.name} 家</div>
        <button className="btn-text" onClick={onLogout}>登出</button>
      </header>

      <div className="section-title">孩子列表</div>
      {loading ? <div className="loading">載入中...</div> : (
        <div className="kids-grid">
          {kids.map(kid => (
            <KidCard key={kid.id} kid={kid} onSelect={() => onSelectKid(kid)}
              onEdit={() => setEditKid(kid)} onDelete={() => deleteKid(kid)} />
          ))}
          <button className="kid-add-btn" onClick={() => setShowAddKid(true)}>＋ 新增孩子</button>
        </div>
      )}

      {showAddKid && (
        <KidForm familyId={session.family.id} onClose={() => setShowAddKid(false)} onSave={() => { setShowAddKid(false); loadKids() }} />
      )}
      {editKid && (
        <KidForm familyId={session.family.id} kid={editKid} onClose={() => setEditKid(null)} onSave={() => { setEditKid(null); loadKids() }} />
      )}
    </div>
  )
}

function KidCard({ kid, onSelect, onEdit, onDelete }) {
  const [score, setScore] = useState('...')
  useEffect(() => {
    supabase.from('kp_history').select('type,pts').eq('kid_id', kid.id)
      .then(({ data }) => setScore(calcScore(data || [])))
  }, [kid.id])
  const pet = PETS[kid.pet_type] || PETS.cat
  return (
    <div className="kid-card" style={{ borderColor: kid.color }}>
      <div className="kid-card-pet" style={{ background: kid.color + '33' }}>{pet.e}</div>
      <div className="kid-card-name">{kid.name}</div>
      <div className="kid-card-score">{score} 點</div>
      <div className="kid-card-actions">
        <button className="btn-sm btn-primary" onClick={onSelect}>查看</button>
        <button className="btn-sm btn-secondary" onClick={onEdit}>編輯</button>
        <button className="btn-sm btn-danger" onClick={onDelete}>刪除</button>
      </div>
    </div>
  )
}

function KidForm({ familyId, kid, onClose, onSave }) {
  const toast = useToast()
  const [name, setName] = useState(kid?.name || '')
  const [pin, setPin] = useState(kid?.pin || '')
  const [color, setColor] = useState(kid?.color || COLORS[0])
  const [petType, setPetType] = useState(kid?.pet_type || 'cat')
  const [weekGoal, setWeekGoal] = useState(kid?.week_goal || 50)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return toast('請填寫孩子名稱')
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) return toast('PIN 必須是 4 位數字')
    setSaving(true)
    if (kid) {
      const { error } = await supabase.from('kp_kids').update({ name: name.trim(), pin, color, pet_type: petType, week_goal: weekGoal }).eq('id', kid.id)
      if (error) { toast('儲存失敗：' + error.message); setSaving(false); return }
      toast('已更新！')
    } else {
      const { error } = await supabase.from('kp_kids').insert({ family_id: familyId, name: name.trim(), pin, color, pet_type: petType, week_goal: weekGoal })
      if (error) { toast('新增失敗：' + error.message); setSaving(false); return }
      toast('新增成功 🎉')
    }
    setSaving(false)
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{kid ? '編輯孩子' : '新增孩子'}</div>
        <label className="field-label">名稱</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="孩子的名字" />
        <label className="field-label">PIN（4 位數）</label>
        <input className="input" type="password" inputMode="numeric" maxLength={4}
          value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="設定登入密碼" />
        <label className="field-label">週目標積分</label>
        <input className="input" type="number" min={1} max={999} value={weekGoal} onChange={e => setWeekGoal(Number(e.target.value))} />
        <label className="field-label">顏色</label>
        <div className="color-picker">
          {COLORS.map(c => (
            <div key={c} className={`color-dot ${color===c?'selected':''}`}
              style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
        <label className="field-label">寵物</label>
        <div className="pet-picker">
          {Object.entries(PETS).map(([k, v]) => (
            <button key={k} className={`pet-btn ${petType===k?'selected':''}`} onClick={() => setPetType(k)}>
              {v.e} {v.n}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '儲存中...' : '儲存'}</button>
        </div>
      </div>
    </div>
  )
}
