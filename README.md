# 今天吃啥

手机端优先的个人外卖记录与推荐 PWA。推荐候选只来自用户自己的外卖库。

公开站点默认是纯展示页，使用内置样例，不读取或写入访客数据。站点主人可以从隐藏在展示页右上角的入口登录真实应用；其他人可按站内 `/deploy` 教程部署自己的副本和数据库。

## 已实现

- 店铺、商品、订单与历史记录
- `¥10–30`、`¥30–50`、`¥50–80`、`¥80–100`、`¥100+` 快速价格区间
- 整单与单品评价、踩雷拉黑与恢复
- 最近想吃、长期/临时偏好
- 可解释的个性化推荐、跳过和换一批
- Supabase 登录、RLS 用户数据隔离
- IndexedDB 读取缓存、离线状态与可安装 PWA
- 公开展示页、主人登录入口和内置自部署教程

## 本地运行

```bash
npm install
copy .env.example .env.local
npm run dev
```

在 `.env.local` 填写：

```text
VITE_SUPABASE_URL=你的项目地址
VITE_SUPABASE_PUBLISHABLE_KEY=你的公开客户端 Key
```

Publishable Key 可以用于浏览器客户端；不要把 `service_role` key 放进前端。

## 数据库

新建 Supabase 项目后，在 SQL Editor 中按文件名顺序运行 `supabase/migrations/` 下的迁移，或使用 CLI：

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

所有业务表均包含 `user_id` 并启用 RLS。个人实例建议在创建自己的用户后关闭公开注册。

## 检查与构建

```bash
npm run typecheck
npm test
npm run build
```

## 部署到 GitHub Pages

仓库自带 `.github/workflows/deploy-pages.yml`：

1. 在仓库 Actions variables 中添加 `ENABLE_PAGES_DEPLOYMENT=true`，再在 Actions secrets 中添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。
2. 在 Settings → Pages 中选择 GitHub Actions。
3. 手动运行一次 Deploy，之后推送 `main` 会自动测试并发布。
4. 在 Supabase Authentication → URL Configuration 中填写自己的 Pages 地址。

## 目录结构

```text
src/                 应用、展示页和教程
supabase/migrations/ 数据库结构与升级
.github/workflows/   自动测试与部署
```