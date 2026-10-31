# Hogwarts · 游戏化待办小镇

一个装在 iPhone 主屏幕上的像素风待办 App。七栋建筑对应七类任务，有紧急任务的建筑会发光。

网址：https://alexandralinnn-cloud.github.io/hogwarts/

## 装到 iPhone 主屏幕

1. 用 **Safari** 打开上面的网址。
2. 点底部的「分享」按钮（方框加向上箭头），选「添加到主屏幕」。
3. 以后从主屏幕的 Hogwarts 图标打开，它会全屏显示，用起来和普通 App 一样。

## 七个场景

| 建筑 | 分类 |
|---|---|
| 图书馆 | 智识成长：想知道的、需要知道的、好奇的 |
| 诊所 | 自我照顾 |
| 有用又开心（市集） | 实用又让我开心的小事 |
| 冒险者公会 | 服务他人：我能怎样让你的生活更轻松 |
| 酒馆 | 玩 |
| 农田 | 个人成长 |
| 码头 | 情绪包袱 |

## 成长规则

**执行力**
- 第一次给任务拆出子任务：+2（每个任务只算一次）
- 完成一个子任务：+3
- 完成任务：简单 +10 / 中等 +20 / 困难 +40
- 撤销完成、取消勾选或删除已完成的子任务，相应点数会扣回；删除任务不扣分。

**成长力**
- 每天第一次打开：+5
- 新增任务：+2（每天最多算 5 个）
- 每连续打开满 7 天：额外 +20

**升级**：从 n 级升到 n+1 级需要 n × 50 点，等级不会下降。
称号：1–4 级学徒 · 5–9 级工匠 · 10–14 级骑士 · 15 级以上领主。

**热力图**：当天完成了子任务显示暗金色，完成了整个任务显示亮金色。

## 主人和访客

- 在「设置」里用主人账号登录后，才能新增、完成、修改任务。
- 其他人打开网址只能看，不能操作；勾选了「仅自己可见」的任务，别人看不到。
- 连接数据库之前，网站显示的是示例任务（演示模式）。

## Plan Coach 快捷指令（只需设置一次）

1. 打开 iPhone 的「快捷指令」App，点右上角「+」新建。
2. 添加动作「打开 App」，选择 PlanCoach。
3. 把这个快捷指令命名为 `PlanCoach`（要和 App 设置里的名称一致）。

之后在任务里点「求助 → Plan Coach」，就会打开 PlanCoach，任务名称也已经复制好，粘贴即可。

---

## 技术说明（给以后维护的人）

- Preact + Vite + TypeScript，做成可安装的网页 App（PWA），通过 GitHub Actions 发布到 GitHub Pages。
- 数据存在 Firebase（Cloud Firestore）。连接信息在 `src/config.ts`，安全规则在 `firestore.rules`，需要粘贴到 Firebase 控制台。
- 任务文字会自动转成简体中文（opencc-js），并用 MyMemory 免费翻译服务生成另一种语言；翻译失败时，下次打开 App 会自动重试。
- 在本机开发：`npm install`，然后 `npm run dev`。在 localhost 上会进入「本机测试模式」，数据只存在浏览器里。

素材：小镇画面由 AI 生成 · 像素字体 [Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font)（SIL OFL 1.1，见 `public/fonts/OFL.txt`）· 像素图标 [Pixelarticons](https://github.com/halfmage/pixelarticons)（MIT）。
