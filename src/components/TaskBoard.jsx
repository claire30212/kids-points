import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import { isDoneToday, fmtTime, todayKey } from '../lib/constants'
import { MoreMenu, focusScroll } from '../lib/ui'

const DAY_NAMES = ['週日','週一','週二','週三','週四','週五','週六']
function fmtBackfillDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  return `${d.getUTCMonth()+1}/${d.getUTCDate()} ${DAY_NAMES[d.getUTCDay()]}`
}

export default function TaskBoard({ kid, history, onRefresh, isParent, onStatsUpdate }) {
  const toast = useToast()
  const [tasks, setTasks] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPts, setEditPts] = useState('')
  const [dailySort, setDailySort] = useState({ field: null, dir: 'asc' })
  const [onceSort, setOnceSort] = useState({ field: null, dir: 'asc' })
  const [showBackfill, setShowBackfill] = useState(false)
  const [backfillDay, setBackfillDay] = useState(null)
  const dragItem = useRef(null)
  const dragOver = useRef(null)

  useEffect(() => { loadTasks() }, [kid.id])

  async function loadTasks() {
    const { data } = await supabase
      .from('kp_tasks')
      .select('*')
      .eq('kid_id', kid.id)
      .eq('active', true)
      .order('sort_order')
      .order('created_at')
    setTasks(data || [])
  }

  // Push stats to KidView for item 10
  useEffect(() => {
    if (!onStatsUpdate || !tasks) return
    const daily = tasks.filter(t => t.type === 'daily' && !t.is_penalty)
    const completed = daily.filter(t => isDoneToday(history, t.id)).length
    onStatsUpdate({ total: daily.length, completed })
  }, [tasks, history])

  async function completeTask(task) {
    const today = todayKey()
    if (task.type === 'daily' && !task.is_penalty && isDoneToday(history, task.id)) return
    if (task.type === 'daily' && task.is_penalty && history.some(h => h.task_id === task.id && h.type === 'spend' && h.ts?.startsWith(today))) return
    if (task.type === 'once' && history.some(h => h.task_id === task.id)) return toast('這個任務已經完成了')
    setLoading(true)
    if (task.is_penalty) {
      await supabase.from('kp_history').insert({
        kid_id: kid.id, type: 'spend', pts: task.pts,
        note: `⚠️ ${task.name}`, task_id: task.id
      })
      toast(`-${task.pts} 點 ⚠️`)
    } else {
      await supabase.from('kp_history').insert({
        kid_id: kid.id, type: 'earn', pts: task.pts,
        note: `完成：${task.name}`, task_id: task.id
      })
      toast(`+${task.pts} 點！棒棒 🌟`)
    }
    await onRefresh()
    setLoading(false)
  }

  async function uncompleteTask(task) {
    const today = todayKey()
    const typeMatch = task.is_penalty ? 'spend' : 'earn'
    const records = history.filter(h =>
      h.task_id === task.id && h.type === typeMatch && h.ts?.startsWith(today)
    )
    if (!records.length) return
    setLoading(true)
    await Promise.all(records.map(r => supabase.from('kp_history').delete().eq('id', r.id)))
    toast('已取消完成')
    await onRefresh()
    setLoading(false)
  }

  async function backfillTask(task, dateStr) {
    if (history.some(h => h.task_id === task.id && h.type === 'earn' && h.ts?.startsWith(dateStr))) return
    setLoading(true)
    await supabase.from('kp_history').insert({
      kid_id: kid.id, type: 'earn', pts: task.pts,
      note: `完成：${task.name}（補打）`, task_id: task.id,
      ts: dateStr + 'T12:00:00.000Z'
    })
    toast(`補打 +${task.pts} 點`)
    await onRefresh()
    setLoading(false)
  }

  async function unbackfillTask(task, dateStr) {
    const rec = history.find(h => h.task_id === task.id && h.type === 'earn' && h.ts?.startsWith(dateStr))
    if (!rec) return
    setLoading(true)
    await supabase.from('kp_history').delete().eq('id', rec.id)
    toast('已取消補打')
    await onRefresh()
    setLoading(false)
  }

  async function deleteTask(task) {
    await supabase.from('kp_tasks').update({ active: false }).eq('id', task.id)
    toast('已刪除任務')
    loadTasks()
  }

  function startEdit(task) {
    setEditingId(task.id)
    setEditName(task.name)
    setEditPts(String(task.pts))
  }

  async function saveEdit(task) {
    const pts = parseInt(editPts)
    if (!editName.trim()) return toast('請輸入任務名稱')
    if (!pts || pts < 1) return toast('積分至少 1 點')
    await supabase.from('kp_tasks').update({ name: editName.trim(), pts }).eq('id', task.id)
    toast('已更新')
    setEditingId(null)
    loadTasks()
  }

  function toggleSort(setSort, field) {
    setSort(s => s.field === field
      ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'asc' })
  }

  function applySort(list, sort) {
    if (!sort.field) return list
    return [...list].sort((a, b) => {
      const cmp = sort.field === 'pts' ? a.pts - b.pts : a.name.localeCompare(b.name, 'zh-TW')
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }

  async function handleDrop(sortedList) {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) {
      dragItem.current = null; dragOver.current = null; return
    }
    const reordered = [...sortedList]
    const [dragged] = reordered.splice(dragItem.current, 1)
    reordered.splice(dragOver.current, 0, dragged)
    dragItem.current = null; dragOver.current = null
    await Promise.all(reordered.map((t, i) =>
      supabase.from('kp_tasks').update({ sort_order: i }).eq('id', t.id)
    ))
    loadTasks()
  }

  const rawDailyTasks = (tasks || []).filter(t => t.type === 'daily')
  const rawOnceTasks = (tasks || []).filter(t => t.type === 'once')
  const dailyTasks = applySort(rawDailyTasks, dailySort)
  const onceTasks = applySort(rawOnceTasks, onceSort)
  const today = todayKey()
  const noSort = !dailySort.field && !onceSort.field
  const pastDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(Date.now() - (i + 1) * 86400000)
    return d.toISOString().slice(0, 10)
  })
  const backfillableTasks = rawDailyTasks.filter(t => !t.is_penalty)

  function SortBtns({ sort, setSort }) {
    return (
      <span className="sort-btns">
        <button className={`sort-btn ${sort.field === 'pts' ? 'active' : ''}`} onClick={() => toggleSort(setSort, 'pts')}>
          分數 {sort.field === 'pts' ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
        </button>
        <button className={`sort-btn ${sort.field === 'name' ? 'active' : ''}`} onClick={() => toggleSort(setSort, 'name')}>
          筆畫 {sort.field === 'name' ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
        </button>
      </span>
    )
  }

  function renderTask(task, idx, group, sortedList) {
    const isPenalty = task.is_penalty
    const done = group === 'daily'
      ? (isPenalty
          ? history.some(h => h.task_id === task.id && h.type === 'spend' && h.ts?.startsWith(today))
          : isDoneToday(history, task.id))
      : history.some(h => h.task_id === task.id)
    const doneRecord = history.find(h =>
      h.task_id === task.id && (group === 'daily' ? h.ts?.startsWith(today) : true)
    )
    const isEditing = editingId === task.id
    const canDrag = isParent && noSort
    const isDaily = group === 'daily'

    if (isEditing) {
      return (
        <div key={task.id} className={`task-card ${isPenalty ? 'task-penalty' : ''}`}>
          <div className="task-edit-row">
            <input className="input input-inline" value={editName}
              onChange={e => setEditName(e.target.value)} onFocus={focusScroll} placeholder="任務名稱" />
            <input className="input input-inline input-pts" type="text" inputMode="numeric"
              value={editPts} onChange={e => setEditPts(e.target.value)} onFocus={focusScroll} placeholder="積分" />
          </div>
          <div className="task-actions" onClick={e => e.stopPropagation()}>
            <button className="btn-sm btn-primary" onClick={() => saveEdit(task)}>儲存</button>
            <button className="btn-sm btn-secondary" onClick={() => setEditingId(null)}>取消</button>
          </div>
        </div>
      )
    }

    const doneIcon = isPenalty ? '🔴' : (group === 'daily' ? '✅' : '🏆')
    const pendingIcon = isPenalty ? '⚠️' : (group === 'daily' ? '⭕' : '🎯')

    return (
      <div
        key={task.id}
        className={`task-card ${done ? 'task-done' : ''} ${isPenalty ? 'task-penalty' : ''} ${isDaily ? 'task-clickable' : ''}`}
        draggable={canDrag}
        onDragStart={() => { dragItem.current = idx }}
        onDragEnter={() => { dragOver.current = idx }}
        onDragEnd={() => handleDrop(sortedList)}
        onDragOver={e => e.preventDefault()}
        onClick={isDaily ? () => done ? uncompleteTask(task) : completeTask(task) : undefined}
      >
        {canDrag && <span className="drag-handle" onClick={e => e.stopPropagation()}>⠿</span>}
        <div className="task-info">
          <div className="task-name">{done ? doneIcon : pendingIcon} {task.name}</div>
          <div className={`task-pts ${isPenalty ? 'penalty' : ''}`}>
            {isPenalty ? '-' : '+'}{task.pts} 點
            {doneRecord && <span className="task-time">{fmtTime(doneRecord.ts)}</span>}
          </div>
        </div>
        <div className="task-actions" onClick={e => e.stopPropagation()}>
          {isDaily
            ? done
              ? <button className="btn-sm btn-cancel" disabled={loading} onClick={() => uncompleteTask(task)}>取消</button>
              : <button className={`btn-sm ${isPenalty ? 'btn-penalty' : 'btn-primary'}`} disabled={loading} onClick={() => completeTask(task)}>
                  {isPenalty ? '扣分' : '完成'}
                </button>
            : !done
              ? <button className="btn-sm btn-primary" disabled={loading} onClick={() => completeTask(task)}>完成</button>
              : <span className="task-done-label">已完成</span>
          }
          {isParent && <MoreMenu onEdit={() => startEdit(task)} onDelete={() => deleteTask(task)} />}
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      {isParent && (
        <button className="btn-secondary btn-full" onClick={() => setShowAdd(true)}>＋ 新增任務</button>
      )}

      {/* ── 每日任務 ── */}
      <div className="task-group-header">
        <div className="task-group-title">每日任務</div>
        <div className="task-group-actions">
          <button className={`sort-btn ${showBackfill ? 'active' : ''}`}
            onClick={() => { setShowBackfill(v => !v); setBackfillDay(null) }}>📅 補打</button>
          {isParent && <SortBtns sort={dailySort} setSort={setDailySort} />}
        </div>
      </div>

      {showBackfill && (
        <div className="backfill-panel">
          <div className="backfill-days">
            {pastDays.map(d => (
              <button key={d} className={`backfill-day-btn ${backfillDay === d ? 'active' : ''}`}
                onClick={() => setBackfillDay(backfillDay === d ? null : d)}>
                {fmtBackfillDate(d)}
              </button>
            ))}
          </div>
          {backfillDay && (
            <>
              <div className="backfill-tasks">
                {backfillableTasks.length === 0 && <div className="empty-hint">沒有可補打的任務</div>}
                {backfillableTasks.map(task => {
                  const done = history.some(h => h.task_id === task.id && h.type === 'earn' && h.ts?.startsWith(backfillDay))
                  return (
                    <div key={task.id} className="backfill-task-row">
                      <div className="backfill-task-info">
                        <span className="backfill-task-name">{task.name}</span>
                        <span className="backfill-task-pts">+{task.pts} 點</span>
                      </div>
                      {done
                        ? <button className="btn-sm btn-backfill-done" disabled={loading} onClick={() => unbackfillTask(task, backfillDay)}>✅ 已補打</button>
                        : <button className="btn-sm btn-primary" disabled={loading} onClick={() => backfillTask(task, backfillDay)}>完成</button>
                      }
                    </div>
                  )
                })}
              </div>
              <PenaltyLogSection
                kidId={kid.id}
                dateStr={backfillDay}
                history={history}
                onRefresh={onRefresh}
              />
            </>
          )}
        </div>
      )}

      {dailyTasks.length === 0
        ? <div className="empty-hint">還沒有每日任務，點上方「＋ 新增任務」開始設定吧 🌟</div>
        : dailyTasks.map((t, idx) => renderTask(t, idx, 'daily', dailyTasks))
      }

      {/* ── 今日扣分記錄 ── */}
      <PenaltyLogSection
        kidId={kid.id}
        dateStr={today}
        history={history}
        onRefresh={onRefresh}
      />

      {/* ── 挑戰任務 ── */}
      <div className="task-group-header">
        <div className="task-group-title">挑戰任務</div>
        {isParent && <SortBtns sort={onceSort} setSort={setOnceSort} />}
      </div>
      {onceTasks.length === 0
        ? <div className="empty-hint">還沒有挑戰任務，點「＋ 新增任務」新增一次性目標 🎯</div>
        : onceTasks.map((t, idx) => renderTask(t, idx, 'once', onceTasks))
      }

      {showAdd && (
        <AddTaskModal
          kidId={kid.id}
          onClose={() => setShowAdd(false)}
          onSave={() => { setShowAdd(false); loadTasks() }}
        />
      )}
    </div>
  )
}

// ── PenaltyLogSection ────────────────────────────────────
function PenaltyLogSection({ kidId, dateStr, history, onRefresh }) {
  const isToday = dateStr === todayKey()
  const savedRecords = history.filter(h =>
    h.type === 'spend' && h.note?.startsWith('⚠️') && !h.task_id && h.ts?.startsWith(dateStr)
  )
  const totalPenalty = savedRecords.reduce((s, h) => s + h.pts, 0)
  const [rows, setRows] = useState([{ key: Date.now(), note: '', pts: '', saving: false }])
  const savingRef = useRef(new Set())

  useEffect(() => {
    setRows([{ key: Date.now(), note: '', pts: '', saving: false }])
  }, [dateStr])

  function updateRow(key, field, val) {
    setRows(r => r.map(x => x.key === key ? { ...x, [field]: val } : x))
  }

  async function tryAutoSave(key, note, pts) {
    const ptsNum = parseInt(pts)
    if (!note.trim() || !ptsNum || ptsNum < 1) return
    if (savingRef.current.has(key)) return
    savingRef.current.add(key)

    const ts = isToday ? new Date().toISOString() : dateStr + 'T20:00:00.000Z'
    await supabase.from('kp_history').insert({
      kid_id: kidId, type: 'spend', pts: ptsNum,
      note: '⚠️ ' + note.trim(), task_id: null, ts
    })
    savingRef.current.delete(key)
    setRows(current => {
      const remaining = current.filter(r => r.key !== key)
      const hasEmpty = remaining.some(r => !r.note.trim() && !r.saving)
      return hasEmpty ? remaining : [...remaining, { key: Date.now(), note: '', pts: '', saving: false }]
    })
    await onRefresh()
  }

  async function deleteRecord(id) {
    await supabase.from('kp_history').delete().eq('id', id)
    await onRefresh()
  }

  function addRow() {
    setRows(r => [...r, { key: Date.now(), note: '', pts: '', saving: false }])
  }

  return (
    <div className="penalty-log">
      <div className="penalty-log-header">
        <span className="penalty-log-title">⚠️ {isToday ? '今日' : fmtBackfillDate(dateStr)}扣分記錄</span>
        <span className={`penalty-log-total ${totalPenalty === 0 ? 'zero' : ''}`}>
          {totalPenalty === 0 ? '今日無扣分' : `今日共扣：-${totalPenalty} 分`}
        </span>
      </div>

      {savedRecords.map(r => (
        <div key={r.id} className="penalty-row saved">
          <span className="penalty-row-note">{r.note.replace(/^⚠️\s*/, '')}</span>
          <span className="penalty-row-pts">-{r.pts}</span>
          <button className="penalty-row-del" onClick={() => deleteRecord(r.id)}>🗑️</button>
        </div>
      ))}

      {rows.map(row => (
        <div key={row.key} className="penalty-row">
          <input
            className="penalty-input penalty-input-note"
            value={row.note}
            placeholder="事項"
            onChange={e => updateRow(row.key, 'note', e.target.value)}
            onBlur={() => tryAutoSave(row.key, row.note, row.pts)}
            onFocus={focusScroll}
          />
          <input
            className="penalty-input penalty-input-pts"
            type="text"
            inputMode="numeric"
            value={row.pts}
            placeholder="0"
            onChange={e => updateRow(row.key, 'pts', e.target.value)}
            onBlur={() => tryAutoSave(row.key, row.note, row.pts)}
            onFocus={focusScroll}
          />
        </div>
      ))}

      <button className="penalty-add-btn" onClick={addRow}>＋ 再新增一列</button>
    </div>
  )
}

// ── AddTaskModal ─────────────────────────────────────────
function AddTaskModal({ kidId, onClose, onSave }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [pts, setPts] = useState('')
  const [type, setType] = useState('daily')
  const [isPenalty, setIsPenalty] = useState(false)
  const [saving, setSaving] = useState(false)
  const mouseDownTarget = useRef(null)

  async function save() {
    const ptsNum = parseInt(pts)
    if (!name.trim()) return toast('請輸入任務名稱')
    if (!ptsNum || ptsNum < 1) return toast('積分至少 1 點')
    setSaving(true)
    const { error } = await supabase.from('kp_tasks').insert({
      kid_id: kidId, name: name.trim(), pts: ptsNum, type, is_penalty: isPenalty
    })
    setSaving(false)
    if (error) return toast('新增失敗：' + error.message)
    toast('任務新增成功！')
    onSave()
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={e => { mouseDownTarget.current = e.target }}
      onClick={e => { if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) onClose() }}
    >
      <div className="modal-card">
        <div className="modal-title">新增任務</div>
        <label className="field-label">任務名稱</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} onFocus={focusScroll} placeholder="例如：整理房間" />
        <label className="field-label">積分</label>
        <input className="input" type="text" inputMode="numeric" value={pts} onChange={e => setPts(e.target.value)} onFocus={focusScroll} placeholder="例如：5" />
        <label className="field-label">頻率</label>
        <div className="type-picker">
          <button className={`type-btn ${type === 'daily' ? 'selected' : ''}`} onClick={() => setType('daily')}>每日任務</button>
          <button className={`type-btn ${type === 'once' ? 'selected' : ''}`} onClick={() => setType('once')}>一次性挑戰</button>
        </div>
        <label className="field-label">性質</label>
        <div className="type-picker">
          <button className={`type-btn ${!isPenalty ? 'selected' : ''}`} onClick={() => setIsPenalty(false)}>✅ 加分任務</button>
          <button className={`type-btn penalty-btn ${isPenalty ? 'selected' : ''}`} onClick={() => setIsPenalty(true)}>❌ 扣分任務</button>
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '新增中...' : '新增'}</button>
        </div>
      </div>
    </div>
  )
}
