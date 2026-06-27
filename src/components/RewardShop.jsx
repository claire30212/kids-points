import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import { fmtTime } from '../lib/constants'

export default function RewardShop({ kid, score, history, onRefresh, isParent }) {
  const toast = useToast()
  const [rewards, setRewards] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadRewards() }, [kid.id])

  async function loadRewards() {
    const { data } = await supabase
      .from('kp_rewards')
      .select('*')
      .eq('kid_id', kid.id)
      .eq('active', true)
      .order('pts')
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
    if (!confirm(`刪除獎品「${reward.name}」？`)) return
    await supabase.from('kp_rewards').update({ active: false }).eq('id', reward.id)
    toast('已刪除獎品')
    loadRewards()
  }

  const spends = history.filter(h => h.type === 'spend')

  return (
    <div className="section">
      {isParent && (
        <button className="btn-secondary btn-full" onClick={() => setShowAdd(true)}>＋ 新增獎品</button>
      )}

      <div className="task-group-title">可兌換獎品</div>
      {rewards.length === 0 && <div className="empty-hint">還沒有獎品，家長可以新增</div>}
      {rewards.map(r => {
        const canRedeem = score >= r.pts
        return (
          <div key={r.id} className={`reward-card ${canRedeem ? '' : 'reward-locked'}`}>
            <div className="reward-emoji">{r.emoji}</div>
            <div className="reward-info">
              <div className="reward-name">{r.name}</div>
              <div className="reward-pts">{r.pts} 點</div>
            </div>
            <div className="task-actions">
              {canRedeem
                ? <button className="btn-sm btn-primary" disabled={loading} onClick={() => redeemReward(r)}>兌換</button>
                : <span className="locked-label">差 {r.pts - score} 點</span>
              }
              {isParent && <button className="btn-sm btn-danger" onClick={() => deleteReward(r)}>刪除</button>}
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

      {showAdd && <AddRewardModal kidId={kid.id} onClose={() => setShowAdd(false)} onSave={() => { setShowAdd(false); loadRewards() }} />}
    </div>
  )
}

function AddRewardModal({ kidId, onClose, onSave }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [pts, setPts] = useState(50)
  const [emoji, setEmoji] = useState('🎁')
  const [saving, setSaving] = useState(false)

  const EMOJIS = ['🎁','🍦','🎮','📚','🎬','🧸','🛁','🌴','🎠','🍕','🎯','💰']

  async function save() {
    if (!name.trim()) return toast('請輸入獎品名稱')
    if (pts < 1) return toast('積分至少 1 點')
    setSaving(true)
    const { error } = await supabase.from('kp_rewards').insert({ kid_id: kidId, name: name.trim(), pts, emoji })
    setSaving(false)
    if (error) return toast('新增失敗：' + error.message)
    toast('獎品新增成功！')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-title">新增獎品</div>
        <label className="field-label">獎品名稱</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="例如：看一集卡通" />
        <label className="field-label">所需積分</label>
        <input className="input" type="number" min={1} value={pts} onChange={e => setPts(Number(e.target.value))} />
        <label className="field-label">圖示</label>
        <div className="emoji-picker">
          {EMOJIS.map(e => (
            <button key={e} className={`emoji-btn ${emoji===e?'selected':''}`} onClick={() => setEmoji(e)}>{e}</button>
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
