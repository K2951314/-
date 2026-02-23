# v9 智能查价系统

## 1. 当前架构
- 线上页面：`apps/v9/index.html`
- 价格包：远程优先（`stock-data` 分支 hash 文件 + manifest），本地 `apps/v9/price.bundle.js` 兜底
- 库存包：远程优先（`stock-data` 分支），本地 `apps/v9/stock.bundle.js` 兜底
- 发布目录：Netlify 指向 `apps/v9`

## 2. 查询端功能
- `智能匹配`：保留原有“关键词包含”逻辑
- `正则转换`：新增按钮，按“空格=通配符”规则转正则并立即查询
  - 示例：`WNMG080408 UC5115` -> `WNMG080408.*UC5115`（忽略大小写）
  - 匹配范围：`规格 + 代码 + 备注`
  - 不会改写输入框原文

## 3. 价格加密策略（已切换）
- 不使用 Excel `Password Sheet`
- 密码统一放 GitHub Secrets：`PRICE_BUNDLE_PASSWORD`
- 价格同步工作流支持两种模式：
  - `encrypted`：加密发布（需要 `PRICE_BUNDLE_PASSWORD`）
  - `plain`：明文发布（用于“删除密码”）

## 4. 改密码 / 删密码
1. 改密码
- 到 GitHub `Settings -> Secrets and variables -> Actions`
- 更新 `PRICE_BUNDLE_PASSWORD`
- 手动运行 `Sync Price Bundle`，`mode=encrypted`

2. 删密码
- 手动运行 `Sync Price Bundle`，`mode=plain`
- 发布后前端不再提示价格包密码

## 5. 必要配置文件
- `config/system.json`
- `config/stock-source.json`
- `config/stock-source.schema.json`
- `config/price-source.json`
- `config/price-source.schema.json`

## 6. 必要 GitHub Secrets
- `STOCK_SOURCE_URL`（必填）
- `STOCK_SOURCE_TOKEN`（可选）
- `PRICE_SOURCE_URL`（必填）
- `PRICE_SOURCE_TOKEN`（可选）
- `PRICE_BUNDLE_PASSWORD`（仅 encrypted 模式需要）

## 7. 链接可用性检查（文件/API，不是页面）
用下面命令检查你的在线链接：

```powershell
curl.exe -L -o NUL -w "http:%{http_code} type:%{content_type}`n" "在线表格链接"
```

判定标准：
- `http:200`
- `type` 不是 `text/html`

如果是 `text/html`，说明这是“网页页面链接”，不能直接作为同步源。

## 8. 工作流说明
### 8.1 库存自动同步（每日）
- 文件：`.github/workflows/sync-stock.yml`
- 定时：`cron: "0 16 * * *"`（北京时间每日 00:00）
- 产物：`stock-data/apps/v9/stock.bundle.js`

### 8.2 价格自动同步（每日）
- 文件：`.github/workflows/sync-price.yml`
- 定时：`cron: "15 16 * * *"`（北京时间每日 00:15）
- 支持手动 `workflow_dispatch` 选择 `mode`
- 产物：
  - `stock-data/apps/v9/price/price.<sha>.bundle.js`
  - `stock-data/apps/v9/price-manifest.json`

### 8.3 价格手动发布（保留）
- 文件：`.github/workflows/publish-price.yml`
- 用途：从本地 `apps/v9/price.bundle.js` 手动发布 hash 价格包

## 9. 本地命令
安装依赖：

```bash
npm ci
```

运行测试：

```bash
npm test
```

库存同步（本地）：

```bash
npm run sync:stock
```

价格同步（本地，默认 encrypted）：

```bash
npm run sync:price
```

价格 hash 发布（本地验证）：

```bash
npm run publish:price
```

健康检查：

```bash
npm run doctor
```

## 10. 调整同步频率
修改以下文件中的 `cron`：
- `.github/workflows/sync-stock.yml`
- `.github/workflows/sync-price.yml`

常用示例（UTC）：
- 每小时：`0 * * * *`
- 每 6 小时：`0 */6 * * *`
- 每天 1 次（北京时间 00:00）：`0 16 * * *`
