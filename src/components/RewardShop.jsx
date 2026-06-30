import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import { fmtTime } from '../lib/constants'
import { LongPressDeleteBtn, MoreMenu, focusScroll } from '../lib/ui'

const EMOJIS = ['🎁','🍦','🎮','📚','🎬','🧸','🛁','🌴','🎠','🍕','🎯','💰']

export default function RewardShop({ kid, score, history, onRefresh, isParent }) {
  const toast = useToast()
  const [rewards, setRewards] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPts, setEditPts] = useState('')
  const [editEmoji, setEditEmoji] = useState('🎁')

  useEffect(() => { loadRewards() }, [kid.id])

  async function loadRewards() {
    const { data } = await supabase
      .from('kp_rewards').select('*')
      .eq('kid_id', kid.id).eq('active', true).order('pts')
    setRewards(data || [])
  }

  async function redeemReward(reward) {
    if (score < reward.pts) return toast(`積分不足！還差 ${reward.pts - score} 點`)
    if (!confirm(`確定兌換「${reward.name}」（${reward.pts} 點）？`)) return
    setLoading(true)
    await supabase.from('kp_history').insert({
      kid_id: kid.id, type: 'spend', pts: reward.pts, note: `兌換：${reward.name}`
    })
    toast(`兌換成功！${reward.emoji} ${reward.name}`)
    await onRefresh()
    setLoading(false)
  }

  async function deleteReward(reward) {
    await supabase.from('kp_rewards').update({ active: false }).eq('id', reward.id)
    toast('已刪除獎品')
    loadRewards()
  }

  function startEdit(r) {
    setEditingId(r.id)
    setEditName(r.name)
    setEditPts(String(r.pts))
    setEditEmoji(r.emoji)
  }

  async function saveEdit(r) {
    const pts = parseInt(editPts)
    if (!editName.trim()) return toast('請輸入獎品名稱')
    if (!pts || pts < 1) return toast('積分至少 1 點')
    await supabase.from('kp_rewards').update({ name: editName.trim(), pts, emoji: editEmoji }).eq('id', r.id)
    toast('已更新')
    setEditingId(null)
    loadRewards()
  }

  // Score summary
  const totalEarn = history.filter(h => h.type === 'earn').reduce((s, h) => s + h.pts, 0)
  const totalPenalty = history.filter(h => h.type === 'spend' && h.note?.startsWith('⚠️')).reduce((s, h) => s + h.pts, 0)
  const totalRedeem = history.filter(h => h.type === 'spend' && h.note?.startsWith('兌換')).reduce((s, h) => s + h.pts, 0)
  const balance = totalEarn - totalPenalty - totalRedeem

  // Spend history (reward redemptions only)
  const spends = history.filter(h => h.type === 'spend' && h.note?.startsWith('兌換'))

  // Redemption count per reward
  function redeemCount(r) {
    return history.filter(h => h.type === 'spend' && h.note === `兌換：${r.name}`).length
  }

  return (
    <div className="section">
      {isParent && (
        <button className="btn-secondary btn-full" onClick={() => setShowAdd(true)}>＋ 新增獎品</button>
      )}

      {/* ── 積分明細卡片 ── */}
      <div className="score-summary-card">
        <div className="score-row">
          <span className="score-label">✅ 累積得分</span>
          <span className="score-val score-earn">+{totalEarn} 點</span>
        </div>
        {totalPenalty > 0 && (
          <div className="score-row">
            <span className="score-label">⚠️ 扣分合計</span>
            <span className="score-val score-spend">-{totalPenalty} 點</span>
          </div>
        )}
        {totalRedeem > 0 && (
          <div className="score-row">
            <span className="score-label">🎁 兌換合計</span>
            <span className="score-val score-spend">-{totalRedeem} 點</span>
          </div>
        )}
        <div className="score-divider" />
        <div className="score-row score-balance-row">
          <span className="score-label">⭐ 目前餘額</span>
          <span className="score-val score-balance">{balance} 點</span>
        </div>
      </div>

      <div className="task-group-title">可兌換獎品</div>
      {rewards.length === 0 && (
        <div className="empty-hint">還沒有獎品！點「＋ 新增獎品」設定努力的目標 🎁</div>
      )}
      {rewards.map(r => {
        const canRedeem = score >= r.pts
        const cnt = redeemCount(r)

        if (editingId === r.id) {
          return (
            <div key={r.id} className="reward-card reward-edit">
              <div className="emoji-picker reward-emoji-picker">
                {EMOJIS.map(e => (
                  <button key={e} className={`emoji-btn ${editEmoji === e ? 'selected' : ''}`} onClick={() => setEditEmoji(e)}>{e}</button>
                ))}
              </div>
              <div className="task-edit-row">
                <input className="input input-inline" value={editName} onChange={e => setEditName(e.target.value)} onFocus={focusScroll} placeholder="獎品名稱" />
                <input className="input input-inline input-pts" type="text" inputMode="numeric" value={editPts} onChange={e => setEditPts(e.target.value)} onFocus={focusScroll} placeholder="積分" />
              </div>
              <div className="task-actions">
                <button className="btn-sm btn-primary" onClick={() => saveEdit(r)}>儲存</button>
                <button className="btn-sm btn-secondary" onClick={() => setEditingId(null)}>取消</button>
              </div>
            </div>
          )
        }

        return (
          <div key={r.id} className={`reward-card ${canRedeem ? '' : 'reward-locked'}`}>
            <div className="reward-emoji">{r.emoji}</div>
            <div className="reward-info">
              <div className="reward-name">{r.name}</div>
              <div className="reward-pts">{r.pts} 點{cnt > 0 && <span className="reward-count"> · 已兌換 {cnt} 次</span>}</div>
            </div>
            <div className="task-actions">
              {canRedeem
                ? <button className="btn-sm btn-primary" disabled={loading} onClick={() => redeemReward(r)}>兌換</button>
                : <span className="locked-label">差 {r.pts - score} 點</span>
              }
              {isParent && <MoreMenu onEdit={() => startEdit(r)} onDelete={() => deleteReward(r)} />}
            </div>
          </div>
        )
      })}

      {spends.length > 0 && (
        <>
          <div className="task-group-title">兌換紀錄</div>
          {spends.slice(0, 10).map(s => (
            <div key={s.id} className="history-item">
              <span>{s.note}</span>
              <span className="history-pts spend">-{s.pts} 點</span>
              <span className="history-time">{fmtTime(s.ts)}</span>
            </div>
          ))}
        </>
      )}

      {showAdd && (
        <AddRewardModal
          kidId={kid.id}
          onClose={() => setShowAdd(false)}
          onSave={() => { setShowAdd(false); loadRewards() }}
        />
      )}
    </div>
  )
}

function AddRewardModal({ kidId, onClose, onSave }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [pts, setPts] = useState('')
  const [emoji, setEmoji] = useState('🎁')
  const [saving, setSaving] = useState(false)
  const mouseDownTarget = useRef(null)

  async function save() {
    const ptsNum = parseInt(pts)
    if (!name.trim()) return toast('請輸入獎品名稱')
    if (!ptsNum || ptsNum < 1) return toast('積分至少 1 點')
    setSaving(true)
    const { error } = await supabase.from('kp_rewards').insert({ kid_id: kidId, name: name.trim(), pts: ptsNum, emoji })
    setSaving(false)
    if (error) return toast('新增失敗：' + error.message)
    toast('獎品新增成功！')
    onSave()
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={e => { mouseDownTarget.current = e.target }}
      onClick={e => { if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) onClose() }}
    >
      <div className="modal-card">
        <div className="modal-title">新增獎品</div>
        <label className="field-label">獎品名稱</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} onFocus={focusScroll} placeholder="例如：看一集卡通" />
        <label className="field-label">所需積分</label>
        <input className="input" type="text" inputMode="numeric" value={pts} onChange={e => setPts(e.target.value)} onFocus={focusScroll} placeholder="例如：50" />
        <label className="field-label">圖示</label>
        <div className="emoji-picker">
          {EMOJIS.map(e => (
            <button key={e} className={`emoji-btn ${emoji === e ? 'selected' : ''}`} onClick={() => setEmoji(e)}>{e}</button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '新增中...' : '新增'}</button>
        </div>
      </div>
    </div>
  )
}
