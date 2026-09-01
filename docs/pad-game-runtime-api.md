# PAD Game Runtime APIs

本文档是 PAD 游戏配置与奖品上传两个耦合接口的前端接入契约。字段语义以已确认的后端约定为准。

## 通用响应

两个接口沿用现有响应信封：

- `code === 0`：成功。
- `code === 2`：参数错误。
- 其他非零状态按接口错误处理，并展示后端 `msg`。

## 获取门店游戏配置

```http
GET /merchant/global/pad-game-config
```

查询参数：

```ts
{
  storeId: string;
}
```

### 获取时机

- 保留当前页面加载配置的调用时机，不增加轮询。
- 每次进入具体游戏前再请求一次；请求成功后，将当前 `storeId` 和配置响应共同固定为本局上下文。
- 游戏前的配置请求失败时阻止开始，不使用旧配置。
- 游戏开始后不刷新配置。客户端始终按开局时的配置计算本局分数；后端按上传结果时该门店的有效配置发奖。
- 配置响应的 `data` 为 `null` 时执行登出。

### 配置校验

- `data` 非空但前端必需字段缺失、类型错误或数值非法时，显示配置错误并阻止开局。
- 非法配置不能回退到前端默认游戏规则。
- 图标字段沿用当前本地素材兜底，是唯一允许的字段级兜底。
- `qrReturnSeconds` 必须是大于或等于 `0` 的整数。
- `diamondCount` 和 `bombCount` 必须是大于或等于 `0` 的整数；`gameTimeSeconds` 必须是正整数。
- `diamondScore` 和 `coloredRewardValue` 必须是大于或等于 `0` 的整数；`bombDeductScore` 必须是正整数。
- `coloredEnabled` 必须是布尔值，`coloredRewardType` 只接受 `SCORE` 或 `CONSUMER_POINT`。
- 每个 `scoreBuckets[].score` 必须是大于或等于 `0` 的整数，每个 `count` 必须是正整数，展开后的格子总数必须恰好为 `9`。

### 前端使用字段

配置响应的 `data` 只需要包含本节列出的运行时字段。前端不依赖配置 ID、名称、版本、领取限制、额度统计、奖励区间或 Jackpot 配置。

#### 通用配置

| 字段 | 前端行为 |
| --- | --- |
| `qrReturnSeconds` | 二维码结果页完成展示后开始倒计时。倒计时结束且用户未手动返回时，自动返回游戏选择页；所有使用二维码的模式都生效。值为 `0` 时不自动返回。 |

#### Diamond Rain

| 字段 | 前端行为 |
| --- | --- |
| `diamondCount` | 普通钻石数量，不包含彩钻。 |
| `bombCount` | 炸弹数量。 |
| `gameTimeSeconds` | 游戏时间，单位为秒。 |
| `diamondScore` | 每颗普通钻石的分数，值不小于 `0`。 |
| `bombDeductScore` | 后端返回正数形式的扣减值；前端转换为负数参与计算。总分最低为 `0`。 |
| `coloredEnabled` | 彩钻开关。关闭时不生成彩钻；开启时只生成一颗彩钻。 |
| `coloredRewardType=SCORE` | `coloredRewardValue` 加入本局最终总分。 |
| `coloredRewardType=CONSUMER_POINT` | `coloredRewardValue` 不加入总分；前端通过奖品上传请求的 `extra` 字段告知后端是否捡到彩钻，最终奖励完全以上传响应为准。 |
| `normalIcon` / `bombIcon` / `coloredIcon` | 沿用当前图标解析和兜底规则，本次不调整。 |

#### Bingo

- `scoreBuckets[].score` 是分数。
- `scoreBuckets[].count` 是该分数对应的格子数量。
- `scoreBuckets` 的数组长度表示分值档位数量，不要求等于棋盘格数；真正的棋盘格数是所有 `count` 之和。
- 所有 `count` 之和必须为 `9`，对应固定的 3x3 棋盘；不满足时显示配置错误并阻止进入游戏。
- 例如 `[{ score: 4, count: 1 }, { score: 3, count: 1 }, { score: 2, count: 4 }, { score: 1, count: 3 }]` 会展开为 `9` 个格子，可以正常进入游戏。
- 每局只允许选择 3 个格子。

## 上传游戏结果并生成二维码令牌

```http
POST /merchant/pad-game/prize/upload
```

奖品上传请求增加必填字段 `extra`，其余既有请求字段保持不变。

游戏结束后自动上传结果；上传成功后才显示完成弹窗，奖励展示依据上传响应。完成弹窗的 “Scan to claim” 按钮只进入二维码结果页，不重复上传。

上传失败时不生成本地兜底结果，也不重试同一局请求。前端弹出错误提示并返回游戏选择页，用户需要重新开始一局。

### 请求

```ts
{
  gameType: 1 | 2; // 1=Diamond Rain, 2=Bingo
  score: number;   // 客户端最终游戏分数，整数且不小于 0
  extra: 0 | 1;    // 是否捡到彩钻
  storeId: string;
}
```

- Diamond Rain 捡到彩钻时 `extra=1`，否则为 `0`；`SCORE` 和 `CONSUMER_POINT` 两种彩钻类型使用同一规则。
- Bingo 固定传 `extra=0`。
- `storeId` 必须使用开局时固定在本局上下文中的门店 ID，不能在上传时重新读取并混用其他门店。
- `coloredRewardType=CONSUMER_POINT` 时，后端通过 `extra` 判断玩家是否获得彩钻消费积分。

### 响应

| 字段 | 语义 |
| --- | --- |
| `prizeRecordId` | 奖品记录 ID。 |
| `claimToken` | 仅返回一次的二维码令牌。 |
| `expireTime` | 二维码令牌过期时间。 |
| `baseAmount` | 基础奖励数量。 |
| `coloredPointAmount` | 彩钻直接奖励的消费积分。 |
| `jackpotAmount` | 大奖奖励数量。 |
| `jackpot` | 是否命中大奖。 |
| `rewardType` | 基础奖励类型：`CONSUMER_POINT` 或 `COUPON`。 |
| `couponId` | 优惠券 ID。 |
| `couponName` | 优惠券名称。 |
| `gameScore` | 后端确认的最终游戏分数。 |
| `configId` | 本次结算使用的游戏配置 ID。 |
| `configName` | 本次结算使用的游戏配置名称。 |

成功响应中的字段可能为空、`null` 或 `0`；前端只校验当前奖励类型与展示流程需要的字段，忽略不适用字段。必需字段缺失、类型与 OpenAPI 不符或值不满足以下规则时，均按响应错误处理：

- `claimToken` 必须是去除首尾空格后非空的字符串。
- `rewardType` 只接受 `COUPON` 或 `CONSUMER_POINT`；其他值均为响应错误。
- `rewardType=COUPON` 时 `couponName` 必须是去除首尾空格后非空的字符串，不要求 `gameScore`。
- `rewardType=CONSUMER_POINT` 时 `gameScore` 必须是大于或等于 `0` 的整数，`baseAmount` 必须是非 `null` 的有限数字，不要求 `couponName`。
- `baseAmount`、`coloredPointAmount` 和 `jackpotAmount` 兼容 JSON 数字与非空的有限数值字符串；解析后统一按数字计算。
- `coloredPointAmount` 或 `jackpotAmount` 为 `null` 时按 `0` 计算；`baseAmount` 为 `null` 时仍视为响应错误。
- 响应错误与上传失败使用同一处理：弹出错误提示并返回游戏选择页，不重复提交本局结果。

### 奖励展示

- 奖励展示仅依据奖品上传响应，前端不根据配置接口自行计算奖励。
- `rewardType=COUPON` 时，完成弹窗和二维码结果页只显示 `couponName`，忽略其他奖励金额字段。
- `rewardType=CONSUMER_POINT` 时显示 `gameScore`；奖励结果为 `baseAmount + coloredPointAmount + jackpotAmount`，只显示合计结果，不拆分展示三项来源。
- `jackpot` 本次不参与独立前端展示；`jackpotAmount` 仅作为消费积分合计的一部分。
- `prizeRecordId`、`couponId`、`configId`、`configName` 和 `expireTime` 本次不参与前端逻辑。
- 二维码继续沿用当前行为，直接使用原始 `claimToken` 作为二维码内容，并使用配置快照中的 `qrReturnSeconds` 控制自动返回。
