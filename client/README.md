# WeiPay Client

WeiPay 聚合支付平台的前端，基于 **React 19 + Vite 8 + TailwindCSS 4 + HeroUI** 构建。

## 技术栈

- **框架**: React 19 + TypeScript
- **构建**: Vite 8
- **样式**: TailwindCSS 4 + HeroUI 3
- **动画**: Framer Motion 12
- **路由**: React Router 7
- **图标**: lucide-react + react-icons

## 目录结构

```
src/
├── pages/
│   ├── Home.tsx         首页 / 介绍
│   ├── Login.tsx        登录（支持 SSO 回跳）
│   ├── Dashboard.tsx    管理后台（统计 / 订单 / 商户）
│   ├── Cashier.tsx      收银台（订单轮询 + 多渠道支付）
│   └── MobilePay.tsx    移动端支付页
├── components/          复用组件（ThemeToggle …）
├── context/             AuthContext / ThemeContext / ToastContext
├── utils/               工具函数
├── App.tsx              路由配置
└── main.tsx             入口
```

## 路由

| 路径 | 页面 | 说明 |
|---|---|---|
| `/` | Home | 平台首页 |
| `/login` | Login | 登录 / SSO 回跳 |
| `/dashboard` | Dashboard | 管理后台（需登录） |
| `/cashier?orderNo=xxx` | Cashier | 收银台 |
| `/mobile-pay` | MobilePay | 移动端支付 |

## 快速开始

```bash
pnpm install
pnpm dev          # 启动开发服务器 http://localhost:5173
pnpm build        # 类型检查 + 生产构建
pnpm preview      # 预览生产构建
pnpm lint         # ESLint
```

## 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

| 变量 | 说明 |
|---|---|
| `VITE_API_BASE` | 后端 API 基础路径，默认走 Vite 代理 `/api` |

## 与后端联调

`vite.config.ts` 已配置开发代理：所有 `/api` 请求会转发到 `http://localhost:3000`，无需额外配置 CORS。

生产环境建议反向代理（Nginx）将 `/api/*` 转发到后端服务。

## UI 主题

- 暗色 / 亮色双主题（`ThemeContext` + `ThemeToggle`）
- 全局选中色：emerald-500
- 平滑过渡（400ms）
