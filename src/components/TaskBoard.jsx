import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import { isDoneToday, fmtTime } from '../lib/constants'

export default function TaskBoard({ kid, history, onRefresh, isParent }) {
  const toast = useToast()
  const [tasks, setTasks] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)

  useState(() => { loadTasks() }, [kid.id])

  async function loadTasks() {
    const { data } = await supabase
      .from('kp_tasks')
      .select('*')
      .eq('kid_id', kid.id)
      .eq('active', true)
      .order('created_at')
    setTasks(data || [])
  }

  async function completeTask(task) {
    if (task.type === 'daily' && isDoneToday(history, task.id)) return toast('今天已完成囉！')
    if (task.type === 'once') {
      const done = history.some(h => h.task_id === task.id && h.type === 'earn')
      if (done) return toast('這個任務已經完成了')
    }
    setLoading(true)
    await supabase.from('kp_history').insert({
      kid_id: kid.id, type: 'earn', pts: task.pts,
      note: `完成：${task.name}`, task_id: task.id
    })
    toast(`+${task.pts} 點！棒棒 🌟`)
    await onRefresh()
    setLoading(false)
  }

  async function deleteTask(task) {
    if (!confirm(`刪除任務「${task.name}」？`)) return
    await supabase.from('kp_tasks').update({ active: false }).eq('id', task.id)
    toast('已刪除任務')
    loadTasks()
  }

  const dailyTasks = (tasks || []).filter(t => t.type === 'daily')
  const onceTasks = (tasks || []).filter(t => t.type === 'once')

  return (
    <div className="section">
      {isParent && (
        <button className="btn-secondary btn-full" onClick={() => setShowAdd(true)}>＋ 新增任務</button>
      )}

      <div className="task-group-title">每日任務</div>
      {dailyTasks.length === 0 && <div className="empty-hint">還沒有每日任務</div>}
      {dailyTasks.map(t => {
        const done = isDoneToday(history, t.id)
        return (
          <div key={t.id} className={`task-card ${done ? 'task-done' : ''}`}>
            <div className="task-info">
              <div className="task-name">{done ? '✅ ' : '⭕ '}{t.name}</div>
              <div className="task-pts">+{t.pts} 點</div>
            </div>
            <div className="task-actions">
              {!done && <button className="btn-sm btn-primary" disabled={loading} onClick={() => completeTask(t)}>完成</button>}
              {done && <span className="task-done-label">今日完成</span>}
              {isParent && <button className="btn-sm btn-danger" onClick={() => deleteTask(t)}>刪除</button>}
            </div>
          </div>
        )
      })}

      <div className="task-group-title">挑戰任務</div>
      {onceTasks.length === 0 && <div className="empty-hint">還沒有挑戰任務</div>}
      {onceTasks.map(t => {
        const done = history.some(h => h.task_id === t.id && h.type === 'earn')
        const doneRecord = history.find(h => h.task_id === t.id && h.type === 'earn')
        return (
          <div key={t.id} className={`task-card ${done ? 'task-done' : ''}`}>
            <div className="task-info">
              <div className="task-name">{done ? '🏆 ' : '🎯 '}{t.name}</div>
              <div className="task-pts">+{t.pts} 點 {done && doneRecord && <span className="task-time">{fmtTime(doneRecord.ts)}</span>}</div>
            </div>
            <div className="task-actions">
              {!done && <button className="btn-sm btn-primary" disabled={loading} onClick={() => completeTask(t)}>完成</button>}
              {done && <span className="task-done-label">已完成</span>}
              {isParent && <button className="btn-sm btn-danger" onClick={() => deleteTask(t)}>刪除</button>}
            </div>
          </div>
        )
      })}

      {showAdd && <AddTaskModal kidId={kid.id} onClose={() => setShowAdd(false)} onSave={() => { setShowAdd(false); loadTasks() }} />}
    </div>
  )
}

function AddTaskModal({ kidId, onClose, onSave }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [pts, setPts] = useState(5)
  const [type, setType] = useState('daily')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return toast('請輸入任務名稱')
    if (pts < 1) return toast('積分至少 1 點')
    setSaving(true)
    const { error } = await supabase.from('kp_tasks').insert({ kid_id: kidId, name: name.trim(), pts, type })
    setSaving(false)
    if (error) return toast('新增失敗：' + error.message)
    toast('任務新增成功！')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-title">新增任務</div>
        <label className="field-label">任務名稱</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="例如：整理房間" />
        <label className="field-label">積分</label>
        <input className="input" type="number" min={1} max={100} value={pts} onChange={e => setPts(Number(e.target.value))} />
        <label className="field-label">類型</label>
        <div className="type-picker">
          <button className={`type-btn ${type==='daily'?'selected':''}`} onClick={() => setType('daily')}>每日任務</button>
          <button className={`type-btn ${type==='once'?'selected':''}`} onClick={() => setType('once')}>一次性挑戰</button>
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '新增中...' : '新增'}</button>
        </div>
      </div>
    </div>
  )
}
