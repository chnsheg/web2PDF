# 📚 AI WebBook Generator (智能网页转 PDF 助手)

**AI WebBook Generator** 是一款基于大语言模型（LLM）和无头浏览器（Puppeteer）的全栈应用。它能够将碎片化的在线文档、内容网页智能地解析、清洗、重组，并生成排版精美、可供离线阅读的最佳实践级 PDF 文档。

无论是零散的博客专栏、传统的文档框架（如 Docsify, VuePress），还是现代的静态站点，本作都能利用 AI 的强大理解能力提取准确的阅读顺序与核心内容。

---

## ✨ 核心特性 / Features

- 🤖 **智能目录推理 (AI TOC Extraction)**
  - 突破传统爬虫的规则限制。应用会自动解析目标网页的导航链接，通过大模型推理出文档的真实层级结构和阅读顺序（完美支持包含 `#` 及 SPA 路由架构）。
- 🧹 **AI 语义级降噪 (Smart AI Denoising)**
  - 网页太杂乱？AI 会像人类阅读一样去评估页面结构，智能提取导航栏、侧边栏、评论区、页脚等干扰性 HTML 元素，并在渲染和拼接合并前将其无损剥离。
- 🎨 **自适应外观学习 (AI Style Learning)**
  - 想要保留原汁原味的排版？AI 能够对目标页面的样式与布局（如代码高亮、区块引用、主体排版配置）进行提炼与学习，将其优雅地复刻到最终生成的文档中。
- 🔌 **模型强扩展能力 (Model Agnostic)**
  - 默认免配集成高优性价比的 **Google Gemini** 模型。
  - 界面预留高级配置项，原生支持通过修改 `Base URL` 和 `API Key` 对接任意 **OpenAI 兼容协议**（如 DeepSeek, GPT-4, Kimi, Claude 代理等）的第三方大模型。
- 🖨️ **出版级沉浸排版 (Print-Ready Layout)**
  - 剔除了动态元素的纯静态聚合页面。
  - 内置基于 Tailwind CSS 和 Noto Serif/Sans 字体方案的精美中文阅读规范。
  - 带有点击直达目录（自动生成锚点跨页跳转），直接使用系统打印器 `生成 PDF` 即可获得极佳视觉体验。

---

## 🏗️ 架构与技术栈 / Tech Stack

本项目采用全栈集成单体（Monorepo-like）架构设计，无缝对接前后端，保证本地部署零成本。

- **前端 (Frontend)**: React 18, Vite, Tailwind CSS, Lucide Icons
- **后端 (Backend)**: Node.js, Express, Puppeteer (动态页面加载与计算), JSDOM (高性能 DOM 树遍历与操作)
- **AI 引擎 (AI Frameworks)**: `@google/genai` (Google 最新架构的智能 SDK), `openai`
- **工程化构建**: TypeScript, ESBuild, concurrent development workflow

---

## 🚀 快速启动 / Quick Start

### 1. 环境准备
请确保您的设备已安装了 [Node.js](https://nodejs.org/en/) (推荐 v18+ 版本)。由于包含了 Puppeteer 等无头环境，初次安装可能需拉取 Chromium。

### 2. 克隆与安装依赖
```bash
# 在终端中执行
git clone <your-repository-url> webbook-generator
cd webbook-generator
npm install
```

### 3. 配置环境变量
确保根目录中配置了所需的后台秘钥。
可以直接复制一份 `.env.example` 到 `.env`（如果您需要调整默认端口或私密配置）。

### 4. 启动服务 
```bash
npm run dev
```
此命令将在本地（默认端口 `3000`）同步启动后端爬虫计算节点和前端 React 界面。

---

## 💡 核心使用指南 / Usage

1. **输入您的目标入口**: 
   在主界面顶端输入框中，粘贴你希望提取和转换的来源网站首页 URL，例如：`https://datawhalechina.github.io/hello-agents/`。
2. **开启/关闭 AI 策略**:
   - `AI 降噪`: 让 AI 干预决定哪些区域属于多余广告和侧边菜单，并将其从文章流中隐藏（推荐开启）。
   - `AI 学习样式`: 是否让 AI 去目标站偷师学艺，保留原生 CSS 风格（根据目标站风格决定）。
3. **第三方自定义大模型配置 (可选)**: 
   点击右上角的"配置"按钮展开面板，可以轻松切换自定义的基于 OpenAI standard format 的 API 链接、Key及自定义模型号。
4. **生成长卷与保存**: 
   点击“开始生成”，系统会经历链接分析、目录生成、子页面爬取和合成渲染四个自动化阶段。进度100%后会展示干净清晰的长文界面。此时使用浏览器的快捷键 `Ctrl+P` (Windows/Linux) 或 `Cmd+P` (Mac) 直接进入打印模式，**选择“另存为 PDF”** 即可。

---

## 🚧 常见问题与排错 / FAQ

- **Q: 为什么渲染出的页面会提示 "网络或服务错误..."?**
  A: 这可能是目标网站具备较强反爬机制，或者大模型在 JSON 解析截断、服务商临时熔断时返回了异常文字格式。系统已对这些情形做了容灾重试处理。如仍有频繁失败可以尝试开启浏览器的全局代理后再在本地运行 Node.
- **Q: 生成的 PDF 页面跳转或者大纲失效了该怎么办？**
  A: 新版本已通过强制插入锚点 (`<div id="chapter-xxx">`) 与原生 `<a href="#chapter-xxx">` 相结合，保证生成的汇编长文在任何 PDF 阅读器里都可以点击跨页。请勿随意调整编译过程中的 `#chapter的规则`。

---

## 📜 开源协议 / License

本项目采用 [MIT License](LICENSE) 开源。允许任意商用和二次修改转发。
期待你在 GitHub 给该仓库点一个 🌟 Star！