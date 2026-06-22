# WeiPay

聚合支付平台，提供商户接入、聚合下单、多渠道支付（支付宝 / PayPal / 自有兜底）、收银台、管理后台等能力。

## 仓库结构

```
WeiPay/
├── server/    NestJS 11 + TypeORM + MySQL  服务端
└── client/    React 19 + Vite 8 + Tailwind 4  Web 端
```

详细文档见各子项目：

- [`server/README.md`](./server/README.md)
- [`client/README.md`](./client/README.md)

## 技术栈速览

| 端 | 主要技术 |
|---|---|
| 后端 | NestJS 11、TypeORM、MySQL、Passport-JWT、Socket.IO、Swagger、Winston |
| 前端 | React 19、Vite 8、TailwindCSS 4、HeroUI、Framer Motion、React Router 7 |
| 支付 | 支付宝（alipay-sdk）、PayPal（Checkout Server SDK）、自有兜底通道 |

## 本地启动

需要：Node 20+，pnpm，MySQL 8。

### 1. 后端

```bash
cd server
cp .env.example .env       # 填写数据库 / JWT / 第三方凭证
pnpm install
pnpm dev                   # http://localhost:3000
```

API 文档：<http://localhost:3000/api/docs>

### 2. 前端

```bash
cd client
cp .env.example .env.local
pnpm install
pnpm dev                   # http://localhost:5173
```

前端开发服务器已通过 `vite.config.ts` 将 `/api` 代理到后端 `http://localhost:3000`。

## 核心功能

- **商户接入**：基于 `appKey + appSecret` 签名的下单网关
- **聚合下单**：自动按规则路由到支付宝 / PayPal / 自有兜底
- **收银台**：订单状态轮询、二维码 / 钱包登录、渠道切换
- **异步通知**：失败重试队列（指数退避）
- **管理后台**：交易统计、订单列表、商户凭证管理
- **SSO**：与 we29.cn 单点登录集成
- **实时推送**：Socket.IO 推送订单状态变更

## 安全建议

- 生产环境务必将 `DB_SYNCHRONIZE` 设为 `false`，使用 TypeORM 迁移管理表结构
- `JWT_SECRET` / `GATEWAY_SECRET` / `ENCRYPTION_KEY` 使用 `openssl rand -hex 32` 生成
- 生产环境 `ENCRYPTION_KEY` 为必填项（与 `JWT_SECRET` 必须不同）
- 严禁提交 `.env` / `.env.local` 等密钥文件
- 支付宝 / PayPal 凭证通过环境变量注入
- `ENABLE_SANDBOX` 生产环境必须设为 `false`
- `PAYPAL_ENVIRONMENT` 生产环境设为 `live`

## License

UNLICENSED — Internal use only.
