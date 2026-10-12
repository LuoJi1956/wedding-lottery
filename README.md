# 答谢宴抽奖系统

婚礼 / 年会 / 答谢宴现场用的抽奖系统，三端一体：

| 端 | 地址 | 用途 |
| --- | --- | --- |
| 来宾端 | `/join?e=evt_thanksbanquet` | 手机扫码填姓名（手机号选填），生成抽奖券 |
| 后台 | `/admin` | 活动配置、奖项设置、参与名单、中奖名单、参与二维码 |
| 大屏 | `/screen` | 1920×1080 投影，开始/停止开奖动画并逐个揭晓中奖者 |

技术栈：Next.js 14 App Router + TypeScript、Tailwind + shadcn 风格组件、Prisma 6 + SQLite、zod 4、`qrcode`。
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
| `DATABASE_URL` | SQLite 路径，`file:./dev.db` 是**相对 `prisma/` 目录**的路径 |
| `ADMIN_PASSWORD` | 后台访问口令，至少 4 位。未配置时所有后台写接口一律拒绝 |

### 数据库命令

```bash
npm run db:push          # 按 schema 同步表结构
npm run db:seed          # 重灌演示数据（先清空该活动，结果可预期）
npm run db:reset         # 删库重建 + seed，想回到初始状态就用它
npm run db:studio        # Prisma Studio 可视化查表
```

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
ipconfig getifaddr en0
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

### 方案 B：部署到 Vercel（需要先把数据库换成 Postgres）

Vercel 的 Serverless 运行时文件系统只读且临时，`file:./dev.db` 上的写入**会在下次请求/冷启动时丢失**，所以本地 SQLite 不能直接上线。要公网部署请改成任意 Postgres（Vercel Postgres / Neon / Supabase 都行）：

1. 改 `prisma/schema.prisma` 里 `datasource db` 块的 `provider`（当前是 `"sqlite"`）：

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

   业务代码不需要改动，`.env.example` 里也留了这条说明。

2. 把 `DATABASE_URL` 换成云库连接串（形如 `postgresql://user:pass@host/db?ssl-mode=required`），本地 `.env` 与 Vercel 环境变量都要配。

3. 建表并灌数据（本地执行，指向云库）：

   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. Vercel 项目设置：
   - Framework Preset：Next.js；Build Command `npm run build`；Output Directory `.next`；Install Command `npm ci`。
   - Environment Variables 添加 `DATABASE_URL`、`ADMIN_PASSWORD`（生产环境务必用强口令）。
   - `postinstall: prisma generate` 已在 `package.json` 里，部署时会自动生成客户端；`next.config.mjs` 已把 `@prisma/client` 配为外部包（Next 14 写法：`experimental.serverComponentsExternalPackages`）。

5. 部署完成后到 `/admin/qrcode` 用**正式域名**重新下载二维码，之前的局域网二维码全部作废。

上线前注意：
- 来宾量不大（几百人）时 Serverless 完全够用，但开奖接口和名单写入都走云库，现场务必保证有稳定的公网出口。
- Cookie 的 `Secure` 标记按**这次请求是不是 https** 判断（看 `x-forwarded-proto`，其次 origin/referer 与请求协议），不是按 `NODE_ENV` 判断：Vercel 走 https 会自动带上；现场用 `http://IP:3000` 时不加，否则浏览器会直接丢掉登录 Cookie、后台永远进不去。
- 建议把活动数据备份：换云库后 `prisma studio` 或 `psql` 导出即可。

### 方案 C：自己的服务器 / 内网主机

与方案 A 相同的命令，只是把 `npm start` 放在 `pm2` / `systemd` 里常驻，前面用 nginx 反代 80/443：

```bash
npm ci && npm run build && PORT=3000 npm start
```

需要持久化的只有 `prisma/dev.db` 一个文件，定时拷贝它即可备份整场活动数据。

---

## 5. 结构速览

```
prisma/schema.prisma        Event / Prize / Participant / Winner 四张表
prisma/seed.ts              演示数据
src/app/                    page 路由：/ 、/join、/admin(+/login)、/screen
src/app/api/                snapshot、join、draw、admin/{login,logout,event,prizes,participants,winners}
src/lib/validation.ts       zod 统一校验与中文错误文案（所有接口共用）
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
| 忘记后台口令 | 口令只存在 `.env` 的 `ADMIN_PASSWORD` 里、不落库，直接改这一行后重启服务即可 |
| 想回到演示初始状态 | `npm run db:reset`（会清掉真实报名数据，活动当天慎用） |
| 换一台电脑继续用 | 整场活动数据都只在 `prisma/dev.db` 一个文件里，拷贝它即可迁移 |

---

## 7. 已知限制

- **微信身份**：普通 H5 扫码拿不到微信 openid（需要认证服务号网页授权），当前用浏览器设备指纹 + 手机号防重。日后接入服务号，只需替换 `src/lib/ticket.ts` 里的 `readDeviceId()` 返回 openid，其余逻辑不变。
- **实时性**：大屏与后台的同步靠 3 秒轮询，够用但没有秒级推送；换 Supabase Realtime 或 WebSocket 需要额外的服务端能力。
- **单活动**：系统只服务一场活动（`evt_thanksbanquet`），没有多租户、活动列表与账号体系，这是刻意的取舍。
- **背景图与奖项图标**支持在后台直接上传（PNG/JPG/WebP/GIF，单张 3MB 以内），文件写到服务的 `public/uploads/`，只走本地磁盘：Serverless（Vercel）文件系统只读，请改填外链图片地址；也没有接对象存储做 CDN。
- 中奖只做后台标注等级与时间，不做现场核销流程。
