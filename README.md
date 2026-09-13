# 今天吃啥

手机端优先的个人外卖记录与推荐 PWA。推荐候选只来自用户自己的外卖库。

## 当前进度

Phase 1 已完成：React + TypeScript + Vite、四个主页面、底部导航、响应式手机布局与 PWA 基础配置。

Phase 2 已完成：Supabase 数据库迁移、RLS、TypeScript 数据库类型，以及隔离 SDK 的 DataService / Repository 层。

Phase 3 已完成：邮箱注册、登录、登出、登录态恢复和受保护路由。

Phase 4 已完成：店铺与商品 CRUD、搜索、店铺详情，以及店铺和商品的拉黑/恢复。

Phase 5 已完成：多商品订单记录、现场新建店铺与商品、整单和单品评价，以及历史订单。

Phase 6 已完成：首页“最近想吃”的新增、删除和“解馋了”操作。

Phase 7 已完成：可解释评分、Top 10 加权随机推荐、今日跳过、选择与换一批。

Phase 8 已完成：IndexedDB 读取缓存、联网自动刷新、离线状态、安装入口与版本更新提示。

v0.1 补充完成：“我的”页支持长期偏好、带有效期的临时偏好，以及店铺/商品黑名单集中查看与恢复。

当前版本已通过真实 Supabase 账号闭环验收：店铺、主餐、饮料、多商品订单、craving、推荐跳过/选择与偏好同步均可用。

## 本地运行

```bash
npm install
npm run dev
```

## 检查与构建

```bash
npm run typecheck
npm run build
```

## 环境变量

复制 `.env.example` 为 `.env.local`，填写 Supabase 项目 URL，以及 Publishable Key 或旧版 anon key。它们是受 RLS 保护的公开客户端配置；服务端密钥绝不能放进前端。

数据库结构通过迁移文件管理，不需要在网页控制台逐表创建：

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

迁移位于 `supabase/migrations/`。所有业务表均包含 `user_id` 并启用 RLS。

## 目录结构

```text
src/
  app/
  components/
  pages/
    Today/
    Record/
    Library/
    Profile/
  styles/
  repositories/
  services/data/
  types/
supabase/
  migrations/
```
