import { useState, useRef, useEffect } from 'react'

// ─── Long Press ───────────────────────────────────────────
export function useLongPress(callback, ms = 500) {
  const timer = useRef(null)
  const [pressing, setPressing] = useState(false)

  function start(e) {
    e.stopPropagation()
    e.preventDefault()
    setPressing(true)
    timer.current = setTimeout(() => {
      setPressing(false)
      callback()
    }, ms)
  }

  function cancel() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    setPressing(false)
  }

  return {
    handlers: {
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onTouchStart: start,
      onTouchEnd: cancel,
      onTouchCancel: cancel,
      onContextMenu: e => e.preventDefault(),
    },
    pressing,
  }
}

export function LongPressDeleteBtn({ onDelete, className = '' }) {
  const { handlers, pressing } = useLongPress(onDelete)
  return (
    <button
      className={`btn-sm btn-danger btn-long-press ${pressing ? 'pressing' : ''} ${className}`}
      {...handlers}
    >
      <span className="long-press-bar" />
      刪除
    </button>
  )
}

// ─── ⋯ More Menu ────────────────────────────────────────
export function MoreMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
    }
  }, [open])

  return (
    <div className="more-menu-wrap" ref={ref}>
      <button
        className="btn-sm btn-more"
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
      >⋯</button>
      {open && (
        <div className="more-menu" onClick={e => e.stopPropagation()}>
          <button className="more-menu-item" onClick={() => { setOpen(false); onEdit() }}>✏️ 編輯</button>
          <LongPressDeleteBtn onDelete={() => { setOpen(false); onDelete() }} />
        </div>
      )}
    </div>
  )
}

// ─── Focus scroll (mobile keyboard fix) ────────────────
export const focusScroll = e => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
