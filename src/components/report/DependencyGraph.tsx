import React, { useMemo, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphNode } from '../../types';
import { useAnalysisStore } from '../../store/analysisStore';

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

export function DependencyGraph({ data }: { data: GraphNode[] }) {
  const fgRef = useRef<any>(null);
  const theme = useAnalysisStore((state) => state.theme);

  const themeColors = useMemo(() => {
    const layerColors: Record<string, string> = {
      controller: 'var(--graph-node-controller)',
      service: 'var(--graph-node-service)',
      repository: 'var(--graph-node-repository)',
      entity: 'var(--graph-node-entity)',
      config: 'var(--graph-node-config)',
      util: 'var(--graph-node-util)'
    };

    const resolved = Object.fromEntries(
      Object.entries(layerColors).map(([key, value]) => [key, `hsl(${getComputedStyle(document.documentElement).getPropertyValue(value.replace('var(', '').replace(')', '')).trim()})`])
    ) as Record<string, string>;

    return {
      layerColors: resolved,
      panel: getComputedStyle(document.documentElement).getPropertyValue('--graph-panel').trim(),
      label: getComputedStyle(document.documentElement).getPropertyValue('--graph-label').trim(),
      link: getComputedStyle(document.documentElement).getPropertyValue('--graph-link').trim(),
      transactional: getComputedStyle(document.documentElement).getPropertyValue('--graph-link-transactional').trim()
    };
  }, [theme]);
  
  const graphData = useMemo(() => {
    const nodes: NodeObj[] = data.map(n => ({
      id: n.id,
      name: n.id.split('.').pop() || n.id,
      layer: n.layer,
      val: Math.max(1, n.inboundDeps.length),
      transactional: n.transactionalBoundary
    }));

    const links: LinkObj[] = [];
    const seenCoChangePairs = new Set<string>();
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
          // Deduplicate bidirectional co-change pairs (A→B and B→A both appear in the matrix)
          const pairKey = [n.id, cc.targetClass].sort((left, right) => left.localeCompare(right)).join('||');
          if (!seenCoChangePairs.has(pairKey)) {
            seenCoChangePairs.add(pairKey);
            links.push({
               source: n.id,
               target: cc.targetClass,
               isTransactional: false,
               value: cc.frequency * 0.5 // weight co-changes
            });
          }
        }
      });
    });

    return { nodes, links };
  }, [data]);

  return (
    <div className="neo-inset rounded-[2rem] overflow-hidden relative aspect-[16/10] w-full">
      <div className="absolute top-6 left-6 z-10 rounded-2xl p-5 shadow-xl border border-border/60 backdrop-blur-md"
           style={{ background: themeColors.panel }}>
         <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <div className="w-1 h-3 bg-border rounded-full" />
            Layer Topology
         </h4>
         <div className="space-y-2">
           {Object.entries(themeColors.layerColors).map(([layer, color]) => (
              <div key={layer} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color }}></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/80">{layer}</span>
              </div>
           ))}
         </div>
      </div>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="id"
        backgroundColor="transparent"
        nodeColor={(node: any) => themeColors.layerColors[node.layer as string] || themeColors.layerColors.util}
        nodeRelSize={6}
        linkWidth={link => (link as any).isTransactional ? 2 : Math.max(0.5, (link as any).value)}
        linkLineDash={link => (link as any).isTransactional ? [4, 4] : null}
        linkColor={link => (link as any).isTransactional ? themeColors.transactional : themeColors.link}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 10/globalScale;
          ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4); 

          ctx.fillStyle = themeColors.label;
          ctx.beginPath();
          // Use roundRect when available (Chrome 99+/FF 112+/Safari 15.4+), fall back to fillRect
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2 - 10, bckgDimensions[0], bckgDimensions[1], 2);
          } else {
            ctx.rect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2 - 10, bckgDimensions[0], bckgDimensions[1]);
          }
          ctx.fill();

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = themeColors.layerColors[node.layer as string] || '#000';
          ctx.fillText(label, node.x, node.y - 10);

          // Node Circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.val + 2, 0, 2 * Math.PI, false);
          ctx.fillStyle = themeColors.layerColors[node.layer as string] || '#000';
          ctx.fill();
          
          if (node.transactional) {
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = themeColors.transactional;
            ctx.stroke();
          }
        }}
      />
    </div>
  );
}
