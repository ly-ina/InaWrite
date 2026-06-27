/**
 * Markdown 编辑器组件
 * 支持编辑/预览切换，使用 react-markdown 渲染预览
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './MarkdownEditor.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  /** 标签名（用于显示） */
  label?: string;
}

export default function MarkdownEditor({ value, onChange, placeholder, rows = 8, label }: Props) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  return (
    <div className={styles.editor}>
      {/* 工具栏 */}
      <div className={styles.toolbar}>
        {label && <span className={styles.label}>{label}</span>}
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${mode === 'edit' ? styles.active : ''}`}
            onClick={() => setMode('edit')}
          >
            编辑
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'preview' ? styles.active : ''}`}
            onClick={() => setMode('preview')}
          >
            预览
          </button>
        </div>
        {/* 快速插入按钮 */}
        {mode === 'edit' && (
          <div className={styles.quickBtns}>
            <button className={styles.quickBtn} onClick={() => {
              const ta = document.querySelector(`[data-md-editor]`) as HTMLTextAreaElement;
              if (!ta) return;
              const start = ta.selectionStart;
              const end = ta.selectionEnd;
              const selected = value.slice(start, end);
              const newVal = value.slice(0, start) + `**${selected || '粗体'}**` + value.slice(end);
              onChange(newVal);
            }} title="粗体">B</button>
            <button className={styles.quickBtn} onClick={() => {
              const ta = document.querySelector(`[data-md-editor]`) as HTMLTextAreaElement;
              if (!ta) return;
              const start = ta.selectionStart;
              const newVal = value.slice(0, start) + '\n- 列表项\n' + value.slice(start);
              onChange(newVal);
            }} title="列表">•</button>
            <button className={styles.quickBtn} onClick={() => {
              const ta = document.querySelector(`[data-md-editor]`) as HTMLTextAreaElement;
              if (!ta) return;
              const start = ta.selectionStart;
              const newVal = value.slice(0, start) + '\n> 引用\n' + value.slice(start);
              onChange(newVal);
            }} title="引用">❝</button>
            <button className={styles.quickBtn} onClick={() => {
              const ta = document.querySelector(`[data-md-editor]`) as HTMLTextAreaElement;
              if (!ta) return;
              const start = ta.selectionStart;
              const newVal = value.slice(0, start) + '\n---\n' + value.slice(start);
              onChange(newVal);
            }} title="分割线">—</button>
          </div>
        )}
      </div>

      {/* 编辑/预览区域 */}
      <div className={styles.content}>
        {mode === 'edit' ? (
          <textarea
            data-md-editor
            className={styles.textarea}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
          />
        ) : (
          <div className={styles.preview}>
            {value.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            ) : (
              <span className={styles.emptyPreview}>暂无内容</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
