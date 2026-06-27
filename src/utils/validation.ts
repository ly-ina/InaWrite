/**
 * 数据校验与引用完整性检查工具
 * 在删除实体时检查是否存在悬空引用
 */

import type { Character, Chapter, Foreshadow, WorldSetting } from '../types';
import { db } from '../db/database';

/** 引用检查结果 */
export interface ReferenceCheck {
  /** 是否安全删除 */
  safe: boolean;
  /** 警告列表 */
  warnings: string[];
  /** 引用详情 */
  references: {
    type: string;
    name: string;
    field: string;
  }[];
}

/**
 * 检查删除角色时的引用完整性
 * @param characterId - 要删除的角色 ID
 * @param projectId - 项目 ID
 */
export async function checkCharacterReferences(
  characterId: string,
  projectId: string
): Promise<ReferenceCheck> {
  const result: ReferenceCheck = { safe: true, warnings: [], references: [] };

  // 检查章节引用
  const chapters = await db.chapters.getByProject(projectId);
  chapters.forEach((ch) => {
    if (ch.characters.includes(characterId)) {
      result.safe = false;
      result.warnings.push(`章节「第${ch.number}章 ${ch.title}」引用了该角色作为出场角色`);
      result.references.push({ type: 'chapter', name: `第${ch.number}章 ${ch.title}`, field: '出场角色' });
    }
  });

  // 检查伏笔引用
  const foreshadows = await db.foreshadows.getByProject(projectId);
  foreshadows.forEach((f) => {
    if (f.relatedCharacters.includes(characterId)) {
      result.safe = false;
      result.warnings.push(`伏笔「${f.content.slice(0, 30)}...」关联了该角色`);
      result.references.push({ type: 'foreshadow', name: f.content.slice(0, 30), field: '相关角色' });
    }
  });

  // 检查其他角色的关系引用
  const characters = await db.characters.getByProject(projectId);
  characters.forEach((c) => {
    if (c.id === characterId) return;
    c.relations.forEach((r) => {
      if (r.targetId === characterId) {
        result.safe = false;
        result.warnings.push(`角色「${c.name}」的关系指向了该角色（${r.type}）`);
        result.references.push({ type: 'character', name: c.name, field: `关系: ${r.type}` });
      }
    });
  });

  return result;
}

/**
 * 检查删除章节时的引用完整性
 * @param chapterId - 要删除的章节 ID
 * @param projectId - 项目 ID
 */
export async function checkChapterReferences(
  chapterId: string,
  projectId: string
): Promise<ReferenceCheck> {
  const result: ReferenceCheck = { safe: true, warnings: [], references: [] };

  // 检查伏笔引用
  const foreshadows = await db.foreshadows.getByProject(projectId);
  foreshadows.forEach((f) => {
    if (f.firstAppearance === chapterId) {
      result.safe = false;
      result.warnings.push(`伏笔「${f.content.slice(0, 30)}...」将本章设为首次出现章节`);
      result.references.push({ type: 'foreshadow', name: f.content.slice(0, 30), field: '首次出现章节' });
    }
    if (f.expectedResolution === chapterId) {
      result.safe = false;
      result.warnings.push(`伏笔「${f.content.slice(0, 30)}...」将本章设为预计回收章节`);
      result.references.push({ type: 'foreshadow', name: f.content.slice(0, 30), field: '预计回收章节' });
    }
    if (f.actualResolution === chapterId) {
      result.safe = false;
      result.warnings.push(`伏笔「${f.content.slice(0, 30)}...」将本章设为实际回收章节`);
      result.references.push({ type: 'foreshadow', name: f.content.slice(0, 30), field: '实际回收章节' });
    }
  });

  // 检查角色出场章节引用
  const characters = await db.characters.getByProject(projectId);
  characters.forEach((c) => {
    if (c.appearances.includes(chapterId)) {
      result.safe = false;
      result.warnings.push(`角色「${c.name}」将本章记录为出场章节`);
      result.references.push({ type: 'character', name: c.name, field: '出场章节' });
    }
  });

  return result;
}

/**
 * 检查删除伏笔时的引用完整性
 */
export async function checkForeshadowReferences(
  foreshadowId: string,
  projectId: string
): Promise<ReferenceCheck> {
  const result: ReferenceCheck = { safe: true, warnings: [], references: [] };

  const chapters = await db.chapters.getByProject(projectId);
  chapters.forEach((ch) => {
    if (ch.foreshadowsAdded.includes(foreshadowId)) {
      result.safe = false;
      result.warnings.push(`章节「第${ch.number}章 ${ch.title}」标记了该伏笔为新增`);
      result.references.push({ type: 'chapter', name: `第${ch.number}章 ${ch.title}`, field: '新增伏笔' });
    }
    if (ch.foreshadowsResolved.includes(foreshadowId)) {
      result.safe = false;
      result.warnings.push(`章节「第${ch.number}章 ${ch.title}」标记了该伏笔为已回收`);
      result.references.push({ type: 'chapter', name: `第${ch.number}章 ${ch.title}`, field: '回收伏笔' });
    }
  });

  return result;
}

/**
 * 检查删除世界观设定时的引用完整性
 */
export async function checkWorldSettingReferences(
  settingId: string,
  projectId: string
): Promise<ReferenceCheck> {
  const result: ReferenceCheck = { safe: true, warnings: [], references: [] };

  const settings = await db.worldSettings.getByProject(projectId);

  // 检查是否有子设定
  settings.forEach((s) => {
    if (s.parentId === settingId) {
      result.safe = false;
      result.warnings.push(`设定「${s.name}」是该项的子设定，删除后它们将变为顶层设定`);
      result.references.push({ type: 'worldsetting', name: s.name, field: '子设定' });
    }
  });

  // 检查关联引用
  settings.forEach((s) => {
    if (s.id === settingId) return;
    s.relations.forEach((r) => {
      if (r.targetId === settingId) {
        result.safe = false;
        result.warnings.push(`设定「${s.name}」关联了该项（${r.type}）`);
        result.references.push({ type: 'worldsetting', name: s.name, field: `关联: ${r.type}` });
      }
    });
  });

  return result;
}

/**
 * 清理悬空引用 - 删除实体后更新所有引用该实体的记录
 */
export async function cleanupDanglingReferences(
  entityType: 'character' | 'chapter' | 'foreshadow' | 'worldsetting',
  entityId: string,
  projectId: string
): Promise<void> {
  switch (entityType) {
    case 'character': {
      // 清理章节中的出场角色
      const chapters = await db.chapters.getByProject(projectId);
      for (const ch of chapters) {
        if (ch.characters.includes(entityId)) {
          ch.characters = ch.characters.filter((id) => id !== entityId);
          await db.chapters.update(ch);
        }
      }
      // 清理伏笔中的关联角色
      const foreshadows = await db.foreshadows.getByProject(projectId);
      for (const f of foreshadows) {
        if (f.relatedCharacters.includes(entityId)) {
          f.relatedCharacters = f.relatedCharacters.filter((id) => id !== entityId);
          await db.foreshadows.update(f);
        }
      }
      // 清理其他角色的关系
      const characters = await db.characters.getByProject(projectId);
      for (const c of characters) {
        const beforeLen = c.relations.length;
        c.relations = c.relations.filter((r) => r.targetId !== entityId);
        if (c.relations.length !== beforeLen) {
          await db.characters.update(c);
        }
      }
      break;
    }
    case 'chapter': {
      // 清理伏笔中的章节引用
      const foreshadows = await db.foreshadows.getByProject(projectId);
      for (const f of foreshadows) {
        let changed = false;
        if (f.firstAppearance === entityId) { f.firstAppearance = ''; changed = true; }
        if (f.expectedResolution === entityId) { f.expectedResolution = undefined; changed = true; }
        if (f.actualResolution === entityId) { f.actualResolution = undefined; changed = true; }
        if (changed) await db.foreshadows.update(f);
      }
      // 清理角色出场章节
      const characters = await db.characters.getByProject(projectId);
      for (const c of characters) {
        if (c.appearances.includes(entityId)) {
          c.appearances = c.appearances.filter((id) => id !== entityId);
          await db.characters.update(c);
        }
      }
      break;
    }
    case 'foreshadow': {
      // 清理章节中的伏笔引用
      const chapters = await db.chapters.getByProject(projectId);
      for (const ch of chapters) {
        let changed = false;
        if (ch.foreshadowsAdded.includes(entityId)) {
          ch.foreshadowsAdded = ch.foreshadowsAdded.filter((id) => id !== entityId);
          changed = true;
        }
        if (ch.foreshadowsResolved.includes(entityId)) {
          ch.foreshadowsResolved = ch.foreshadowsResolved.filter((id) => id !== entityId);
          changed = true;
        }
        if (changed) await db.chapters.update(ch);
      }
      break;
    }
    case 'worldsetting': {
      // 将子设定变为顶层
      const settings = await db.worldSettings.getByProject(projectId);
      for (const s of settings) {
        if (s.parentId === entityId) {
          s.parentId = undefined;
          await db.worldSettings.update(s);
        }
        // 清理关联
        const beforeLen = s.relations.length;
        s.relations = s.relations.filter((r) => r.targetId !== entityId);
        if (s.relations.length !== beforeLen) {
          await db.worldSettings.update(s);
        }
      }
      break;
    }
  }
}
