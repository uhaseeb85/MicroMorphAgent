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
  controller: 'hsl(222 47% 11%)', // Deep Slate
  service:    'hsl(215 25% 40%)', // Muted Slate
  repository: 'hsl(38 90% 45%)',  // Keep Amber for DB/Persistence but muted
  entity:     'hsl(0 70% 50%)',   // Keep Red for data model but clear
  config:     'hsl(252 45% 45%)', // Muted Purple
  util:       'hsl(215 15% 65%)', // Light Slate
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
    <div className="border rounded-2xl overflow-hidden bg-slate-50/30 relative shadow-inner aspect-[16/10] w-full" style={{ borderColor: 'hsl(214 20% 90%)' }}>
      <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-5 shadow-xl">
         <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <div className="w-1 h-3 bg-slate-300 rounded-full" />
            Layer Topology
         </h4>
         <div className="space-y-2">
           {Object.entries(LAYER_COLORS).map(([layer, color]) => (
              <div key={layer} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color }}></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{layer}</span>
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
        linkColor={link => (link as any).isTransactional ? 'rgba(225, 29, 72, 0.4)' : 'rgba(71, 85, 105, 0.1)'}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 10/globalScale;
          ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4); 

          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2 - 10, bckgDimensions[0], bckgDimensions[1], 2);
          ctx.fill();

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = LAYER_COLORS[node.layer as string] || '#000';
          ctx.fillText(label, node.x, node.y - 10);

          // Node Circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.val + 2, 0, 2 * Math.PI, false);
          ctx.fillStyle = LAYER_COLORS[node.layer as string] || '#000';
          ctx.fill();
          
          if (node.transactional) {
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'hsl(349 89% 50%)';
            ctx.stroke();
          }
        }}
      />
    </div>
  );
}
