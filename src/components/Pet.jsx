import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { PETS, PET_LEVELS, PET_MSGS, ACCESSORIES, SCENES, LEVEL_FOODS, getPetLevel, getNextLevel } from '../lib/constants'
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
  '👑': { position: 'absolute', top: '-34px', left: '50%', transform: 'translateX(-50%)', fontSize: '24px', zIndex: 3 },
  '⛑️': { position: 'absolute', top: '-32px', left: '50%', transform: 'translateX(-50%)', fontSize: '26px', zIndex: 3 },
  '🎓': { position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)', fontSize: '26px', zIndex: 3 },
  '😇': { position: 'absolute', top: '-35px', left: '50%', transform: 'translateX(-50%)', fontSize: '22px', zIndex: 3 },
  '🪖': { position: 'absolute', top: '-34px', left: '50%', transform: 'translateX(-50%)', fontSize: '24px', zIndex: 3 },
  '🌸': { position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '24px', zIndex: 3 },
  '🌺': { position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '24px', zIndex: 3 },
  '👮': { position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)', fontSize: '26px', zIndex: 3 },
  '🪷': { position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '24px', zIndex: 3 },
  '🕶️': { position: 'absolute', top: '20px',  left: '50%', transform: 'translateX(-50%)', fontSize: '22px', zIndex: 3 },
  '🥽': { position: 'absolute', top: '18px',  left: '50%', transform: 'translateX(-50%)', fontSize: '22px', zIndex: 3 },
  '👓': { position: 'absolute', top: '20px',  left: '50%', transform: 'translateX(-50%)', fontSize: '20px', zIndex: 3 },
  '🎭': { position: 'absolute', top: '18px',  left: '50%', transform: 'translateX(-50%)', fontSize: '24px', zIndex: 3 },
  '🤿': { position: 'absolute', top: '18px',  left: '50%', transform: 'translateX(-50%)', fontSize: '22px', zIndex: 3 },
  '🥸': { position: 'absolute', top: '20px',  left: '50%', transform: 'translateX(-50%)', fontSize: '22px', zIndex: 3 },
  '😷': { position: 'absolute', top: '22px',  left: '50%', transform: 'translateX(-50%)', fontSize: '22px', zIndex: 3 },
  '🎀': { position: 'absolute', top: '56px',  left: '50%', transform: 'translateX(-50%)', fontSize: '20px', zIndex: 3 },
  '🧣': { position: 'absolute', top: '54px',  left: '50%', transform: 'translateX(-50%)', fontSize: '20px', zIndex: 3 },
  '💎': { position: 'absolute', top: '58px',  left: '50%', transform: 'translateX(-50%)', fontSize: '18px', zIndex: 3 },
  '🏅': { position: 'absolute', top: '56px',  left: '50%', transform: 'translateX(-50%)', fontSize: '18px', zIndex: 3 },
  '👔': { position: 'absolute', top: '52px',  left: '50%', transform: 'translateX(-50%)', fontSize: '20px', zIndex: 3 },
  '📿': { position: 'absolute', top: '58px',  left: '50%', transform: 'translateX(-50%)', fontSize: '18px', zIndex: 3 },
  '🏵️': { position: 'absolute', top: '54px',  left: '50%', transform: 'translateX(-50%)', fontSize: '20px', zIndex: 3 },
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
  const [sleepAnim, setSleepAnim]  = useState(false)
  const [feedAnim, setFeedAnim] = useState(false)
  const [playAnim, setPlayAnim] = useState(false)
  const [celebrationQueue, setCelebrationQueue] = useState([])
  const celebration = celebrationQueue[0] || null

  const wardrobeRef = useRef(null)
  const sceneRef = useRef(null)

  const lsKey        = `equipped_${kid.id}`
  const moodLsKey    = `mood_${kid.id}`
  const moodTsLsKey  = `mood_ts_${kid.id}`
  const notifiedLsKey = `notified_acc_${kid.id}`
  const sceneLsKey    = `scene_${kid.id}`
  const notifiedSceneLsKey = `notified_scene_${kid.id}`

  const [equipped, setEquipped] = useState(() => {
    if (kid.equipped_accessories && typeof kid.equipped_accessories === 'object')
      return kid.equipped_accessories
    try { return JSON.parse(localStorage.getItem(lsKey) || '{}') } catch { return {} }
  })

  const [selectedScene, setSelectedScene] = useState(() => {
    if (kid.selected_scene) return kid.selected_scene
    return localStorage.getItem(sceneLsKey) || 'grassland'
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
  const feedFood = LEVEL_FOODS[levelIdx] || LEVEL_FOODS[0]

  // On mount: sync from DB, apply decay, check new unlock celebrations
  useEffect(() => {
    supabase
      .from('kp_kids')
      .select('equipped_accessories, pet_mood, pet_mood_updated_at, selected_scene')
      .eq('id', kid.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          const dbEquipped = data.equipped_accessories
          if (dbEquipped && Object.keys(dbEquipped).length > 0) {
            // DB has real data — use as authoritative source
            setEquipped(dbEquipped)
            localStorage.setItem(lsKey, JSON.stringify(dbEquipped))
          } else {
            // DB is empty (column just added with DEFAULT {}) — one-time migration from localStorage
            const lsRaw = localStorage.getItem(lsKey)
            if (lsRaw) {
              try {
                const lsEquipped = JSON.parse(lsRaw)
                if (lsEquipped && Object.keys(lsEquipped).length > 0) {
                  setEquipped(lsEquipped)
                  supabase.from('kp_kids')
                    .update({ equipped_accessories: lsEquipped })
                    .eq('id', kid.id)
                    .then(() => {})
                }
              } catch {}
            }
          }
          if (data.selected_scene) {
            setSelectedScene(data.selected_scene)
            localStorage.setItem(sceneLsKey, data.selected_scene)
          } else {
            const lsScene = localStorage.getItem(sceneLsKey)
            if (lsScene && lsScene !== 'grassland') {
              setSelectedScene(lsScene)
              supabase.from('kp_kids').update({ selected_scene: lsScene }).eq('id', kid.id).then(() => {})
            }
          }
          const base = typeof data.pet_mood === 'number' ? data.pet_mood : mood
          const ts   = data.pet_mood_updated_at
            ? new Date(data.pet_mood_updated_at)
            : new Date(localStorage.getItem(moodTsLsKey) || Date.now())
          applyDecay(base, ts)
        } else {
          // Network error — keep initial state from kid prop; localStorage as last resort
          const stored = localStorage.getItem(lsKey)
          if (stored) try { setEquipped(JSON.parse(stored)) } catch {}
          const ts = new Date(localStorage.getItem(moodTsLsKey) || Date.now())
          applyDecay(mood, ts)
        }
      })

    // Unlock celebration check — accessories + scenes share one queue
    const notifiedAcc = JSON.parse(localStorage.getItem(notifiedLsKey) || '[]')
    const newAccUnlocks = Object.entries(ACCESSORIES)
      .filter(([key, acc]) => totalEarned >= acc.unlockAt && !notifiedAcc.includes(key))
    const notifiedScenes = JSON.parse(localStorage.getItem(notifiedSceneLsKey) || '[]')
    const newSceneUnlocks = SCENES
      .filter(s => totalEarned >= s.unlockAt && !notifiedScenes.includes(s.id))

    const queue = [
      ...newAccUnlocks.map(([key, acc]) => ({ type: 'accessory', key, ...acc })),
      ...newSceneUnlocks.map(s => ({ type: 'scene', key: s.id, ...s })),
    ].sort((a, b) => a.unlockAt - b.unlockAt)

    if (queue.length > 0) {
      setCelebrationQueue(queue)
      if (newAccUnlocks.length > 0) {
        localStorage.setItem(notifiedLsKey, JSON.stringify([
          ...notifiedAcc, ...newAccUnlocks.map(([k]) => k)
        ]))
      }
      if (newSceneUnlocks.length > 0) {
        localStorage.setItem(notifiedSceneLsKey, JSON.stringify([
          ...notifiedScenes, ...newSceneUnlocks.map(s => s.id)
        ]))
      }
    }
  }, [kid.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function advanceCelebration() {
    const current = celebrationQueue[0]
    setCelebrationQueue(q => q.slice(1))
    if (celebrationQueue.length <= 1 && current) {
      const target = current.type === 'scene' ? sceneRef : wardrobeRef
      setTimeout(() => target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }

  function saveScene(sceneId) {
    setSelectedScene(sceneId)
    localStorage.setItem(sceneLsKey, sceneId)
    supabase.from('kp_kids').update({ selected_scene: sceneId }).eq('id', kid.id).then(() => {})
  }

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
    if (sleepAnim || feedAnim || playAnim) return

    if (type === 'feed') {
      toast(`${feedFood.label} 好好吃！心情 +15 🌟`)
    } else {
      showMsg(type)
    }

    if (type === 'sleep') {
      setSleepAnim(true)
      setTimeout(() => {
        setSleepAnim(false)
        const next = Math.min(100, mood + 10)
        setMood(next)
        persistMood(next)
      }, 3000)
      return
    }

    const next = Math.min(100, mood + 15)
    setMood(next)
    persistMood(next)

    if (type === 'feed') {
      setFeedAnim(true)
      setTimeout(() => setFeedAnim(false), 1200)
      return
    }

    if (type === 'play') {
      setPlayAnim(true)
      setTimeout(() => setPlayAnim(false), 1500)
    }
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

      {/* ── Unlock Celebration Overlay (accessories + scenes share one queue) ── */}
      {celebration && (
        <div className="unlock-overlay" onClick={advanceCelebration}>
          <div className="unlock-card" onClick={e => e.stopPropagation()}>
            <div className="unlock-confetti" aria-hidden="true">
              {CONFETTI.map(({ e, left }, i) => (
                <span key={i} className="confetti-piece" style={{ '--i': i, left, top: '-10%' }}>{e}</span>
              ))}
            </div>
            {celebration.type === 'scene' ? (
              <>
                <div className="unlock-title">🌍 新場景解鎖！</div>
                <div className="unlock-emoji-anim">
                  <div className="unlock-scene-swatch" style={{ background: celebration.bg }} />
                </div>
                <div className="unlock-item-label">{celebration.label}</div>
              </>
            ) : (
              <>
                <div className="unlock-title">✨ 新配件解鎖！</div>
                <div className="unlock-emoji-anim">
                  <span className="unlock-emoji">{celebration.emoji}</span>
                </div>
                <div className="unlock-item-label">{celebration.label}</div>
                <div className={`unlock-rarity-badge rarity-badge-${celebration.rarity}`}>
                  {RARITY_LABEL[celebration.rarity]}
                </div>
              </>
            )}
            <button className="btn-primary unlock-close-btn" onClick={advanceCelebration}>太棒了！去看看 →</button>
          </div>
        </div>
      )}

      {/* ── Pet Habitat ── */}
      <div className={`pet-habitat habitat-lv${levelIdx}`} style={{ background: SCENES.find(s => s.id === selectedScene)?.bg }}>

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

        {/* Feed animation: apple drops and gets eaten */}
        {feedAnim && <span className="feed-apple" aria-hidden="true">{feedFood.emoji}</span>}

        {/* Play animation: ball bounces side to side */}
        {playAnim && <span className="play-ball" aria-hidden="true">⚽</span>}

        <div className="pet-habitat-label">{level.habitat} {level.habitatLabel}</div>

        {level.items.map((item, i) => (
          <span key={i} className="habitat-item" style={CORNER_STYLES[i]}>{item}</span>
        ))}

        <div className={`pet-body ${feedAnim ? 'pet-chew' : ''} ${playAnim ? 'pet-sway' : ''}`}>
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
        <button className="pet-action-btn" onClick={() => interact('feed')} disabled={sleepAnim || feedAnim || playAnim}>{feedFood.emoji} 餵食</button>
        <button className="pet-action-btn" onClick={() => interact('play')} disabled={sleepAnim || feedAnim || playAnim}>⚽ 玩耍</button>
        <button className="pet-action-btn" onClick={() => interact('sleep')} disabled={sleepAnim || feedAnim || playAnim}>😴 休息</button>
      </div>

      {/* ── Scene Picker ── */}
      <div className="pet-scenes" ref={sceneRef}>
        <div className="task-group-title">🌍 我的場景</div>
        <div className="scene-scroll">
          {SCENES.map(scene => {
            const isUnlocked = totalEarned >= scene.unlockAt
            const isSelected = selectedScene === scene.id
            return (
              <button
                key={scene.id}
                className={`scene-card ${isSelected ? 'scene-card-selected' : ''} ${!isUnlocked ? 'scene-card-locked' : ''}`}
                style={isSelected ? { borderColor: kid.color } : {}}
                onClick={() => {
                  if (!isUnlocked) { toast(`累積 ${scene.unlockAt} 分解鎖「${scene.label}」`); return }
                  saveScene(scene.id)
                }}
              >
                <div className="scene-swatch" style={{ background: isUnlocked ? scene.bg : '#D8D2D6' }}>
                  {!isUnlocked && <span className="scene-lock">🔒</span>}
                </div>
                <div className="scene-label">{scene.label}</div>
                <div className="scene-condition">{isUnlocked ? scene.description : `累積 ${scene.unlockAt} 分解鎖`}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Wardrobe ── */}
      <div className="pet-wardrobe" ref={wardrobeRef}>
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
