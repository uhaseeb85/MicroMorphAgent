import React, { useRef, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphNode } from '../../types';

interface NodeObj {
  id: string;
  name: string;
  layer: string;
  val: number;
  transactional: boolean;
}

interface LinkObj {
  source: string;
  target: string;
  isTransactional: boolean;
  value: number;
}

const LAYER_COLORS: Record<string, string> = {
  controller: '#3B82F6', // blue
  service:    '#10B981', // green
  repository: '#F59E0B', // amber
  entity:     '#EF4444', // red
  config:     '#8B5CF6', // purple
  util:       '#6B7280', // gray
};

export function DependencyGraph({ data }: { data: GraphNode[] }) {
  const fgRef = useRef<any>(null);
  
  const graphData = useMemo(() => {
    const nodes: NodeObj[] = data.map(n => ({
      id: n.id,
      name: n.id.split('.').pop() || n.id,
      layer: n.layer,
      val: Math.max(1, n.inboundDeps.length),
      transactional: n.transactionalBoundary
    }));

    const links: LinkObj[] = [];
    data.forEach(n => {
      n.outboundDeps.forEach(dep => {
        // Only add if target exists
        if (data.some(dn => dn.id === dep)) {
          links.push({
            source: n.id,
            target: dep,
            isTransactional: n.transactionalBoundary,
            value: 1
          });
        }
      });
      
      n.coChangedWith.forEach(cc => {
        if (data.some(dn => dn.id === cc.targetClass)) {
            links.push({
               source: n.id,
               target: cc.targetClass,
               isTransactional: false,
               value: cc.frequency * 0.5 // weight co-changes
            });
        }
      });
    });

    return { nodes, links };
  }, [data]);

  return (
    <div className="border border-border rounded-xl  overflow-hidden bg-card/50 relative shadow-inner aspect-[4/3] w-full">
      <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur border border-border rounded-lg p-3 text-sm shadow-sm">
         <h4 className="font-semibold mb-2">Layers</h4>
         <div className="space-y-1">
           {Object.entries(LAYER_COLORS).map(([layer, color]) => (
              <div key={layer} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="capitalize text-xs">{layer}</span>
              </div>
           ))}
         </div>
      </div>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="id"
        nodeColor={(node: any) => LAYER_COLORS[node.layer as string] || LAYER_COLORS.util}
        nodeRelSize={6}
        linkWidth={link => (link as any).isTransactional ? 2 : Math.max(0.5, (link as any).value)}
        linkLineDash={link => (link as any).isTransactional ? [4, 4] : null}
        linkColor={link => (link as any).isTransactional ? 'rgba(239, 68, 68, 0.6)' : 'rgba(156, 163, 175, 0.2)'}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); 

          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2 - 8, bckgDimensions[0], bckgDimensions[1]);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = LAYER_COLORS[node.layer as string] || '#000';
          ctx.fillText(label, node.x, node.y - 8);

          // Node Circle overlaying text a bit
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.val + 2, 0, 2 * Math.PI, false);
          ctx.fillStyle = LAYER_COLORS[node.layer as string] || '#000';
          ctx.fill();
          
          if (node.transactional) {
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#EF4444';
            ctx.stroke();
          }
        }}
      />
    </div>
  );
}
