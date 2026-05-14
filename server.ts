import express from "express";
import path from "path";
import cors from "cors";
import puppeteer, { Browser } from "puppeteer";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";

dotenv.config();

const startServer = async () => {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
    });
  } catch (e) {
    console.error("Failed to launch puppeteer", e);
  }

  let defaultAi: GoogleGenAI | null = null;
  const getAi = () => {
    if (!defaultAi) {
      if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set.");
      }
      defaultAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    }
    return defaultAi;
  };

  async function generateJson(prompt: string, aiConfig: { apiKey?: string, baseUrl?: string, isDenoise?: boolean, isStyle?: boolean, customModel?: string }) {
    if (aiConfig.apiKey && aiConfig.baseUrl) {
      const openai = new OpenAI({ apiKey: aiConfig.apiKey, baseURL: aiConfig.baseUrl.replace(/\/+$/, '') });
      try {
        const response = await openai.chat.completions.create({
          model: aiConfig.customModel || "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
        });
        let content = response.choices[0].message.content || "{}";
        
        // Clean up markdown code blocks if present
        if (content.includes("\`\`\`json")) {
          content = content.split("\`\`\`json")[1].split("\`\`\`")[0];
        } else if (content.includes("\`\`\`")) {
          const parts = content.split("\`\`\`");
          if (parts.length >= 3) {
             content = parts[1];
             if (content.startsWith("json\n")) content = content.substring(5);
          }
        }
        
        content = content.trim();
        
        // If not starting with { or [, attempt substring extraction
        if (!content.startsWith("{") && !content.startsWith("[")) {
            const firstBrace = content.indexOf("{");
            const firstBracket = content.indexOf("[");
            const start = Math.min(firstBrace === -1 ? Infinity : firstBrace, firstBracket === -1 ? Infinity : firstBracket);
            
            const lastBrace = content.lastIndexOf("}");
            const lastBracket = content.lastIndexOf("]");
            const end = Math.max(lastBrace, lastBracket);
            
            if (start !== Infinity && end !== -1 && start < end) {
                content = content.substring(start, end + 1);
            }
        }
        return content;
      } catch (err: any) {
        throw new Error(`第三方大模型服务端返回错误: ${err.message}`);
      }
    } else {
      // Gemini
      let schema: any;
      
      if (aiConfig.isStyle) {
        schema = {
          type: Type.OBJECT,
          properties: { css: { type: Type.STRING } },
          required: ["css"],
        };
      } else if (aiConfig.isDenoise) {
        schema = {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        };
      } else {
        schema = {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
            },
            required: ["title", "url"],
          },
        };
      }

      const response = await getAi().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });
      return response.text || "[]";
    }
  }

  app.post("/api/test-connection", async (req, res) => {
    const { customApiKey, customBaseUrl, customModel } = req.body;
    if (!customApiKey || !customBaseUrl) {
      return res.status(400).json({ error: "API Key and Base URL are required for testing." });
    }
    
    try {
      const openai = new OpenAI({ apiKey: customApiKey, baseURL: customBaseUrl.replace(/\/+$/, '') });
      const response = await openai.chat.completions.create({
        model: customModel || "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Say hello in JSON format like {\"message\": \"hello\"}" }],
        temperature: 0.1,
      });
      res.json({ success: true, text: response.choices[0].message.content });
    } catch (err: any) {
      console.error("Test connection failed:", err);
      res.status(500).json({ error: `大模型 API 连接失败: ${err.message}` });
    }
  });

  app.post("/api/extract", async (req, res) => {
    const { url, aiDenoise, styleLearning, customApiKey, customBaseUrl, customModel } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    if (!browser) {
      return res.status(500).json({ error: "Browser not initialized" });
    }

    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      try {
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 });
      } catch (e) {
      }
      
      // Additional wait for SPAs (like docsify) that might build DOM after network idle
      await new Promise(r => setTimeout(r, 1500));
      
      const links = await page.evaluate(() => {
        // Look specifically for sidebar elements first, if they exist
        const sidebarLinks = Array.from(document.querySelectorAll(".sidebar a, .navbar a, .nav-wrapper a, .menu a, .VPSidebar a, aside a"));
        const anchors = sidebarLinks.length > 5 ? sidebarLinks : Array.from(document.querySelectorAll("a"));
        return anchors.map(a => {
          let href = (a as HTMLAnchorElement).href;
          return {
            href: href,
            text: (a as HTMLElement).innerText.trim(),
          };
        }).filter(a => a.href && a.text && a.href.startsWith("http"));
      });

      const openaiCompatible = !!(customApiKey && customBaseUrl);
      const outputFormatRule = openaiCompatible 
          ? "Return ONLY a JSON object with a 'data' property containing the array of chapters. e.g. {\"data\": [{\"title\":\"...\", \"url\":\"...\"}]}" 
          : "Return ONLY a JSON array, representing the chapters.";
      
      const prompt = `This is an ordered list of navigation links extracted from a tutorial website: ${url}. 
Your task is to identify the legitimate table of contents (TOC) chapters.
1. DO NOT filter out the homepage, 'Home', 'README', introductory links, or root links (e.g., links ending in "#/"). YOU MUST INCLUDE the starting point of the tutorial.
2. Filter out unrelated utility links ("Edit on GitHub", "Login", "Language", external outbound links).
3. Preserve the hierarchical reading order present in the site's sidebar.
${outputFormatRule}
Data:\n${JSON.stringify(links.slice(0, 150))}`;

      let toc: { title: string; url: string }[] = [];
      try {
        let contentStr = await generateJson(prompt, { apiKey: customApiKey, baseUrl: customBaseUrl, customModel });
        let parsed = JSON.parse(contentStr);
        if (openaiCompatible && parsed.data && Array.isArray(parsed.data)) {
            toc = parsed.data;
        } else {
            toc = Array.isArray(parsed) ? parsed : [];
        }
      } catch (err: any) {
        if (err.message && err.message.includes("API key not valid")) {
          return res.status(400).json({ error: "API Key 无效。请检查设置中的自定义 API Key，或平台默认 GEMINI_API_KEY。" });
        }
        throw err;
      }

      // Deduplicate by URL
      const seen = new Set();
      toc = toc.filter(chapter => {
        if (seen.has(chapter.url)) return false;
        seen.add(chapter.url);
        return true;
      });

      if (toc.length === 0) {
        toc = [{ title: "Tutorial / Document", url }];
      }

      toc = toc.slice(0, 20);

      let noiseSelectors: string[] = [];
      if (aiDenoise && toc.length > 0) {
        try {
            await page.goto(toc[0].url, { waitUntil: "networkidle2", timeout: 20000 });
            await new Promise(r => setTimeout(r, 1000));
            const sampleHtml = await page.evaluate(() => document.body.innerHTML.substring(0, 50000));
            const denoiseFormatRule = openaiCompatible 
                ? "Return ONLY a JSON object with a 'data' array of string CSS selectors. e.g. {\"data\": [\".footer\", \"#comments\"]}"
                : "Return ONLY a JSON array of string CSS selectors.";
                
            const denoisePrompt = `Analyze this HTML layout and identify CSS selectors for irrelevant elements like navigation bars, sidebars, footers, comment sections, social sharing buttons, and recommendations. 
Focus on classes and IDs that are clearly noise. Do NOT include the main article content container.
${denoiseFormatRule}
HTML:\n${sampleHtml}`;

            let denoiseStr = await generateJson(denoisePrompt, { apiKey: customApiKey, baseUrl: customBaseUrl, isDenoise: true, customModel });
            let parsedDenoise = JSON.parse(denoiseStr);
            if (openaiCompatible && parsedDenoise.data && Array.isArray(parsedDenoise.data)) {
                noiseSelectors = parsedDenoise.data;
            } else {
                noiseSelectors = Array.isArray(parsedDenoise) ? parsedDenoise : [];
            }
            console.log("Noise selectors identified:", noiseSelectors);
        } catch (e: any) {
            console.error("AI Denoise failed:", e);
        }
      }

      const chaptersData: { title: string; content: string }[] = [];

      let learnedCss = '';
      if (styleLearning && toc.length > 0) {
        try {
            await page.goto(toc[0].url, { waitUntil: "networkidle2", timeout: 20000 });
            await new Promise(r => setTimeout(r, 1000));
            
            // Extract all stylesheets first as a fallback, and to help AI if needed, but it's too big.
            const sampleHtml = await page.evaluate(() => {
                const article = document.querySelector('article') || document.querySelector('main') || document.querySelector('.vp-doc') || document.querySelector('.theme-doc-markdown') || document.body;
                return article.innerHTML.substring(0, 15000); 
            });

            const openaiCompatible = !!(customApiKey && customBaseUrl);
            const stylePromptFormat = openaiCompatible 
                ? "Return ONLY a JSON object with a 'css' string property containing the raw CSS. e.g. {\"css\": \".custom-doc-style h1 { color: #333; } ...\"}" 
                : "Return ONLY a JSON object with a 'css' string property.";

            const stylePrompt = `Act as an expert UI/UX and CSS developer. I am extracting the following documentation HTML to a PDF/Preview, but the CSS is missing.
Please analyze the HTML tags, class names, and structure in the snippet below. 
Generate a comprehensive and beautiful matching CSS stylesheet that heavily mimics typical modern documentation (like Vitepress, Docusaurus, Tailwind Typography).
The CSS should target the classes and tags found in the HTML. Root element will have class "custom-doc-style".

Rules:
1. Ensure great readability: line-height (1.7), color contrast (#333 for text, #111 for headings), and margins (margin-bottom: 1.5em).
2. Style code blocks nicely (bg: #f6f8fa, rounded corners, overflow-x auto, monospace font).
3. Style blockquotes, tables (borders, padding), lists (padding-left, list-style), and links (color: #2563eb, text-decoration).
4. Image should have max-width: 100% and rounded corners.
5. Do NOT include layout restrictions like fixed heights or hidden overflows.
6. ${stylePromptFormat}

HTML Snippet:
${sampleHtml}
`;

            let styleStr = await generateJson(stylePrompt, { apiKey: customApiKey, baseUrl: customBaseUrl, isStyle: true, customModel });
            let parsedStyle = JSON.parse(styleStr);
            learnedCss = parsedStyle.css || parsedStyle.data?.css || parsedStyle.data || '';
            console.log("AI learned CSS generated successfully");
        } catch (e: any) {
            console.error("AI Style Learning failed:", e);
        }
      }

      for (let i = 0; i < toc.length; i++) {
        const chapter = toc[i];
        try {
            await page.goto(chapter.url, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
            try {
              await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 });
            } catch (e) {
              // Ignore timeout
            }
            await new Promise(r => setTimeout(r, 1000));

            const html = await page.content();
            const doc = new JSDOM(html, { url: chapter.url }).window.document;
            
            ['src', 'href'].forEach(attr => {
                doc.querySelectorAll(`[${attr}]`).forEach(el => {
                    const val = el.getAttribute(attr);
                    if (val && !val.startsWith('http') && !val.startsWith('data:') && !val.startsWith('blob:') && !val.startsWith('#')) {
                        try {
                            el.setAttribute(attr, new URL(val, chapter.url).href);
                        } catch(e) {}
                    }
                });
            });
            
            if (aiDenoise && noiseSelectors.length > 0) {
                noiseSelectors.forEach(selector => {
                    try {
                        Array.from(doc.querySelectorAll(selector)).forEach(el => el.remove());
                    } catch (err) {}
                });
            }
            
            let finalContent = "";
            let bodyClass = "";
            if (styleLearning) {
                let mainEl = doc.querySelector('article') || 
                             doc.querySelector('main') || 
                             doc.querySelector('.vp-doc') ||
                             doc.querySelector('.content') ||
                             doc.querySelector('.theme-doc-markdown') ||
                             doc.querySelector('#content') ||
                             doc.body;
                             
                Array.from(mainEl.querySelectorAll('script, noscript, iframe')).forEach(el => el.remove());
                finalContent = mainEl.outerHTML;
                bodyClass = doc.body.className;
            } else {
                const reader = new Readability(doc);
                const article = reader.parse();
                finalContent = article?.content || "<p>文档无法解析 / Failed to parse content</p>";
            }
            
            chaptersData.push({
                title: chapter.title,
                content: finalContent,
                bodyClass: bodyClass
            });
        } catch (chapterErr) {
            console.error(`Failed to fetch chapter ${chapter.url}`, chapterErr);
        }
      }

      await page.close();
      res.json({ chapters: chaptersData, globalCss: learnedCss });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to extract" });
    }
  });

  app.post("/api/generate-pdf", async (req, res) => {
    const { html, filename, bodyClass, url } = req.body;
    if (!html) return res.status(400).json({ error: "HTML content is required" });

    if (!browser) {
      return res.status(500).json({ error: "Browser not initialized" });
    }

    try {
      const page = await browser.newPage();
      
      const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700;900&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          @page { margin: 0; }
          body { 
            font-family: 'Noto Sans SC', sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .font-serif {
            font-family: 'Noto Serif SC', serif;
          }
          .page-break-after { page-break-after: always; }
          .page-break-before { page-break-before: always; }
          .page-break-inside-avoid { page-break-inside: avoid; }
        </style>
      </head>
      <body class="${bodyClass || ''}">
        ${html}
      </body>
      </html>
      `;

      await page.setContent(fullHtml, { waitUntil: 'load', timeout: 60000 });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });

      await page.close();
      const safeFilename = filename ? String(filename).replace(/[^a-zA-Z0-9.\-_]/g, '_') : 'document.pdf';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.send(Buffer.from(pdfBuffer));
    } catch (e: any) {
      console.error(e);
      res.status(500).send("Failed to generate PDF");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
