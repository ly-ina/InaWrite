/**
 * 角色关系图谱组件
 * 使用 D3.js 的力导向图展示角色之间的关联关系
 * 支持缩放、拖拽、点击节点
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { Character } from '../types';

interface Props {
  characters: Character[];
  centerId: string;
  onNodeClick: (id: string) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  status: Character['status'];
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  type: string;
}

export function RelationGraph({ characters, centerId, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || characters.length === 0) return;

    // 清理之前的渲染
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // 构建节点：只包含中心角色和与其有关联的角色
    const centerChar = characters.find((c) => c.id === centerId);
    if (!centerChar) return;

    const relatedIds = new Set<string>();
    relatedIds.add(centerId);
    centerChar.relations.forEach((r) => relatedIds.add(r.targetId));
    // 也要包含被其他角色关联到中心角色的关系
    characters.forEach((c) => {
      if (c.relations.some((r) => r.targetId === centerId)) {
        relatedIds.add(c.id);
      }
    });

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // 添加节点
    relatedIds.forEach((id) => {
      const char = characters.find((c) => c.id === id);
      if (char) {
        nodes.push({ id: char.id, name: char.name, status: char.status });
      }
    });

    // 添加连线
    nodes.forEach((node) => {
      const char = characters.find((c) => c.id === node.id);
      if (!char) return;
      char.relations.forEach((rel) => {
        if (relatedIds.has(rel.targetId)) {
          links.push({
            source: node.id,
            target: rel.targetId,
            type: rel.type,
          });
        }
      });
    });

    // 颜色映射
    const statusColor = (status: Character['status']) => {
      switch (status) {
        case 'alive': return '#5a9e6f';
        case 'dead': return '#c44b4b';
        case 'unknown': return '#a09b93';
        case 'mentioned': return '#c9a96e';
      }
    };

    // 创建 SVG 容器
    const g = svg.append('g');

    // 添加缩放功能
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // 初始化位置在中心
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));

    // 创建力模拟
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide(50));

    // 绘制连线
    const link = g.append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--border-light)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3');

    // 连线标签
    const linkLabel = g.append('g')
      .selectAll<SVGTextElement, GraphLink>('text')
      .data(links)
      .join('text')
      .text((d) => d.type)
      .attr('font-size', '10px')
      .attr('fill', 'var(--text-muted)')
      .attr('text-anchor', 'middle')
      .attr('dy', '-6');

    // 绘制节点组
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
      .attr('r', (d) => (d.id === centerId ? 28 : 22))
      .attr('fill', (d) => statusColor(d.status))
      .attr('stroke', 'var(--bg-primary)')
      .attr('stroke-width', 2);

    // 节点文字
    node.append('text')
      .text((d) => d.name.length > 3 ? d.name.slice(0, 3) + '..' : d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', (d) => (d.id === centerId ? '12px' : '10px'))
      .attr('font-weight', '500')
      .attr('pointer-events', 'none');

    // 更新位置
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
  }, [characters, centerId, onNodeClick]);

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
