import { type FormEvent, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { itemTypeLabels, priceRangeLabels } from '../stores/storeUtils'
import type { ItemRow, ItemType, PriceRange } from '../../types/database'

export interface ItemFormValue {
  name: string
  itemType: ItemType
  exactPrice: number | null
  priceRange: PriceRange | null
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
  const [priceRange, setPriceRange] = useState<PriceRange | null>(item?.price_range ?? null)
  const [categoryTags, setCategoryTags] = useState(item?.category_tags.join('，') ?? '')
  const [tasteTags, setTasteTags] = useState(item?.taste_tags.join('，') ?? '')
  const [note, setNote] = useState(item?.note ?? '')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSave({
      name: name.trim(),
      itemType,
      exactPrice: exactPrice === '' ? null : Number(exactPrice),
      priceRange,
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
        <fieldset className="price-range-field">
          <legend>价格区间</legend>
          <div className="price-range-options">
            {Object.entries(priceRangeLabels).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`chip${priceRange === value ? ' is-selected' : ''}`}
                aria-pressed={priceRange === value}
                onClick={() => setPriceRange((current) => current === value ? null : value as PriceRange)}
              >
                {label}
              </button>
            ))}
          </div>
          <small>点一下快速选择，再点一次取消。</small>
        </fieldset>
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