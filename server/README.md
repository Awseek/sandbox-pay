# WeiPay Server

WeiPay 聚合支付平台的后端服务，基于 **NestJS 11 + TypeORM + MySQL** 构建，提供商户管理、聚合下单、第三方支付网关回调、异步通知重试、管理后台 API 等能力。

## 技术栈

- **框架**: NestJS 11 (Express)
- **数据库**: MySQL 8 + TypeORM 0.3
- **鉴权**: Passport-JWT
- **支付渠道**: 支付宝 (alipay-sdk)、PayPal (Checkout Server SDK)、自有兜底通道 (Native)
- **实时通信**: Socket.IO（订单状态推送）
- **API 文档**: Swagger (`/api/docs`)
- **定时任务**: `@nestjs/schedule` + cron（异步通知重试）
- **日志**: Winston + nest-winston
- **校验**: class-validator + 全局 ValidationPipe

## 目录结构

```
src/
├── auth/          JWT 鉴权 + SSO 回调 (we29.cn)
├── admin/         管理后台 API（统计 / 订单 / 商户）
├── payment/       支付核心
│   ├── controllers/   alipay / paypal / native-pay
│   ├── gateways/      第三方网关封装
│   ├── services/      统一下单服务
│   └── payment.gateway.ts   Socket.IO Gateway
├── gateway/       商户接入网关（签名校验 + 回调）
├── common/        异常过滤器 / 响应拦截器 / Correlation-Id / 定时任务
├── entities/      User / Merchant / PaymentOrder / NotifyQueue
└── main.ts        入口（全局管道 / 过滤器 / Swagger / CORS）
```

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写：

```bash
cp .env.example .env
```

关键变量：

| 变量 | 说明 |
|---|---|
| `PORT` | 服务端口，默认 3000 |
| `DB_*` | MySQL 连接配置 |
| `DB_SYNCHRONIZE` | **生产必须设为 `false`**，开发可设 `true` |
| `JWT_SECRET` | JWT 签名密钥（必填） |
| `GATEWAY_SECRET` | 商户接入网关签名密钥 |
| `CLIENT_URL` | 客户端地址，用于 SSO 重定向 |
| `ALIPAY_*` | 支付宝沙箱/正式凭证 |
| `PAYPAL_*` | PayPal 应用凭证 |
| `ENCRYPTION_KEY` | 商户密钥加密密钥（生产必填） |
| `PAYPAL_ENVIRONMENT` | PayPal 环境：sandbox / live |

### 3. 初始化数据库

确保已创建数据库（默认 `wepay_db`）。开发模式下 `DB_SYNCHRONIZE=true` 会自动建表。

### 4. 启动

```bash
# 开发（热重载）
pnpm dev

# 生产构建
pnpm build && pnpm start:prod
```

启动后：

- API: <http://localhost:3000>
- Swagger 文档: <http://localhost:3000/api/docs>

## 主要 API 模块

所有业务接口均以 `/v1/api/` 为前缀（URI 版本策略）。

| 路径前缀 | 模块 | 说明 |
|---|---|---|
| `/v1/api/auth` | Auth | SSO 回调（we29.cn） |
| `/v1/api/admin` | Admin | 统计、订单列表、商户管理（需 JWT） |
| `/v1/api/native-pay` | NativePay | 收银台数据 / 沙箱确认 / 渠道切换 |
| `/v1/api/alipay` | Alipay | 支付宝下单 + 异步通知 |
| `/v1/api/paypal` | PayPal | PayPal 下单 + capture |
| `/v1/api/gateway` | Gateway | 商户接入下单（签名校验） |

## 架构要点

- **全局响应包装**: `TransformInterceptor` 统一返回 `{ code, data, msg }`
- **全局异常**: `AllExceptionsFilter` 捕获并格式化所有异常
- **CorrelationId 中间件**: 每个请求注入唯一 ID，便于链路追踪
- **异步通知队列**: `NotifyQueue` 表 + 定时任务对商户回调失败做指数退避重试
- **聚合下单**: 商户调用 `/api/gateway` 创建订单，后端按规则路由到支付宝 / PayPal / 自有兜底

## 开发命令

```bash
pnpm dev          # 开发模式
pnpm build        # 编译
pnpm start:prod   # 运行编译产物
pnpm lint         # ESLint 修复
pnpm format       # Prettier 格式化
```

## 安全注意事项

- 生产环境务必设置 `DB_SYNCHRONIZE=false`，使用迁移脚本管理表结构
- `JWT_SECRET` / `GATEWAY_SECRET` 必须使用足够长度的随机串
- 不要将 `.env` 提交到仓库
- 支付宝 / PayPal 凭证使用环境变量注入，避免硬编码
