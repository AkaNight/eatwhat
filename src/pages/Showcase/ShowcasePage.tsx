import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'

const samples = [
  { store: '巷口小面', item: '番茄鸡蛋面', price: '¥18', meta: '吃过 4 次 · 12 天没吃', reasons: ['想吃带汤的', '价格轻松', '最近没吃面'] },
  { store: '南城便当', item: '香菇鸡肉饭', price: '¥26', meta: '吃过 2 次 · 8 天没吃', reasons: ['符合清淡', '以前点过', '今天没重复'] },
  { store: '阿婆米线', item: '酸辣牛肉米线', price: '¥32', meta: '吃过 3 次 · 16 天没吃', reasons: ['最近想吃米线', '符合辣', '很久没吃了'] },
]

export function ShowcasePage() {
  const { user } = useAuth()
  const [sampleIndex, setSampleIndex] = useState(0)
  const sample = samples[sampleIndex]

  return (
    <main className="showcase-shell">
      <header className="showcase-nav">
        <Link className="showcase-logo" to="/"><span>食</span>今天吃啥</Link>
        <div>
          <Link className="text-link" to="/deploy">自己部署</Link>
          <Link className="owner-link" to={user ? '/app' : '/auth'}>{user ? '进入我的应用' : '我是站点主人'}</Link>
        </div>
      </header>

      <section className="showcase-hero">
        <div className="showcase-copy">
          <p className="eyebrow">个人外卖记忆库 · 开源 PWA</p>
          <h1>不再研究附近有什么，<br />只从自己吃过的里面选。</h1>
          <p className="showcase-lead">记录店铺、菜品和踩雷原因；下次纠结时，用你的真实历史给出几项能吃的答案。</p>
          <div className="showcase-actions">
            <a className="primary-link" href="#demo">看看它怎么选</a>
            <Link className="secondary-link" to="/deploy">部署一份给自己</Link>
          </div>
          <p className="privacy-note">公开页面只展示内置样例，不连接访客数据，本站也不提供公共注册入口。</p>
        </div>

        <div className="demo-phone" id="demo" aria-label="产品功能演示">
          <div className="demo-phone-top"><span>今天吃啥</span><small>纯展示数据</small></div>
          <div className="demo-section">
            <p className="section-kicker">今天有什么要求</p>
            <div className="demo-chips"><span>带汤</span><span>便宜点</span><span className="muted-chip">清淡</span></div>
          </div>
          <article className="demo-result">
            <div><p>{sample.store}</p><h2>{sample.item}</h2></div>
            <strong>{sample.price}</strong>
            <small>{sample.meta}</small>
            <div className="demo-reasons">{sample.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>
          </article>
          <button className="demo-swap" type="button" onClick={() => setSampleIndex((current) => (current + 1) % samples.length)}>换一个看看</button>
        </div>
      </section>

      <section className="showcase-features" aria-label="主要功能">
        <article><span>01</span><h2>只记有用的</h2><p>店铺、菜品、价格区间、是否还会点，以及明确的踩雷原因。</p></article>
        <article><span>02</span><h2>推荐有依据</h2><p>结合最近想吃、口味、价格和点单时间，并告诉你为什么推荐。</p></article>
        <article><span>03</span><h2>数据归自己</h2><p>每个人部署自己的 Supabase；公开演示站不收集任何外卖记录。</p></article>
      </section>

      <section className="showcase-cta">
        <div><p className="section-kicker">想真正用起来？</p><h2>大约十分钟，部署属于你自己的版本。</h2></div>
        <Link className="primary-link" to="/deploy">打开自部署教程</Link>
      </section>
    </main>
  )
}