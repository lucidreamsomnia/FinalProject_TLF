function StatusMessage({ tone = 'info', title, children }) {
  return (
    <div className={`status-message status-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <strong>{title}</strong>
      {children ? <span>{children}</span> : null}
    </div>
  )
}

export default StatusMessage
