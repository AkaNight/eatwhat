import { type FormEvent, useState } from 'react'
import { Modal } from '../../components/ui/Modal'

interface ReasonModalProps {
  title: string
  reasons: string[]
  pending: boolean
  error: string | null
  onClose(): void
  onSave(reason: string): Promise<void>
}

export function ReasonModal({ title, reasons, pending, error, onClose, onSave }: ReasonModalProps) {
  const [reason, setReason] = useState(reasons[0] ?? '')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSave(reason)
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form className="data-form" onSubmit={handleSubmit}>
        <fieldset className="reason-options">
          <legend>选择一个原因</legend>
          {reasons.map((option) => (
            <label key={option}>
              <input type="radio" name="reason" value={option} checked={reason === option} onChange={() => setReason(option)} />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
        {error && <p className="form-message is-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="ghost-button" onClick={onClose}>取消</button>
          <button type="submit" className="danger-button" disabled={pending}>{pending ? '保存中…' : '确认拉黑'}</button>
        </div>
      </form>
    </Modal>
  )
}
