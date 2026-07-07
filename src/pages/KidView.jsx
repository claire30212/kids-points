import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { calcScore, calcWeekPts, calcTotalEarned, PETS, isWeekend, isSunday, fmtTodayLabel } from '../lib/constants'
import TaskBoard from '../components/TaskBoard'
import RewardShop from '../components/RewardShop'
import Pet from '../components/Pet'

export default function KidView({ kid, isParent, onBack, onLogout }) {
  const [history, setHistory] = useState([])
  const [tab, setTab] = useState('tasks')
  const [loading, setLoading] = useState(true)
  const [taskStats, setTaskStats] = useState(null)

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('kp_history')
      .select('*')
      .eq('kid_id', kid.id)
      .order('ts', { ascending: false })
    setHistory(data || [])
    setLoading(false)
  }, [kid.id])

  useEffect(() => { loadHistory() }, [loadHistory])

  const score = calcScore(history)
  const weekPts = calcWeekPts(history)
  const totalEarned = calcTotalEarned(history)
  const pet = PETS[kid.pet_type] || PETS.cat
  const weekGoal = kid.week_goal || 50
  const weekPct = Math.min(100, Math.round((weekPts / weekGoal) * 100))
  const achieved = weekPts >= weekGoal
  const shortBy = Math.max(0, weekGoal - weekPts)
  const weekend = isWeekend()
  const sunday = isSunday()

  return (
    <div className="page">
      <header className="header" style={{ borderBottom: `3px solid ${kid.color}` }}>
        <div className="header-kid-info">
          <span className="header-pet">{pet.e}</span>
          <div>
            <div className="header-kid-name">{kid.name}</div>
            <div className="header-score">{score} 點</div>
          </div>
        </div>
        <div className="header-actions">
          {onBack && <button className="btn-text" onClick={onBack}>← 返回</button>}
          <button className="btn-text" onClick={onLogout}>登出</button>
        </div>
      </header>

      <div className="week-progress-wrap">
        <div className="week-progress-label">
          <span>本週 {weekPts} / {kid.week_goal} 點</span>
          <span>{weekPct}%</span>
        </div>
        <div className="week-progress-bar-row">
          <div className="week-progress-bar">
            <div className="week-progress-fill" style={{ width: weekPct + '%', background: kid.color }} />
          </div>
          <span className="week-progress-date">{fmtTodayLabel()}</span>
        </div>

        {achieved ? (
          <div className="week-status-msg status-achieved">🎊 本週已達標！繼續累積積分吧</div>
        ) : sunday ? (
          <div className="week-status-msg status-final-day">
            🚨 今天是最後一天！{kid.week_penalty ? `未達標懲罰：${kid.week_penalty}` : `還差 ${shortBy} 分達標`}
          </div>
        ) : weekend ? (
          <div className="week-status-msg status-warning">
            ⚠️ 快達標！還差 {shortBy} 分{kid.week_penalty ? `，未達標懲罰：${kid.week_penalty}` : ''}
          </div>
        ) : (
          <div className="week-status-msg status-encourage">
            💪 本週加油！還差 {shortBy} 分達標{kid.week_penalty ? `，未達標懲罰：${kid.week_penalty}` : ''}
          </div>
        )}

        {taskStats && taskStats.total > 0 && (
          <div className="daily-completion-hint">
            今日每日任務：{taskStats.completed}／{taskStats.total} 項完成
            （{Math.round(taskStats.completed / taskStats.total * 100)}%）
          </div>
        )}
      </div>

      <div className="tabs">
        {[['tasks','任務'], ['rewards','獎品'], ['pet','寵物']].map(([v, label]) => (
          <button key={v} className={`tab ${tab===v?'active':''}`}
            style={tab===v ? { color: kid.color, borderColor: kid.color } : {}}
            onClick={() => setTab(v)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <div className="loading">載入中...</div> : (
        <>
          {tab === 'tasks' && <TaskBoard kid={kid} history={history} onRefresh={loadHistory} isParent={isParent} onStatsUpdate={setTaskStats} />}
          {tab === 'rewards' && <RewardShop kid={kid} score={score} history={history} onRefresh={loadHistory} isParent={isParent} />}
          {tab === 'pet' && <Pet kid={kid} totalEarned={totalEarned} history={history} />}
        </>
      )}
    </div>
  )
}
