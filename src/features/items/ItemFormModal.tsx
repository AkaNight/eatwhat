import { type FormEvent, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { itemTypeLabels, priceBucketLabels } from '../stores/storeUtils'
import type { ItemRow, ItemType, PriceBucket } from '../../types/database'

export interface ItemFormValue {
  name: string
  itemType: ItemType
  exactPrice: number | null
  priceBucket: PriceBucket | null
  categoryTags: string[]
  tasteTags: string[]
  note: string | null
}

interface ItemFormModalProps {
  item?: ItemRow
  pending: boolean
  error: string | null
  onClose(): void
  onSave(value: ItemFormValue): Promise<void>
}

function parseTags(value: string): string[] {
  return [...new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))]
}

export function ItemFormModal({ item, pending, error, onClose, onSave }: ItemFormModalProps) {
  const [name, setName] = useState(item?.name ?? '')
  const [itemType, setItemType] = useState<ItemType>(item?.item_type ?? 'meal')
  const [exactPrice, setExactPrice] = useState(item?.exact_price?.toString() ?? '')
  const [priceBucket, setPriceBucket] = useState<PriceBucket | ''>(item?.price_bucket ?? '')
  const [categoryTags, setCategoryTags] = useState(item?.category_tags.join('，') ?? '')
  const [tasteTags, setTasteTags] = useState(item?.taste_tags.join('，') ?? '')
  const [note, setNote] = useState(item?.note ?? '')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSave({
      name: name.trim(),
      itemType,
      exactPrice: exactPrice === '' ? null : Number(exactPrice),
      priceBucket: priceBucket || null,
      categoryTags: parseTags(categoryTags),
      tasteTags: parseTags(tasteTags),
      note: note.trim() || null,
    })
  }

  return (
    <Modal title={item ? '编辑商品' : '添加商品'} onClose={onClose}>
      <form className="data-form" onSubmit={handleSubmit}>
        <label>
          <span>商品名 <b>*</b></span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} autoFocus required />
        </label>
        <div className="form-grid">
          <label>
            <span>类型</span>
            <select value={itemType} onChange={(event) => setItemType(event.target.value as ItemType)}>
              {Object.entries(itemTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>精确价格</span>
            <input type="number" min="0" step="0.01" inputMode="decimal" value={exactPrice} onChange={(event) => setExactPrice(event.target.value)} placeholder="可不填" />
          </label>
        </div>
        <label>
          <span>价格感觉</span>
          <select value={priceBucket} onChange={(event) => setPriceBucket(event.target.value as PriceBucket | '')}>
            <option value="">不记录</option>
            {Object.entries(priceBucketLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>品类标签</span>
          <input value={categoryTags} onChange={(event) => setCategoryTags(event.target.value)} placeholder="米线，粉面" />
          <small>用逗号分隔，表示“它是什么”。</small>
        </label>
        <label>
          <span>口味标签</span>
          <input value={tasteTags} onChange={(event) => setTasteTags(event.target.value)} placeholder="辣，带汤，热食" />
          <small>用逗号分隔，表示“吃起来怎么样”。</small>
        </label>
        <label>
          <span>备注</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="可不填" />
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
