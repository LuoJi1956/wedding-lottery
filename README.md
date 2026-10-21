# 答谢宴抽奖系统

婚礼 / 年会 / 答谢宴现场用的抽奖系统，三端一体：

| 端 | 地址 | 用途 |
| --- | --- | --- |
| 来宾端 | `/join?e=evt_thanksbanquet` | 手机扫码填姓名（手机号选填），生成抽奖券 |
| 后台 | `/admin` | 活动配置、奖项设置、参与名单、中奖名单、参与二维码 |
| 大屏 | `/screen` | 1920×1080 投影，开始/停止开奖动画并逐个揭晓中奖者 |

技术栈：Next.js 14 App Router + TypeScript、Tailwind + shadcn 风格组件、Prisma 6 + SQLite（可切 Postgres）、zod 4、`qrcode`。
抽奖随机与去重全部在服务端完成，前端只负责滚动姓名的视觉动画。

---

## 1. 本地运行

环境要求：Node.js 18.17+（建议 20 LTS），Windows / macOS / Linux 均可。

```bash
npm install              # postinstall 会自动 prisma generate
cp .env.example .env     # 然后改 ADMIN_PASSWORD
npm run db:push          # 建表
npm run db:seed          # 写入演示数据（1 个活动、3 个奖项、30 位来宾、5 条中奖记录）
npm run dev              # http://localhost:3000
```

后台登录口令读环境变量 `ADMIN_PASSWORD`，演示库里的口令是 `wedding`（见 `.env`）。

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | 默认 `file:./dev.db`，这是**相对 `prisma/` 目录**的路径；云端部署换成 Postgres 连接串，见方案 B |
| `ADMIN_PASSWORD` | 后台访问口令，至少 4 位。未配置时所有后台写接口一律拒绝 |

### 数据库命令

```bash
npm run db:push          # 按 schema 同步表结构（SQLite）
npm run db:seed          # 重灌演示数据（先清空该活动，结果可预期）
npm run db:reset         # 删库重建 + seed，想回到初始状态就用它（只适用 SQLite）
npm run db:studio        # Prisma Studio 可视化查表
```

云端 Postgres 的切换命令见 [4. 部署 · 方案 B](#方案-b部署到-netlify--supabase免费额度够小范围演示)。

`.env` 和 `prisma/dev.db` 已在 `.gitignore` 中，不会提交。

---

## 2. 现场操作手册

### ① 后台配置（投屏那台电脑）

`http://localhost:3000/admin` → 输入口令登录。现场要用局域网 IP 给来宾访问时，**这台电脑也请用 IP 地址登录一次**（Cookie 按 host 分开存，见下一节）。

- **活动配置**：活动名称、副标题、状态（草稿 / 进行中 / 已结束）、起止时间、参与人数上限、是否允许重复中奖、大屏背景图（可点「上传图片」直接选本地图片，也可填外链地址）。
  人数上限不能改到已参与人数以下，结束时间必须晚于开始时间，改错会被服务端拦住并提示中文原因。
- **奖项设置**：奖项名称、总名额、单次抽奖人数、顺序、图标（同样支持直接上传）。重名、单次人数大于总名额、名额小于已抽人数都会被拒绝。
- **参与名单**：搜索、手动添加、删除、导出 CSV。手机号在大屏上打码，导出的 CSV 里是完整号码，方便私下核对。
- **中奖名单**：按奖项分组，可撤销（撤销后名额回到奖池，大屏 3 秒内跟上）与导出 CSV。
- 后台表单支持回车提交（活动配置、奖项、手动添加来宾），来宾手机端表单也一样。
- **参与二维码**：确认地址后选 1024px 下载 PNG 打印。

### ② 来宾扫码

台卡、签到台、入口各放一张二维码。来宾微信扫码 → 填姓名 → 出现抽奖券卡片（`NO.0001` 这样的顺序号）。
刷新页面、关掉再进来都会还原成同一张票。

去重规则（服务端复核，不依赖前端）：

- 同一台手机（浏览器设备指纹）只能参与一次；
- 同一手机号在本次活动中只能参与一次；
- 编号由活动级计数器发放，**删除来宾后编号不会被后面的人复用**。

### ③ 大屏开奖

同一台电脑打开 `http://localhost:3000/screen`，浏览器全屏（F11），HDMI 接投影。

1. 底部选择奖项，看「剩余 N 名 · 本轮 M 名」；
2. 点**开始抽奖**，中部姓名快速滚动；
3. 点**停止**，服务端抽出本轮中奖者并逐个揭晓；
4. 点**继续下一轮**抽同一奖项的下一批；名额抽完后这个按钮会变成**该奖项已抽完**，点它回到待抽奖画面（已揭晓名单汇总在下方）。

开奖人数规则：本轮人数 = min(单次抽奖人数, 该奖项剩余名额)，所以「10 个名额、每轮 5 人」会走 5 → 5，「10 个名额、每轮 4 人」会走 4 → 4 → 2，余数一次抽完。
默认**不可重复中奖**：已中过奖的来宾自动退出后续抽取，除非在活动配置里打开「允许重复中奖」。

揭晓节奏：每位中奖者间隔约 1.1 秒出场，新卡片闪一次金光后静止，不会在台上循环闪；姓名很长（最多 20 字）会自动换行，不会被切掉。字号按屏幕宽度自适应，1920×1080 投影上滚动的名字约 160px、卡片姓名约 80px。系统开了「减弱动效 / Reduce motion」的电脑会自动跳过动画。

> 背景图偏亮时，大屏有一层上深下深的渐变压暗，白字与金字仍能看清；如果现场投影仪亮度低，建议选深色系的背景图。

> 大屏那台电脑必须先在同一浏览器登录过后台，否则点「停止」会提示登录状态已失效——抽奖接口 `/api/draw` 是受保护的，防止来宾扫码后自己触发开奖。

### ④ 撤销与导出

- **中奖名单**页可按奖项查看当前有效中奖者，逐条**撤销**（二次确认）。撤销只是打时间标记、保留历史，名额立刻回到奖池；大屏最多 3 秒内自动把该卡片从已揭晓名单里移除、剩余名额加回去。
- 已有中奖记录的奖项不能删除，需先撤销；已中奖的来宾不能删除，同理。
- **参与名单**、**中奖名单**各有一个「导出 CSV」按钮，浏览器直接下载。页面列表里手机号做掩码显示（`138****1111`），导出的 CSV 里保留完整号码方便现场联系，请注意文件保管。

---

## 3. 让来宾手机能打开链接

来宾的手机访问不到 `localhost`，必须用这台电脑在局域网里的 IP：

```bash
# Windows
ipconfig            # 找“无线局域网适配器 WLAN”的 IPv4 地址，例如 192.168.1.23
# macOS
ifconfig getifaddr en0
```

先确认二维码里的地址是 `http://192.168.1.23:3000/join?e=...` 再生成——**用 IP 打开后台的 `/admin/qrcode`**，二维码始终按当前地址生成，用 `localhost` 打开就只能本机扫。

> 登录状态是按地址（host）存 Cookie 的：在 `localhost:3000` 登录过，换成 `192.168.1.23:3000` 打开后台仍是未登录。现场统一用 IP 那套地址，大屏那台电脑也要用同一个 IP 登录一次，否则点「停止」会提示登录失效。

检查清单：

1. 手机和电脑连**同一个 Wi-Fi**（酒店常有访客网络与内部网络隔离，优先用手机流量开热点给电脑连，或找酒店要同一网络）；
2. 先用手机流量验证链接可访问，再决定是否走酒店网络；
3. Windows 首次监听 3000 端口会弹防火墙授权，勾选“专用网络”允许；被拦时临时放行：`netsh advfirewall firewall add rule name="lottery" dir=in action=allow protocol=TCP localport=3000`；
4. 生产模式跑 `npm run build && npm start`，性能与稳定性优于 `npm run dev`；换端口用 `set PORT=8080 && npm run build && npm start`（PowerShell 写 `$env:PORT=8080`）。

### 二维码打印建议

- 选 1024px 下载 PNG，A5 台卡最清晰；打印后务必真机扫一次确认能打开。
- 微信「扫一扫」直接识别，无需安装应用；识别后在微信内置浏览器打开，属正常 H5。
- 签到台、入口各放一张，再按桌数补几张；主持人口播一次网址作为兜底。

---

## 4. 部署

### 方案 A：现场用笔记本 / 台式机运行（推荐）

本项目的默认数据库是本地 SQLite 文件，**最稳的用法就是把服务跑在现场那台电脑上**：来宾扫码和大屏开奖都只走局域网，不依赖酒店宽带，断网也能继续开奖。

```bash
npm ci
cp .env.example .env      # 改成正式的 ADMIN_PASSWORD
npm run db:push
npm run db:seed           # 不需要演示数据就跳过，改成自己在后台录入名单
npm run build
npm start
```

活动前一天做一次完整彩排：手机连现场 Wi-Fi 扫码报名 → 后台看得到 → 大屏能开奖 → 撤销后大屏跟随。

### 方案 B：部署到 Netlify + Supabase（免费额度够小范围演示）

云端文件系统只读且临时，`file:./dev.db` 的写入会在冷启动后丢失，所以公网部署必须把数据库换成 Postgres。
本项目同时保留两套 Prisma schema，切来切去不用改代码：

| 文件 | provider | 用途 |
| --- | --- | --- |
| `prisma/schema.prisma` | sqlite | 默认，本地与方案 A 现场模式 |
| `prisma/schema.postgres.prisma` | postgresql | 云端部署，`engineType = "library"` + `rhel-openssl-3.0.x` 目标 |

客户端只会是其中一个版本，用脚本切换：

```bash
npm run db:use:pg        # 生成 Postgres 客户端 + 按 schema 建表（云端）
npm run db:push:pg       # 只建表，不重新生成客户端
npm run db:use:sqlite    # 切回 SQLite（本地/现场）
```

> 切到 Postgres 后，本地 `npm run dev` 也会连云库；回到现场模式记得再跑一次 `npm run db:use:sqlite`。
> `npm run build` 用的是**当前已生成的那套客户端**，`netlify.toml` 里的构建命令已写成 `npm run db:generate:pg && npm run build`。

#### B-1 建 Supabase 项目

1. supabase.com 新建项目，Region 选离现场/观众近的（亚太选 `Southeast Asia (Singapore)`），记下自己设的**数据库密码**。
2. Settings → Database → Connection string，两条都要拷：
   - **Direct connection**（`db.项目ref.supabase.co:5432`）：本地建表用，DDL 最稳；
   - **Session pooler**（端口 5432）：没有 Direct 权限时的建表备用串；
   - **Transaction pooler**（端口 6543）：线上运行时用，结尾补 `?pgbouncer=true&connection_limit=1`。
3. 本地临时把 `.env` 的 `DATABASE_URL` 换成 Direct（或 Session）那条，然后：

   ```bash
   npm run db:use:pg      # 建表
   npm run db:seed        # 可选：灌演示数据，注意它连的是 .env 里当前指向的库
   ```

   建完把 `.env` 改回 `file:./dev.db`（现场模式）或 Transaction 那条，并跑 `npm run db:use:sqlite` 把客户端切回来。

#### B-2 连 Netlify

1. 代码推到 GitHub 仓库，Netlify → *Add new site* → *Import an existing project* → 选该仓库。
2. 构建配置全部读 `netlify.toml`（Build command `npm run db:generate:pg && npm run build`，Publish directory 由 Next.js 运行时插件处理），一般不需要手填。
   第一次构建若提示找不到 Next.js 运行时，在 *Site configuration → Build & deploy → Continuous deployment → Build options → Optimizations* 里把 Framework 切成 **Next.js**，或 `npm i -D @netlify/plugin-nextjs` 并在 `netlify.toml` 里加 `[[plugins]] package = "@netlify/plugin-nextjs"`。
3. *Site configuration → Environment variables* 添加两项（**Internal** 类型即可）：
   - `DATABASE_URL` = Pooler 连接串（带 `pgbouncer=true&connection_limit=1`）
   - `ADMIN_PASSWORD` = 后台口令
   这两项是构建时就需要的，改完记得 *Trigger deploy* 重新构建。
4. 部署完成后打开 `https://你的站点.netlify.app/admin/qrcode`，**用正式域名重新下载二维码**，之前的局域网二维码全部作废。
   Supabase 的表里如果已经有 seed 数据，扫码报名就直接写进云库，多台设备共享同一份名单。

#### B-3 云端部署的已知限制

- **图片上传不可用**：只读文件系统，`/api/admin/upload` 会返回中文提示「当前部署环境的磁盘只读…」，请在活动背景图、奖项图标里填 `http(s)` 外链（图床、网盘直链都行）。
- **Supabase 免费项目会休眠**：约 7 天无活动就自动暂停，需去控制台手动 *Restore project*。活动前一天务必确认库是 `Active`，否则来宾扫码全报错。
- **`netlify.app` / `supabase.co` 在国内访问不稳定**：这是公网演示最大的风险。正式活动前用**现场那台电脑 + 观众同款手机网络**（4G/5G 与酒店 Wi-Fi 各测一次）真机跑一遍报名 → 开奖。不稳就走方案 A。
- **Netlify 的密钥检测会让构建失败**：Smart detection 会扫仓库与构建产物，一旦认为某处像密钥就直接 `Building → Failed`（deploy 列表上会有 *Exposed secrets detected*，日志几乎为空）。本项目因此**不在 `.env.example` 里写「协议头 + 用户:密码@主机」形态的完整连接串**，只写结构说明。误报可在 *Project configuration → Environment variables* 加 `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES=<被误报的字符串>` 白名单，或按文档用 `SECRETS_SCAN_OMIT_PATHS` / `SECRETS_SCAN_OMIT_KEYS`，不建议整体关掉（`SECRETS_SCAN_SMART_DETECTION_ENABLED=false`）。
- 口令是明文环境变量，公网站点等于把后台暴露在公网上；演示期不要用真实宾客名单，演示完在 Netlify 里删站点或直接改 `ADMIN_PASSWORD`。
- Cookie 的 `Secure` 标记按**这次请求是不是 https** 判断（看 `x-forwarded-proto`，其次 origin/referer 与请求协议），不是按 `NODE_ENV`：Netlify/Vercel 走 https 会自动带上；现场 `http://IP:3000` 不加，否则浏览器会丢掉登录 Cookie、后台永远进不去。
- 时间显示与录入固定按 `Asia/Shanghai` 换算（`src/lib/time.ts`），云端函数跑在 UTC 也不会差 8 小时；`netlify.toml` 里额外设了 `TZ` 只是兜底。

### 方案 C：自己的服务器 / 内网主机

与方案 A 相同的命令，只是把 `npm start` 放在 `pm2` / `systemd` 里常驻，前面用 nginx 反代 80/443：

```bash
npm ci && npm run build && PORT=3000 npm start
```

需要持久化的只有 `prisma/dev.db` 一个文件，定时拷贝它即可备份整场活动数据。

---

## 5. 结构速览

```
prisma/schema.prisma        Event / Prize / Participant / Winner 四张表（SQLite，默认）
prisma/schema.postgres.prisma  同一套字段的 Postgres 版，云端部署用，改表时两份都要改
prisma/seed.ts              演示数据
netlify.toml                云端构建命令与运行时环境变量
src/app/                    page 路由：/ 、/join、/admin(+/login)、/screen
src/app/api/                snapshot、join、draw、admin/{login,logout,event,prizes,participants,winners}
src/lib/validation.ts       zod 统一校验与中文错误文案（所有接口共用）
src/lib/time.ts             固定按 Asia/Shanghai 格式化/换算时间，服务器时区无关
src/lib/server/             prisma 单例、后台鉴权、响应封装、票号发号、序列化
src/lib/lottery.ts          部分 Fisher-Yates 抽取，随机源由调用方注入（便于测试）
src/lib/derive.ts           剩余名额、本轮人数、已中奖集合等纯选择器
src/lib/mock/               已删除，全站走服务端数据
```

接口统一返回 `{ ok: true, data }` 或 `{ ok: false, error }`，配合 400 / 401 / 404 / 409 / 500 状态码。

---

## 6. 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| 大屏点「停止」提示登录状态已失效 | 抽奖接口需要后台登录。在大屏那台电脑的**同一个浏览器**里重新登录 `/admin`，再回到 `/screen` |
| 口令输对了一直跳回登录页 | ①浏览器里的地址和你登录时用的地址不是同一个 host（`localhost` 与 `192.168.1.23` 的 Cookie 互不相通）；②服务跑在 https 反向代理后面但没传 `x-forwarded-proto: https` |
| 手机扫码打不开链接 | 手机与电脑不在同一 Wi-Fi，或 Windows 防火墙拦了 3000 端口，见上一节检查清单 |
| 大屏提示「所有来宾都已中奖，无法继续抽取」 | 默认不可重复中奖且奖池已抽干。要么在后台加大名额，要么打开「允许重复中奖」 |
| 某奖项按钮显示「剩 0 名」且开始按钮灰色 | 名额已抽完。若其中有误抽，去中奖名单撤销，名额会回到奖池（最多 3 秒反映到大屏） |
| 撤销后大屏没立刻变 | 大屏每 3 秒拉一次 `/api/snapshot`，等一个轮询周期即可；已揭晓名单会自动去掉被撤销的那位 |
| 云端接口报 `P2021: table ... does not exist` | 还没对云库建表。本地把 `DATABASE_URL` 指向 Supabase 的 Direct 连接串，跑 `npm run db:use:pg` |
| 线上上传图片返回「磁盘只读」 | 正常降级。Serverless 磁盘不可写，改填 http(s) 图片外链 |
| 本地 `npm run dev` 突然连不上库 / 报 SSL 连接错误 | 之前跑过 `npm run db:use:pg`，客户端是 Postgres 版。`npm run db:use:sqlite` 切回来再重启 |
| 忘记后台口令 | 口令只存在 `.env` 的 `ADMIN_PASSWORD` 里、不落库，直接改这一行后重启服务即可；线上到 Netlify 站点的环境变量里改并重新部署 |
| Netlify 构建失败且日志几乎为空、deploy 上有 *Exposed secrets detected* | 密钥检测（smart detection）拦下了这次构建。按 deploy log 指出的位置把疑似密钥的字符串改掉或加白名单，再 *Retry deploy*，见方案 B-3 |
| 想回到演示初始状态 | `npm run db:reset`（会清掉真实报名数据，活动当天慎用） |
| 换一台电脑继续用 | 整场活动数据都只在 `prisma/dev.db` 一个文件里，拷贝它即可迁移 |

---

## 7. 已知限制

- **微信身份**：普通 H5 扫码拿不到微信 openid（需要认证服务号网页授权），当前用浏览器设备指纹 + 手机号防重。日后接入服务号，只需替换 `src/lib/ticket.ts` 里的 `readDeviceId()` 返回 openid，其余逻辑不变。
- **实时性**：大屏与后台的同步靠 3 秒轮询，够用但没有秒级推送；换 Supabase Realtime 或 WebSocket 需要额外的服务端能力。
- **单活动**：系统只服务一场活动（`evt_thanksbanquet`），没有多租户、活动列表与账号体系，这是刻意的取舍。
- **背景图与奖项图标**支持在后台直接上传（PNG/JPG/WebP/GIF，单张 3MB 以内），文件写到服务的 `public/uploads/`，只走本地磁盘：Netlify / Vercel 等 Serverless 环境磁盘只读，上传接口会明确返回「当前部署环境的磁盘只读，请改填 http(s) 开头的图片外链」；也没有接对象存储做 CDN。
- 中奖只做后台标注等级与时间，不做现场核销流程。
