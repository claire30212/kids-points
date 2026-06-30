import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PETS, PET_LEVELS, PET_MSGS, ACCESSORIES, getPetLevel, getNextLevel } from '../lib/constants'
import { useToast } from '../lib/toast'

const RARITY_ORDER = { common: 0, rare: 1, legendary: 2 }

// Group accessories by slot, sorted by rarity
const ACC_BY_SLOT = (() => {
  const map = { head: [], face: [], neck: [] }
  Object.entries(ACCESSORIES).forEach(([key, acc]) => map[acc.slot].push({ key, ...acc }))
  Object.keys(map).forEach(slot =>
    map[slot].sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity])
  )
  return map
})()

const SLOT_LABEL = { head: '頭部', face: '臉部', neck: '頸部' }

// Overlay position per emoji relative to pet-overlay-wrap
const EQUIP_POS = {
  '🎩': { position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)', fontSize: '28px', zIndex: 3 },
  '👑': { position: 'absolute', top: '-38px', left: '50%', transform: 'translateX(-50%)', fontSize: '24px', zIndex: 3 },
  '🎓': { position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)', fontSize: '26px', zIndex: 3 },
  '😇': { position: 'absolute', top: '-44px', left: '50%', transform: 'translateX(-50%)', fontSize: '22px', zIndex: 3 },
  '🎪': { position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', fontSize: '26px', zIndex: 3 },
  '🕶️': { position: 'absolute', top: '20px',  left: '50%', transform: 'translateX(-50%)', fontSize: '22px', zIndex: 3 },
  '🥽': { position: 'absolute', top: '18px',  left: '50%', transform: 'translateX(-50%)', fontSize: '22px', zIndex: 3 },
  '👓': { position: 'absolute', top: '20px',  left: '50%', transform: 'translateX(-50%)', fontSize: '20px', zIndex: 3 },
  '🎀': { position: 'absolute', top: '56px',  left: '50%', transform: 'translateX(-50%)', fontSize: '20px', zIndex: 3 },
  '🧣': { position: 'absolute', top: '54px',  left: '50%', transform: 'translateX(-50%)', fontSize: '20px', zIndex: 3 },
  '💎': { position: 'absolute', top: '58px',  left: '50%', transform: 'translateX(-50%)', fontSize: '18px', zIndex: 3 },
  '🌟': { position: 'absolute', top: '56px',  left: '50%', transform: 'translateX(-50%)', fontSize: '18px', zIndex: 3 },
}

const CORNER_STYLES = [
  { position: 'absolute', top: '12px',    left: '14px',  fontSize: '22px', animationDelay: '0s' },
  { position: 'absolute', top: '12px',    right: '14px', fontSize: '22px', animationDelay: '0.5s' },
  { position: 'absolute', bottom: '12px', left: '14px',  fontSize: '22px', animationDelay: '1s' },
  { position: 'absolute', bottom: '12px', right: '14px', fontSize: '22px', animationDelay: '1.5s' },
]

const CONFETTI = [
  { e: '⭐', left: '6%' }, { e: '🌟', left: '20%' }, { e: '✨', left: '34%' },
  { e: '💫', left: '50%' }, { e: '🎊', left: '64%' }, { e: '🎉', left: '78%' },
  { e: '⭐', left: '88%' }, { e: '✨', left: '44%' },
]

const RARITY_LABEL = { common: '普通', rare: '稀有', legendary: '夢幻' }

function getMoodInfo(m) {
  if (m >= 70) return { text: '心情很好！',        icon: '😸', color: '#4CAF50' }
  if (m >= 40) return { text: '心情普通',           icon: '🐱', color: '#FFC107' }
  return        { text: '好想你，快來陪我吧',       icon: '😿', color: '#FF6B4A' }
}

export default function Pet({ kid, totalEarned }) {
  const toast = useToast()
  const [msgText, setMsgText] = useState(null)
  const [anim, setAnim] = useState(false)
  const [sleepAnim, setSleepAnim] = useState(false)
  const [celebration, setCelebration] = useState(null)

  const lsKey        = `equipped_${kid.id}`
  const moodLsKey    = `mood_${kid.id}`
  const moodTsLsKey  = `mood_ts_${kid.id}`
  const notifiedLsKey = `notified_acc_${kid.id}`

  const [equipped, setEquipped] = useState(() => {
    if (kid.equipped_accessories && typeof kid.equipped_accessories === 'object')
      return kid.equipped_accessories
    try { return JSON.parse(localStorage.getItem(lsKey) || '{}') } catch { return {} }
  })

  const [mood, setMood] = useState(() => {
    if (typeof kid.pet_mood === 'number') return kid.pet_mood
    const v = localStorage.getItem(moodLsKey)
    return v ? parseInt(v, 10) : 80
  })

  const pet      = PETS[kid.pet_type] || PETS.cat
  const level    = getPetLevel(totalEarned)
  const nextLevel = getNextLevel(totalEarned)
  const levelIdx = PET_LEVELS.findIndex(l => l === level)

  // On mount: sync from DB, apply decay, check new unlock celebrations
  useEffect(() => {
    supabase
      .from('kp_kids')
      .select('equipped_accessories, pet_mood, pet_mood_updated_at')
      .eq('id', kid.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          if (data.equipped_accessories) {
            setEquipped(data.equipped_accessories)
            localStorage.setItem(lsKey, JSON.stringify(data.equipped_accessories))
          }
          const base = typeof data.pet_mood === 'number' ? data.pet_mood : mood
          const ts   = data.pet_mood_updated_at
            ? new Date(data.pet_mood_updated_at)
            : new Date(localStorage.getItem(moodTsLsKey) || Date.now())
          applyDecay(base, ts)
        } else {
          // columns not yet created — fall back to localStorage
          const stored = localStorage.getItem(lsKey)
          if (stored) try { setEquipped(JSON.parse(stored)) } catch {}
          const ts = new Date(localStorage.getItem(moodTsLsKey) || Date.now())
          applyDecay(mood, ts)
        }
      })

    // Unlock celebration check
    const notified = JSON.parse(localStorage.getItem(notifiedLsKey) || '[]')
    const newUnlocks = Object.entries(ACCESSORIES)
      .filter(([key, acc]) => totalEarned >= acc.unlockAt && !notified.includes(key))
    if (newUnlocks.length > 0) {
      const [key, acc] = newUnlocks[0]
      setCelebration({ key, ...acc })
      // Mark all newly-unlocked as notified at once
      localStorage.setItem(notifiedLsKey, JSON.stringify([
        ...notified, ...newUnlocks.map(([k]) => k)
      ]))
    }
  }, [kid.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function applyDecay(base, updatedAt) {
    const days = Math.floor((Date.now() - updatedAt.getTime()) / 86400000)
    const next = days > 0 ? Math.max(0, base - days * 10) : base
    setMood(next)
    if (days > 0) persistMood(next)
    else localStorage.setItem(moodLsKey, String(base))
  }

  function persistMood(val) {
    localStorage.setItem(moodLsKey, String(val))
    localStorage.setItem(moodTsLsKey, new Date().toISOString())
    supabase.from('kp_kids')
      .update({ pet_mood: val, pet_mood_updated_at: new Date().toISOString() })
      .eq('id', kid.id)
      .then(() => {})
  }

  function showMsg(type) {
    const msgs = PET_MSGS[type]
    setMsgText(msgs[Math.floor(Math.random() * msgs.length)])
    setTimeout(() => setMsgText(null), 2000)
  }

  function interact(type) {
    if (sleepAnim) return

    if (type === 'sleep') {
      setSleepAnim(true)
      showMsg('sleep')
      setTimeout(() => {
        setSleepAnim(false)
        const next = Math.min(100, mood + 10)
        setMood(next)
        persistMood(next)
      }, 3000)
      return
    }

    showMsg(type)
    setAnim(true)
    setTimeout(() => setAnim(false), 600)

    const delta = 15 // feed & play both +15
    const next = Math.min(100, mood + delta)
    setMood(next)
    persistMood(next)
  }

  function saveEquipped(next) {
    setEquipped(next)
    localStorage.setItem(lsKey, JSON.stringify(next))
    supabase.from('kp_kids').update({ equipped_accessories: next }).eq('id', kid.id).then(() => {})
  }

  function toggleSlot(slot, emoji) {
    const next = equipped[slot] === emoji ? null : emoji
    saveEquipped({ ...equipped, [slot]: next })
  }

  const toNext  = nextLevel ? nextLevel.min - totalEarned : 0
  const levelPct = nextLevel
    ? Math.round(((totalEarned - level.min) / (nextLevel.min - level.min)) * 100)
    : 100
  const moodInfo = getMoodInfo(mood)

  return (
    <div className="section pet-section">

      {/* ── Unlock Celebration Overlay ── */}
      {celebration && (
        <div className="unlock-overlay" onClick={() => setCelebration(null)}>
          <div className="unlock-card" onClick={e => e.stopPropagation()}>
            <div className="unlock-confetti" aria-hidden="true">
              {CONFETTI.map(({ e, left }, i) => (
                <span key={i} className="confetti-piece" style={{ '--i': i, left, top: '-10%' }}>{e}</span>
              ))}
            </div>
            <div className="unlock-title">✨ 解鎖新配件！</div>
            <div className="unlock-emoji-anim">
              <span className="unlock-emoji">{celebration.emoji}</span>
            </div>
            <div className="unlock-item-label">{celebration.label}</div>
            <div className={`unlock-rarity-badge rarity-badge-${celebration.rarity}`}>
              {RARITY_LABEL[celebration.rarity]}
            </div>
            <button className="btn-primary unlock-close-btn" onClick={() => setCelebration(null)}>太棒了！</button>
          </div>
        </div>
      )}

      {/* ── Pet Habitat ── */}
      <div className={`pet-habitat habitat-lv${levelIdx}`}>

        {/* Scene layer – first child so it stays at back */}
        <div className="habitat-scene" aria-hidden="true">
          {levelIdx === 0 && <>
            <div className="sc-grass" />
            <div className="sc-cloud" style={{top:'16%',left:'8%'}} />
            <div className="sc-cloud sc-cloud-sm" style={{top:'10%',right:'12%'}} />
            <div className="sc-cloud sc-cloud-sm" style={{top:'22%',left:'38%'}} />
          </>}
          {levelIdx === 1 && <>
            <div className="sc-hut" />
            <div className="sc-star" style={{top:'18%',left:'16%'}} />
            <div className="sc-star" style={{top:'24%',right:'20%',animationDelay:'1.2s'}} />
          </>}
          {levelIdx === 2 && <>
            <div className="sc-house">
              <div className="sc-win" /><div className="sc-win sc-win-r" />
            </div>
            <div className="sc-cloud sc-cloud-drift" style={{top:'18%',left:'6%'}} />
            <div className="sc-bird" style={{top:'26%',right:'16%'}} />
            <div className="sc-bird sc-bird-sm" style={{top:'20%',right:'26%'}} />
          </>}
          {levelIdx === 3 && <>
            <div className="sc-castle-wrap">
              <div className="sc-tower sc-tower-s" />
              <div className="sc-tower sc-tower-c" />
              <div className="sc-tower sc-tower-s" />
            </div>
            <div className="sc-star" style={{top:'14%',left:'12%'}} />
            <div className="sc-star" style={{top:'20%',right:'14%',animationDelay:'0.7s'}} />
            <div className="sc-star sc-star-sm" style={{top:'10%',left:'44%',animationDelay:'1.4s'}} />
            <div className="sc-star sc-star-sm" style={{top:'30%',left:'22%',animationDelay:'0.3s'}} />
          </>}
          {levelIdx === 4 && <>
            <div className="sc-glow" />
            <div className="sc-temple-wrap">
              <div className="sc-pillar" />
              <div className="sc-pillar sc-pillar-lg" />
              <div className="sc-pillar" />
              <div className="sc-pillar sc-pillar-lg" />
              <div className="sc-pillar" />
            </div>
          </>}
        </div>

        {/* Sleep overlay & floating Zzz */}
        {sleepAnim && <div className="sleep-overlay" aria-hidden="true" />}
        {sleepAnim && <span className="sleep-zzz" aria-hidden="true">💤</span>}

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

        {msgText && <div className="pet-msg">{msgText}</div>}
      </div>

      {/* ── Mood Bar ── */}
      <div className="pet-mood-wrap">
        <div className="pet-mood-header">
          <span className="pet-mood-icon">{moodInfo.icon}</span>
          <span className="pet-mood-text">{moodInfo.text}</span>
          <span className="pet-mood-val">{mood} / 100</span>
        </div>
        <div className="week-progress-bar">
          <div className="week-progress-fill"
            style={{ width: mood + '%', background: moodInfo.color, transition: 'width .6s, background .6s' }} />
        </div>
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
        <button className="pet-action-btn" onClick={() => interact('feed')} disabled={sleepAnim}>🍎 餵食</button>
        <button className="pet-action-btn" onClick={() => interact('play')} disabled={sleepAnim}>⚽ 玩耍</button>
        <button className="pet-action-btn" onClick={() => interact('sleep')} disabled={sleepAnim}>😴 休息</button>
      </div>

      {/* ── Wardrobe ── */}
      <div className="pet-wardrobe">
        <div className="task-group-title">🎒 我的衣櫃</div>
        {Object.entries(ACC_BY_SLOT).map(([slot, items]) => (
          <div key={slot} className="wardrobe-row">
            <span className="wardrobe-slot-label">{SLOT_LABEL[slot]}</span>
            <div className="wardrobe-items">
              <button
                className={`wardrobe-item ${!equipped[slot] ? 'wardrobe-item-selected' : ''}`}
                onClick={() => saveEquipped({ ...equipped, [slot]: null })}
              >
                未戴
              </button>
              {items.map(({ key, emoji, rarity, unlockAt, label }) => {
                const isUnlocked = totalEarned >= unlockAt
                const isSelected = equipped[slot] === emoji
                return (
                  <button
                    key={key}
                    className={`wardrobe-item wardrobe-rarity-${rarity} ${isSelected ? 'wardrobe-item-selected' : ''} ${!isUnlocked ? 'wardrobe-item-locked' : ''}`}
                    title={isUnlocked ? label : `累積 ${unlockAt} 分解鎖`}
                    onClick={() => {
                      if (!isUnlocked) { toast(`還差 ${unlockAt - totalEarned} 分解鎖「${label}」`); return }
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
