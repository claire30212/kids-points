import { useState } from 'react'
import { PETS, PET_LEVELS, PET_MSGS, getPetLevel, getNextLevel } from '../lib/constants'

export default function Pet({ kid, totalEarned }) {
  const [msg, setMsg] = useState(null)
  const [anim, setAnim] = useState(false)

  const pet = PETS[kid.pet_type] || PETS.cat
  const level = getPetLevel(totalEarned)
  const nextLevel = getNextLevel(totalEarned)

  function interact(type) {
    const msgs = PET_MSGS[type]
    const m = msgs[Math.floor(Math.random() * msgs.length)]
    setMsg(m)
    setAnim(true)
    setTimeout(() => setMsg(null), 2000)
    setTimeout(() => setAnim(false), 600)
  }

  const toNext = nextLevel ? nextLevel.min - totalEarned : 0
  const levelPct = nextLevel
    ? Math.round(((totalEarned - level.min) / (nextLevel.min - level.min)) * 100)
    : 100

  return (
    <div className="section pet-section">
      <div className="pet-habitat" style={{ background: level.habitatBg }}>
        <div className="pet-habitat-label">{level.habitat} {level.habitatLabel}</div>
        {level.items.length > 0 && (
          <div className="pet-habitat-items">
            {level.items.map((item, i) => <span key={i} className="habitat-item">{item}</span>)}
          </div>
        )}

        <div className={`pet-body ${anim ? 'pet-bounce' : ''}`}>
          <div className="pet-emoji">{pet.e}</div>
          {level.acc.length > 0 && (
            <div className="pet-accessories">
              {level.acc.map((a, i) => <span key={i} className="pet-acc">{a}</span>)}
            </div>
          )}
        </div>

        {msg && <div className="pet-msg">{msg}</div>}
      </div>

      <div className="pet-info">
        <div className="pet-name-row">
          <span className="pet-name">{pet.n}</span>
          <span className="pet-level-badge">{level.label}</span>
        </div>
        <div className="pet-level-progress">
          <div className="week-progress-label">
            <span>累計 {totalEarned} 點</span>
            {nextLevel && <span>下一階：{nextLevel.label}（還差 {toNext} 點）</span>}
            {!nextLevel && <span>已達最高等級！</span>}
          </div>
          <div className="week-progress-bar">
            <div className="week-progress-fill" style={{ width: levelPct + '%', background: kid.color }} />
          </div>
        </div>
      </div>

      <div className="pet-actions">
        <button className="pet-action-btn" onClick={() => interact('feed')}>🍎 餵食</button>
        <button className="pet-action-btn" onClick={() => interact('play')}>⚽ 玩耍</button>
        <button className="pet-action-btn" onClick={() => interact('sleep')}>💤 休息</button>
      </div>

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
