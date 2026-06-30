import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PETS, PET_LEVELS, PET_MSGS, ACCESSORY_SLOTS, getPetLevel, getNextLevel } from '../lib/constants'
import { useToast } from '../lib/toast'

// Per-emoji overlay positions relative to pet-overlay-wrap
const EQUIP_POS = {
  '🎩': { position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)', fontSize: '28px', zIndex: 3 },
  '👑': { position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', fontSize: '24px', zIndex: 3 },
  '🕶️': { position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', fontSize: '22px', zIndex: 3 },
  '🎀': { position: 'absolute', top: '56px', left: '50%', transform: 'translateX(-50%)', fontSize: '20px', zIndex: 3 },
}

// 4-corner positions for habitat decoration items
const CORNER_STYLES = [
  { position: 'absolute', top: '12px', left: '14px', fontSize: '22px', animationDelay: '0s' },
  { position: 'absolute', top: '12px', right: '14px', fontSize: '22px', animationDelay: '0.5s' },
  { position: 'absolute', bottom: '12px', left: '14px', fontSize: '22px', animationDelay: '1s' },
  { position: 'absolute', bottom: '12px', right: '14px', fontSize: '22px', animationDelay: '1.5s' },
]

// Build a map of accessory → minimum score to unlock it
const ACC_REQ = (() => {
  const req = {}
  for (const lvl of PET_LEVELS) {
    for (const a of lvl.acc) {
      if (!(a in req)) req[a] = lvl.min
    }
  }
  return req
})()

export default function Pet({ kid, totalEarned }) {
  const toast = useToast()
  const [msg, setMsg] = useState(null)
  const [anim, setAnim] = useState(false)
  const lsKey = `equipped_${kid.id}`
  const [equipped, setEquipped] = useState(() => {
    // Initialize from kid prop, fall back to localStorage
    if (kid.equipped_accessories && typeof kid.equipped_accessories === 'object') {
      return kid.equipped_accessories
    }
    try { return JSON.parse(localStorage.getItem(lsKey) || '{}') } catch { return {} }
  })

  const pet = PETS[kid.pet_type] || PETS.cat
  const level = getPetLevel(totalEarned)
  const nextLevel = getNextLevel(totalEarned)

  // Refresh from DB on mount (Pet unmounts when switching tabs, lsKey persists)
  useEffect(() => {
    supabase
      .from('kp_kids')
      .select('equipped_accessories')
      .eq('id', kid.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.equipped_accessories) {
          setEquipped(data.equipped_accessories)
          localStorage.setItem(lsKey, JSON.stringify(data.equipped_accessories))
        } else {
          // Column may not exist yet — use localStorage value already in state
          const stored = localStorage.getItem(lsKey)
          if (stored) try { setEquipped(JSON.parse(stored)) } catch {}
        }
      })
  }, [kid.id])

  function interact(type) {
    const msgs = PET_MSGS[type]
    setMsg(msgs[Math.floor(Math.random() * msgs.length)])
    setAnim(true)
    setTimeout(() => setMsg(null), 2000)
    setTimeout(() => setAnim(false), 600)
  }

  function saveEquipped(newEquipped) {
    setEquipped(newEquipped)
    localStorage.setItem(lsKey, JSON.stringify(newEquipped))
    supabase
      .from('kp_kids')
      .update({ equipped_accessories: newEquipped })
      .eq('id', kid.id)
  }

  function toggleSlot(slot, emoji) {
    const next = equipped[slot] === emoji ? null : emoji
    saveEquipped({ ...equipped, [slot]: next })
  }

  function clearSlot(slot) {
    saveEquipped({ ...equipped, [slot]: null })
  }

  const toNext = nextLevel ? nextLevel.min - totalEarned : 0
  const levelPct = nextLevel
    ? Math.round(((totalEarned - level.min) / (nextLevel.min - level.min)) * 100)
    : 100

  return (
    <div className="section pet-section">

      {/* ── Pet Display ── */}
      <div className="pet-habitat" style={{ background: level.habitatBg }}>
        <div className="pet-habitat-label">{level.habitat} {level.habitatLabel}</div>

        {level.items.map((item, i) => (
          <span key={i} className="habitat-item" style={CORNER_STYLES[i]}>{item}</span>
        ))}

        <div className={`pet-body ${anim ? 'pet-bounce' : ''}`}>
          <div className="pet-overlay-wrap">
            {Object.entries(equipped).map(([slot, emoji]) =>
              emoji ? <span key={slot} style={EQUIP_POS[emoji]}>{emoji}</span> : null
            )}
            <div className="pet-emoji">{pet.e}</div>
          </div>
        </div>

        {msg && <div className="pet-msg">{msg}</div>}
      </div>

      {/* ── Pet Info ── */}
      <div className="pet-info">
        <div className="pet-name-row">
          <span className="pet-name">{pet.n}</span>
          <span className="pet-level-badge">{level.label}</span>
        </div>
        <div className="pet-level-progress">
          <div className="week-progress-label">
            <span>累計 {totalEarned} 點</span>
            {nextLevel
              ? <span>下一階：{nextLevel.label}（還差 {toNext} 點）</span>
              : <span>已達最高等級！</span>}
          </div>
          <div className="week-progress-bar">
            <div className="week-progress-fill" style={{ width: levelPct + '%', background: kid.color }} />
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="pet-actions">
        <button className="pet-action-btn" onClick={() => interact('feed')}>🍎 餵食</button>
        <button className="pet-action-btn" onClick={() => interact('play')}>⚽ 玩耍</button>
        <button className="pet-action-btn" onClick={() => interact('sleep')}>💤 休息</button>
      </div>

      {/* ── Wardrobe ── */}
      <div className="pet-wardrobe">
        <div className="task-group-title">🎒 我的衣櫃</div>
        {Object.entries(ACCESSORY_SLOTS).map(([slot, { label, items }]) => (
          <div key={slot} className="wardrobe-row">
            <span className="wardrobe-slot-label">{label}</span>
            <div className="wardrobe-items">
              <button
                className={`wardrobe-item ${!equipped[slot] ? 'wardrobe-item-selected' : ''}`}
                onClick={() => clearSlot(slot)}
              >
                未戴
              </button>
              {items.map(emoji => {
                const isUnlocked = level.acc.includes(emoji)
                const isSelected = equipped[slot] === emoji
                return (
                  <button
                    key={emoji}
                    className={`wardrobe-item ${isSelected ? 'wardrobe-item-selected' : ''} ${!isUnlocked ? 'wardrobe-item-locked' : ''}`}
                    onClick={() => {
                      if (!isUnlocked) { toast(`累積 ${ACC_REQ[emoji]} 分解鎖`); return }
                      toggleSlot(slot, emoji)
                    }}
                  >
                    <span className="wardrobe-emoji">{emoji}</span>
                    {!isUnlocked && <span className="wardrobe-lock">🔒</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Growth Stages ── */}
      <div className="pet-levels-guide">
        <div className="task-group-title">成長階段</div>
        {PET_LEVELS.map((l, i) => (
          <div key={i} className={`level-row ${totalEarned >= l.min ? 'unlocked' : 'locked'}`}>
            <span>{l.habitat} {l.habitatLabel}</span>
            <span>{l.label}</span>
            <span>{l.min === 0 ? '初始' : `${l.min} 點`}</span>
            <span>{totalEarned >= l.min ? '✅' : '🔒'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
