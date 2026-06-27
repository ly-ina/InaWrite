/**
 * 世界观设定关联图谱
 * D3.js 力导向图展示设定之间的层级和关联关系
 */

import { useEffect, useRef } from 'react';
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

export function SettingGraph({ settings, centerId, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || settings.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // 构建节点和连线
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // 所有设定都作为节点
    settings.forEach((s) => {
      nodes.push({
        id: s.id,
        name: s.name,
        type: s.type,
        isParent: settings.some((x) => x.parentId === s.id),
      });

      // 父子关系连线
      if (s.parentId && settings.some((x) => x.id === s.parentId)) {
        links.push({
          source: s.parentId,
          target: s.id,
          type: 'parent',
          label: '包含',
        });
      }

      // 关联关系连线
      s.relations.forEach((r) => {
        if (settings.some((x) => x.id === r.targetId)) {
          links.push({
            source: s.id,
            target: r.targetId,
            type: 'relation',
            label: r.type,
          });
        }
      });
    });

    // 如果没有节点则不渲染
    if (nodes.length === 0) return;

    const g = svg.append('g');

    // 缩放
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));

    // 力模拟 - 使用更强的层级力
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance((l) => l.type === 'parent' ? 80 : 150))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide(40))
      .force('x', d3.forceX(0).strength(0.03))
      .force('y', d3.forceY(0).strength(0.03));

    // 绘制连线
    const link = g.append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => d.type === 'parent' ? 'var(--text-muted)' : 'var(--accent-dim)')
      .attr('stroke-width', (d) => d.type === 'parent' ? 2 : 1)
      .attr('stroke-dasharray', (d) => d.type === 'relation' ? '4,3' : 'none')
      .attr('opacity', 0.6);

    // 连线标签
    const linkLabel = g.append('g')
      .selectAll<SVGTextElement, GraphLink>('text')
      .data(links)
      .join('text')
      .text((d) => d.label)
      .attr('font-size', '9px')
      .attr('fill', 'var(--text-muted)')
      .attr('text-anchor', 'middle')
      .attr('dy', '-6');

    // 绘制节点
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

    // 节点圆圈
    node.append('circle')
      .attr('r', (d) => (d.id === centerId ? 26 : d.isParent ? 22 : 18))
      .attr('fill', (d) => TYPE_COLORS[d.type] || TYPE_COLORS.custom)
      .attr('stroke', 'var(--bg-primary)')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9);

    // 节点内文字（类型图标）
    const typeIcons: Record<string, string> = {
      location: '📍',
      race: '👥',
      item: '🗡️',
      concept: '💡',
      history: '📜',
      custom: '🏷️',
    };

    node.append('text')
      .text((d) => typeIcons[d.type] || '📌')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .attr('pointer-events', 'none');

    // 节点下方名称
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

      linkLabel
        .attr('x', (d) => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr('y', (d) => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [settings, centerId, onNodeClick]);

  return (
    <svg
      ref={svgRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-md)',
      }}
    />
  );
}
