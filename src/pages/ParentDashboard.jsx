import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import { COLORS, PETS, calcScore, calcWeekPts } from '../lib/constants'
import { LongPressDeleteBtn, focusScroll } from '../lib/ui'

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
      .from('kp_kids').select('*')
      .eq('family_id', session.family.id).order('created_at')
    setKids(data || [])
    setLoading(false)
  }

  async function deleteKid(kid) {
    if (!confirm(`確定刪除「${kid.name}」？\n將刪除所有任務、獎品和積分紀錄，無法復原。`)) return
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
        kids.length === 0 ? (
          <div className="empty-page-hint">
            還沒有孩子！點下方「＋ 新增孩子」開始使用 集！點！LA！🌟
          </div>
        ) : (
          <div className="kids-grid">
            {kids.map(kid => (
              <KidCard key={kid.id} kid={kid}
                onSelect={() => onSelectKid(kid)}
                onEdit={() => setEditKid(kid)}
                onDelete={() => deleteKid(kid)} />
            ))}
          </div>
        )
      )}
      <div style={{ padding: '0 16px 16px' }}>
        <button className="kid-add-btn" style={{ width: '100%' }} onClick={() => setShowAddKid(true)}>＋ 新增孩子</button>
      </div>

      {showAddKid && (
        <KidForm familyId={session.family.id} onClose={() => setShowAddKid(false)} onSave={() => { setShowAddKid(false); loadKids() }} />
      )}
      {editKid && (
        <KidForm familyId={session.family.id} kid={editKid} onClose={() => setEditKid(null)} onSave={() => { setEditKid(null); loadKids() }} />
      )}
    </div>
  )
}

function fmtDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getMonth()+1}/${d.getDate()}`
}

function KidCard({ kid, onSelect, onEdit, onDelete }) {
  const [score, setScore] = useState('...')
  const [weekPts, setWeekPts] = useState(null)
  const [lastRedeem, setLastRedeem] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.from('kp_history').select('type,pts,note,ts')
      .eq('kid_id', kid.id).order('ts', { ascending: false })
      .then(({ data }) => {
        setScore(calcScore(data || []))
        setWeekPts(calcWeekPts(data || []))
        const r = (data || []).find(h => h.type === 'spend' && h.note?.startsWith('兌換'))
        setLastRedeem(r || null)
      })
  }, [kid.id])

  const pet = PETS[kid.pet_type] || PETS.cat
  const weekGoal = kid.week_goal || 0
  const achieved = weekPts !== null && weekGoal > 0 && weekPts >= weekGoal
  const shortBy = weekGoal > 0 && weekPts !== null ? Math.max(0, weekGoal - weekPts) : 0

  return (
    <div className="kid-card" style={{ borderColor: kid.color }}>
      <div className="kid-card-pet" style={{ background: kid.color + '33' }}>{pet.e}</div>
      <div className="kid-card-name">{kid.name}</div>
      <div className="kid-card-score">{score} 點</div>
      {weekPts !== null && weekGoal > 0 && (
        <div className={`kid-card-week-tag ${achieved ? 'tag-achieved' : 'tag-behind'}`}>
          {achieved ? '🎊 本週已達標' : `⚠️ 未達標，差 ${shortBy} 分`}
        </div>
      )}
      <div className="kid-card-redeem">
        {lastRedeem === undefined
          ? ''
          : lastRedeem
            ? `最近兌換：${lastRedeem.note.replace('兌換：', '')}（${fmtDate(lastRedeem.ts)}）`
            : '尚未兌換任何獎品'
        }
      </div>
      <div className="kid-card-actions">
        <button className="btn-sm btn-primary" onClick={onSelect}>查看</button>
        <button className="btn-sm btn-secondary" onClick={onEdit}>編輯</button>
        <LongPressDeleteBtn onDelete={onDelete} />
      </div>
    </div>
  )
}

function KidForm({ familyId, kid, onClose, onSave }) {
  const toast = useToast()
  const [name, setName] = useState(kid?.name || '')
  const [pin, setPin] = useState(kid?.pin || '')
  const [showPin, setShowPin] = useState(!!kid) // show PIN when editing
  const [color, setColor] = useState(kid?.color || COLORS[0])
  const [petType, setPetType] = useState(kid?.pet_type || 'cat')
  const [weekGoal, setWeekGoal] = useState(kid?.week_goal ? String(kid.week_goal) : '')
  const [weekPenalty, setWeekPenalty] = useState(kid?.week_penalty || '')
  const [saving, setSaving] = useState(false)
  const mouseDownTarget = useRef(null)

  async function save() {
    const weekGoalNum = parseInt(weekGoal)
    if (!name.trim()) return toast('請填寫孩子名稱')
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) return toast('PIN 必須是 4 位數字')
    if (!weekGoalNum || weekGoalNum < 1) return toast('週目標至少 1 點')
    setSaving(true)
    if (kid) {
      const { error } = await supabase.from('kp_kids').update({ name: name.trim(), pin, color, pet_type: petType, week_goal: weekGoalNum, week_penalty: weekPenalty.trim() }).eq('id', kid.id)
      if (error) { toast('儲存失敗：' + error.message); setSaving(false); return }
      toast('已更新！')
    } else {
      const { error } = await supabase.from('kp_kids').insert({ family_id: familyId, name: name.trim(), pin, color, pet_type: petType, week_goal: weekGoalNum, week_penalty: weekPenalty.trim() })
      if (error) { toast('新增失敗：' + error.message); setSaving(false); return }
      toast('新增成功 🎉')
    }
    setSaving(false)
    onSave()
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={e => { mouseDownTarget.current = e.target }}
      onClick={e => { if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) onClose() }}
    >
      <div className="modal-card">
        <div className="modal-title">{kid ? '編輯孩子' : '新增孩子'}</div>
        <label className="field-label">名稱</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} onFocus={focusScroll} placeholder="孩子的名字" />

        <label className="field-label">PIN（4 位數）</label>
        <div className="pin-wrap">
          <input
            className="input"
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,4))}
            onFocus={focusScroll}
            placeholder="設定登入密碼"
          />
          <button className="pin-toggle" onClick={() => setShowPin(v => !v)}>{showPin ? '🙈' : '👁️'}</button>
        </div>

        <label className="field-label">週目標積分</label>
        <input className="input" type="text" inputMode="numeric" value={weekGoal} onChange={e => setWeekGoal(e.target.value)} onFocus={focusScroll} placeholder="例如：50" />

        <label className="field-label">未達標懲罰（選填）</label>
        <input className="input" value={weekPenalty} onChange={e => setWeekPenalty(e.target.value)} onFocus={focusScroll} placeholder="例如：本週零用錢扣50元" />

        <label className="field-label">顏色</label>
        <div className="color-picker">
          {COLORS.map(c => (
            <div key={c} className={`color-dot ${color===c?'selected':''}`} style={{ background: c }} onClick={() => setColor(c)} />
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
