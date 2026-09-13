import { Link } from 'react-router-dom'

const repositoryUrl = 'https://github.com/AkaNight/eatwhat'

export function SelfDeployPage() {
  return (
    <main className="guide-shell">
      <header className="guide-header">
        <Link className="showcase-logo" to="/"><span>食</span>今天吃啥</Link>
        <Link className="text-link" to="/">返回展示</Link>
      </header>

      <section className="guide-intro">
        <p className="eyebrow">自己部署</p>
        <h1>把应用和数据都放在自己的账号里</h1>
        <p>你需要一个 GitHub 账号和一个免费的 Supabase 项目。公开网页只负责运行应用，所有外卖记录保存在你自己的 Supabase 数据库中。</p>
        <a className="primary-link" href={repositoryUrl} target="_blank" rel="noreferrer">打开项目源码</a>
      </section>

      <ol className="deploy-steps">
        <li>
          <span>1</span><div><h2>复制项目</h2><p>在源码页面点击 <strong>Fork</strong>，把项目复制到自己的 GitHub 账号。</p></div>
        </li>
        <li>
          <span>2</span><div><h2>创建 Supabase 项目</h2><p>新建项目后，在 <strong>SQL Editor</strong> 中按文件名顺序运行 <code>supabase/migrations</code> 目录里的 SQL 文件。</p></div>
        </li>
        <li>
          <span>3</span><div><h2>创建自己的登录账号</h2><p>在 Supabase 的 <strong>Authentication → Users</strong> 中添加用户。个人使用时建议关闭新用户公开注册。</p></div>
        </li>
        <li>
          <span>4</span><div><h2>填入连接信息</h2><p>在 GitHub 仓库的 <strong>Settings → Secrets and variables → Actions</strong> 添加下面两个 Repository secrets：</p><pre><code>VITE_SUPABASE_URL{`\n`}VITE_SUPABASE_PUBLISHABLE_KEY</code></pre><p>它们来自 Supabase 的项目 API 设置。Publishable Key 可以放在前端；不要使用 service_role key。</p></div>
        </li>
        <li>
          <span>5</span><div><h2>打开 GitHub Pages</h2><p>进入 <strong>Settings → Pages</strong>，把 Source 设为 <strong>GitHub Actions</strong>。回到 Actions 手动运行一次 Deploy，之后每次更新主分支都会自动发布。</p></div>
        </li>
        <li>
          <span>6</span><div><h2>设置登录回跳地址</h2><p>在 Supabase 的 <strong>Authentication → URL Configuration</strong>，把 Site URL 和 Redirect URLs 改成自己的 GitHub Pages 地址。</p></div>
        </li>
      </ol>

      <aside className="guide-note"><strong>隐私说明</strong><p>GitHub Pages 上的前端代码是公开的，但业务数据不在 GitHub。数据库中的 RLS 策略会按登录用户隔离记录。</p></aside>
      <div className="guide-footer"><Link className="secondary-link" to="/">回到展示页</Link><a className="primary-link" href={repositoryUrl} target="_blank" rel="noreferrer">开始部署</a></div>
    </main>
  )
}