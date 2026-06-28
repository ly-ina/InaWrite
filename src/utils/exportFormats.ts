/**
 * 导出增强工具
 * 支持 DOCX、PDF、EPUB 格式导出
 * 所有函数返回 Blob，由调用方决定如何保存（原生环境用 nativeDownload，Web 用 saveAs）
 */

import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import type { Chapter, Character, Foreshadow, WorldSetting } from '../types';

/** 导出上下文 */
export interface ExportContext {
  projectName: string;
  chapters: Chapter[];
  characters: Character[];
  foreshadows: Foreshadow[];
  worldSettings: WorldSetting[];
}

/** 构建导出上下文 */
export function buildExportContext(
  projectName: string,
  chapters: Chapter[],
  characters: Character[],
  foreshadows: Foreshadow[],
  worldSettings: WorldSetting[]
): ExportContext {
  return { projectName, chapters, characters, foreshadows, worldSettings };
}

// ========== PDF 导出 ==========
export async function exportPDF(ctx: ExportContext): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageWidth = 210 - margin * 2;
  let y = 20;

  // 辅助函数：添加文本并自动换行
  const addText = (text: string, fontSize: number, bold: boolean = false, indent: number = 0) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, pageWidth - indent);
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line as string, margin + indent, y);
      y += fontSize * 0.42;
    }
  };

  // 标题
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(ctx.projectName, margin, y);
  y += 12;

  // 分隔线
  doc.setDrawColor(201, 169, 110);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + pageWidth, y);
  y += 8;

  // 目录
  addText('目录', 14, true);
  for (const ch of ctx.chapters.sort((a, b) => a.number - b.number)) {
    addText(`第${ch.number}章  ${ch.title}`, 11, false, 5);
  }
  y += 6;

  // 正文
  for (const ch of ctx.chapters.sort((a, b) => a.number - b.number)) {
    y += 4;
    if (y > 250) { doc.addPage(); y = 20; }
    addText(`第${ch.number}章  ${ch.title}`, 16, true);

    if (ch.content) {
      addText(ch.content, 11);
    } else if (ch.summary) {
      addText(ch.summary, 11);
    }

    if (ch.keyEvents.length > 0) {
      y += 3;
      addText('关键事件：', 10, true);
      for (const evt of ch.keyEvents) {
        addText(`• ${evt}`, 10, false, 5);
      }
    }
  }

  // 附录：角色列表
  if (ctx.characters.length > 0) {
    doc.addPage();
    y = 20;
    addText('附录：角色列表', 16, true);
    y += 6;
    for (const ch of ctx.characters) {
      addText(`${ch.name}（${ch.status === 'alive' ? '存活' : ch.status === 'dead' ? '死亡' : '未知'}）`, 12, true);
      if (ch.description) addText(ch.description.slice(0, 200), 10, false, 5);
      y += 2;
    }
  }

  // 返回 Blob 而非直接保存
  return doc.output('blob');
}

// ========== DOCX 导出 ==========
export async function exportDOCX(ctx: ExportContext): Promise<Blob> {
  const children: Paragraph[] = [];

  // 标题页
  children.push(
    new Paragraph({ text: ctx.projectName, heading: HeadingLevel.TITLE, spacing: { after: 200 } }),
    new Paragraph({ text: `导出时间：${new Date().toLocaleString('zh-CN')}`, spacing: { after: 400 } }),
  );

  const sortedChapters = [...ctx.chapters].sort((a, b) => a.number - b.number);

  // 目录
  children.push(new Paragraph({ text: '目录', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 200 } }));
  for (const ch of sortedChapters) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `第${ch.number}章  ${ch.title}`, size: 22 })],
      spacing: { after: 60 },
    }));
  }

  // 正文
  for (const ch of sortedChapters) {
    children.push(new Paragraph({ children: [], spacing: { before: 400 } }));
    children.push(new Paragraph({
      text: `第${ch.number}章  ${ch.title}`,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    }));

    if (ch.wordCount) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `${ch.wordCount.toLocaleString()} 字`, italics: true, size: 20, color: '888888' })],
        spacing: { after: 200 },
      }));
    }

    const content = ch.content || ch.summary || '';
    if (content) {
      const paragraphs = content.split('\n').filter((p) => p.trim());
      for (const p of paragraphs) {
        children.push(new Paragraph({
          text: p.trim(),
          spacing: { after: 120 },
        }));
      }
    }

    if (ch.keyEvents.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: '关键事件：', bold: true, size: 22 })],
        spacing: { before: 200, after: 80 },
      }));
      for (const evt of ch.keyEvents) {
        children.push(new Paragraph({
          text: `• ${evt}`,
          indent: { left: 400 },
          spacing: { after: 60 },
        }));
      }
    }
  }

  // 附录
  if (ctx.characters.length > 0) {
    children.push(new Paragraph({ children: [], spacing: { before: 400 } }));
    children.push(new Paragraph({ text: '附录：角色列表', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 200 } }));
    for (const ch of ctx.characters) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: ch.name, bold: true, size: 24 }),
          new TextRun({ text: `  [${ch.status}]`, size: 20, color: '888888' }),
        ],
        spacing: { after: 80 },
      }));
      if (ch.description) {
        children.push(new Paragraph({
          text: ch.description.slice(0, 300),
          indent: { left: 400 },
          spacing: { after: 120 },
        }));
      }
    }
  }

  const doc = new Document({
    title: ctx.projectName,
    sections: [{ properties: {}, children }],
  });

  return await Packer.toBlob(doc);
}

// ========== EPUB 导出（简易版，生成 XHTML） ==========
export function exportEPUB(ctx: ExportContext): Blob {
  const sortedChapters = [...ctx.chapters].sort((a, b) => a.number - b.number);

  const chaptersHTML = sortedChapters.map((ch) => {
    const content = ch.content || ch.summary || '';
    const paragraphs = content.split('\n').filter((p) => p.trim()).map((p) => `<p>${escapeHtml(p.trim())}</p>`).join('\n');
    const events = ch.keyEvents.length > 0
      ? `<div class="events"><h3>关键事件</h3><ul>${ch.keyEvents.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`
      : '';

    return `
    <section class="chapter">
      <h2>第${ch.number}章 ${escapeHtml(ch.title)}</h2>
      ${ch.wordCount ? `<p class="meta">${ch.wordCount.toLocaleString()} 字</p>` : ''}
      ${paragraphs}
      ${events}
    </section>`;
  }).join('\n');

  const tocItems = sortedChapters.map((ch) =>
    `<li><a href="#ch${ch.number}">第${ch.number}章 ${escapeHtml(ch.title)}</a></li>`
  ).join('\n');

  const html = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(ctx.projectName)}</title>
  <style>
    body { font-family: "Noto Serif SC", serif; line-height: 1.8; margin: 5%; }
    h1 { text-align: center; font-size: 2em; margin-bottom: 0.5em; }
    h2 { font-size: 1.5em; margin-top: 2em; border-bottom: 1px solid #ccc; }
    .meta { color: #888; font-size: 0.9em; }
    .events { margin-top: 1em; background: #f5f5f5; padding: 0.5em 1em; border-radius: 4px; }
    .events h3 { margin: 0 0 0.5em 0; font-size: 1em; color: #666; }
    .toc { margin: 2em 0; padding: 1em; background: #fafafa; border-radius: 4px; }
    .toc ul { list-style: none; padding-left: 1em; }
    .toc li { margin: 0.3em 0; }
    .appendix { margin-top: 3em; border-top: 2px solid #ccc; padding-top: 1em; }
  </style>
</head>
<body>
  <h1>${escapeHtml(ctx.projectName)}</h1>
  <div class="toc">
    <h2>目录</h2>
    <ul>${tocItems}</ul>
  </div>
  ${chaptersHTML}
</body>
</html>`;

  return new Blob([html], { type: 'text/html;charset=utf-8' });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
