import { type FormEvent, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import type { StoreRow } from '../../types/database'

export interface StoreFormValue {
  name: string
  note: string | null
}

interface StoreFormModalProps {
  store?: StoreRow
  pending: boolean
  error: string | null
  onClose(): void
  onSave(value: StoreFormValue): Promise<void>
}

export function StoreFormModal({ store, pending, error, onClose, onSave }: StoreFormModalProps) {
  const [name, setName] = useState(store?.name ?? '')
  const [note, setNote] = useState(store?.note ?? '')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSave({ name: name.trim(), note: note.trim() || null })
  }

  return (
    <Modal title={store ? '编辑店铺' : '添加店铺'} onClose={onClose}>
      <form className="data-form" onSubmit={handleSubmit}>
        <label>
          <span>店铺名 <b>*</b></span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoFocus required />
        </label>
        <label>
          <span>备注</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="比如：工作日午餐常点" />
        </label>
        {error && <p className="form-message is-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="ghost-button" onClick={onClose}>取消</button>
          <button type="submit" className="primary-button compact-button" disabled={pending || !name.trim()}>
            {pending ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
