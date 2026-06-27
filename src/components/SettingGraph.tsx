/**
 * 世界观设定关联图谱
 * D3.js 力导向图展示设定之间的层级和关联关系
 * 支持按类型、搜索词筛选
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { WorldSetting } from '../types';

interface Props {
  settings: WorldSetting[];
  centerId?: string;
  onNodeClick: (id: string) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: WorldSetting['type'];
  isParent: boolean;
  childCount: number;      // 直接子节点数
  totalDescendants: number; // 子孙节点总数
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  type: 'parent' | 'relation';
  label: string;
}

const TYPE_COLORS: Record<string, string> = {
  location: '#5a9e6f',
  race: '#c44b4b',
  item: '#c9a96e',
  concept: '#6b8cc9',
  history: '#9e6bc9',
  custom: '#a09b93',
};

const TYPE_ICONS: Record<string, string> = {
  location: '📍',
  race: '👥',
  item: '🗡️',
  concept: '💡',
  history: '📜',
  custom: '🏷️',
};

const TYPE_NAMES: Record<string, string> = {
  location: '地点',
  race: '种族',
  item: '物品',
  concept: '概念',
  history: '历史',
  custom: '自定义',
};

export function SettingGraph({ settings, centerId, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  // 筛选状态
  const [showFilters, setShowFilters] = useState(false);
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showRelationOnly, setShowRelationOnly] = useState(false);

  const toggleFilterType = (t: string) => {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  // 筛选后的设定
  const filteredSettings = useMemo(() => {
    return settings.filter((s) => {
      if (filterTypes.size > 0 && !filterTypes.has(s.type)) return false;
      if (searchTerm && !s.name.includes(searchTerm) && !s.description.includes(searchTerm)) return false;
      return true;
    });
  }, [settings, filterTypes, searchTerm]);

  // 收集筛选后涉及的节点 ID（用于只显示有关联的节点）
  const relevantIds = useMemo(() => {
    if (!showRelationOnly) return new Set<string>();
    const ids = new Set<string>(filteredSettings.map((s) => s.id));
    // 也包含父节点
    filteredSettings.forEach((s) => {
      if (s.parentId && settings.some((x) => x.id === s.parentId)) ids.add(s.parentId);
      s.relations.forEach((r) => {
        if (settings.some((x) => x.id === r.targetId)) ids.add(r.targetId);
      });
    });
    return ids;
  }, [filteredSettings, showRelationOnly, settings]);

  const displaySettings = showRelationOnly
    ? settings.filter((s) => relevantIds.has(s.id))
    : filteredSettings;

  useEffect(() => {
    if (!svgRef.current || displaySettings.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // 构建节点和连线
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const displayIds = new Set(displaySettings.map((s) => s.id));

    // 计算每个节点的子孙数（递归）
    const getDescendantCount = (pid: string): number => {
      let count = 0;
      const children = displaySettings.filter((s) => s.parentId === pid);
      children.forEach((c) => {
        count += 1 + getDescendantCount(c.id);
      });
      return count;
    };

    displaySettings.forEach((s) => {
      const childCount = displaySettings.filter((x) => x.parentId === s.id).length;
      nodes.push({
        id: s.id,
        name: s.name,
        type: s.type,
        isParent: childCount > 0,
        childCount,
        totalDescendants: getDescendantCount(s.id),
      });

      // 父子关系连线（仅当两端都在显示集合中）
      if (s.parentId && displayIds.has(s.parentId)) {
        links.push({
          source: s.parentId,
          target: s.id,
          type: 'parent',
          label: '包含',
        });
      }

      // 关联关系连线（仅当两端都在显示集合中）
      s.relations.forEach((r) => {
        if (displayIds.has(r.targetId)) {
          links.push({
            source: s.id,
            target: r.targetId,
            type: 'relation',
            label: r.type,
          });
        }
      });
    });

    if (nodes.length === 0) return;

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance((l) => l.type === 'parent' ? 80 : 150))
      .force('charge', d3.forceManyBody().strength(-600))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide<GraphNode>(50))
      .force('x', d3.forceX(0).strength(0.03))
      .force('y', d3.forceY(0).strength(0.03));

    // 连线组（每条连线用 g 包裹 line + 箭头 + 标签）
    const linkGroup = g.append('g')
      .selectAll<SVGGElement, GraphLink>('g')
      .data(links)
      .join('g');

    // 连线本身
    const link = linkGroup.append('line')
      .attr('stroke', (d) => d.type === 'parent' ? 'var(--text-muted)' : 'var(--accent-dim)')
      .attr('stroke-width', (d) => d.type === 'parent' ? 2 : 1)
      .attr('stroke-dasharray', (d) => d.type === 'relation' ? '4,3' : 'none')
      .attr('opacity', 0.6);

    // 箭头（在 target 端画三角，不依赖 marker）
    const arrowSize = 8;
    linkGroup.append('polygon')
      .attr('fill', (d) => d.type === 'parent' ? '#8c8c8c' : '#c9a96e')
      .attr('opacity', 0.7)
      .attr('points', '0,0 0,0 0,0'); // 占位，tick 时更新

    // 连线标签
    const linkLabel = linkGroup.append('text')
      .text((d) => d.label)
      .attr('font-size', '9px')
      .attr('fill', 'var(--text-muted)')
      .attr('text-anchor', 'middle')
      .attr('dy', '-6');

    // 节点
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => onNodeClick(d.id))
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as never
      );

    // 节点大小：包含方 > 被包含方，按子孙数分级
    const getNodeRadius = (d: GraphNode) => {
      if (d.id === centerId) return 28;
      if (d.totalDescendants >= 8) return 26;
      if (d.totalDescendants >= 4) return 23;
      if (d.totalDescendants >= 1) return 20;
      return 16;
    };

    node.append('circle')
      .attr('r', getNodeRadius)
      .attr('fill', (d) => TYPE_COLORS[d.type] || TYPE_COLORS.custom)
      .attr('stroke', 'var(--bg-primary)')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9);

    node.append('text')
      .text((d) => TYPE_ICONS[d.type] || '📌')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .attr('pointer-events', 'none');

    node.append('text')
      .text((d) => d.name.length > 4 ? d.name.slice(0, 4) + '..' : d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '1.8em')
      .attr('fill', 'var(--text-secondary)')
      .attr('font-size', '10px')
      .attr('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);

      // 更新箭头三角坐标：在 target 端，连线方向末端
      linkGroup.selectAll('polygon')
        .attr('points', (d: any) => {
          const tx = (d?.target as GraphNode)?.x ?? 0;
          const ty = (d?.target as GraphNode)?.y ?? 0;
          const sx = (d?.source as GraphNode)?.x ?? 0;
          const sy = (d?.source as GraphNode)?.y ?? 0;
          const dx = tx - sx;
          const dy = ty - sy;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 1) return '0,0 0,0 0,0';
          const ux = dx / len;
          const uy = dy / len;
          // 箭头基部在 target 节点边缘外一点
          const targetR = getNodeRadius(d?.target as GraphNode);
          const baseX = tx - ux * (targetR + 2);
          const baseY = ty - uy * (targetR + 2);
          // 垂直方向
          const px = -uy;
          const py = ux;
          const tipX = tx - ux * (targetR - 1);
          const tipY = ty - uy * (targetR - 1);
          const leftX = baseX + px * (arrowSize / 2);
          const leftY = baseY + py * (arrowSize / 2);
          const rightX = baseX - px * (arrowSize / 2);
          const rightY = baseY - py * (arrowSize / 2);
          return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`;
        });

      linkLabel
        .attr('x', (d) => {
          const sx = (d.source as GraphNode).x ?? 0;
          const tx = (d.target as GraphNode).x ?? 0;
          return sx + (tx - sx) * 0.4;
        })
        .attr('y', (d) => {
          const sy = (d.source as GraphNode).y ?? 0;
          const ty = (d.target as GraphNode).y ?? 0;
          return sy + (ty - sy) * 0.4;
        });

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [displaySettings, centerId, onNodeClick]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 筛选栏 */}
      <div style={{
        position: 'absolute',
        top: 8,
        left: 8,
        zIndex: 10,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '8px',
        maxWidth: '280px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: showFilters ? '8px' : 0 }}>
          <button
            className="btn btn-sm"
            onClick={() => setShowFilters(!showFilters)}
            style={{ fontSize: '11px', flex: 1 }}
          >
            {showFilters ? '收起筛选' : '筛选'} ({displaySettings.length}/{settings.length})
          </button>
          <button
            className={`btn btn-sm ${showRelationOnly ? 'btn-primary' : ''}`}
            onClick={() => setShowRelationOnly(!showRelationOnly)}
            style={{ fontSize: '11px' }}
            title="只显示有关联关系的节点"
          >
            关联
          </button>
        </div>
        {showFilters && (
          <div>
            <input
              className="input"
              placeholder="搜索设定名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ marginBottom: '6px', fontSize: '12px' }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {Object.entries(TYPE_NAMES).map(([k, v]) => {
                const active = filterTypes.size === 0 || filterTypes.has(k);
                return (
                  <button
                    key={k}
                    className={`btn btn-sm ${filterTypes.has(k) ? 'btn-primary' : ''}`}
                    onClick={() => toggleFilterType(k)}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      opacity: filterTypes.size === 0 || filterTypes.has(k) ? 1 : 0.4,
                    }}
                  >
                    {TYPE_ICONS[k]} {v}
                  </button>
                );
              })}
            </div>
            {filterTypes.size > 0 && (
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setFilterTypes(new Set())}
                style={{ fontSize: '10px', marginTop: '4px', width: '100%' }}
              >
                清除类型筛选
              </button>
            )}
          </div>
        )}
      </div>

      {/* 图例 */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        right: 8,
        zIndex: 10,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        padding: '6px 10px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        display: 'flex',
        gap: '10px',
      }}>
        <span>━━ 层级</span>
        <span style={{ borderBottom: '1px dashed var(--accent-dim)' }}>- - 关联</span>
        <span>🖱 滚轮缩放</span>
      </div>

      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
        }}
      />
      {displaySettings.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--text-muted)',
          fontSize: '14px',
        }}>
          没有匹配的设定
        </div>
      )}
    </div>
  );
}
