import { useId, useMemo, useRef, useState } from 'react';
import { constructs, paths, type NodeId } from '../data/model';

export type Selection={type:'node';id:NodeId}|{type:'path';id:string}|null;
type Props={
  mode?:'poster'|'model'|'pathway';
  selected?:Selection;
  onSelect?:(selection:Selection)=>void;
  activeNodes?:readonly NodeId[];
  activePaths?:readonly string[];
  interactive?:boolean;
  showControls?:boolean;
  intro?:boolean;
  sequenceKey?:number;
  onInteractionStart?:()=>void;
};

type Box={x:number;y:number;w:number;h:number};
const BASE:Box={x:0,y:35,w:1270,h:560};
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));

export default function SEMCanvas({mode='model',selected=null,onSelect,activeNodes=[],activePaths=[],interactive=true,showControls=true,intro=false,sequenceKey=0,onInteractionStart}:Props){
  const uid=useId().replace(/:/g,'');
  const nodeIntroOrder:Record<NodeId,number>={CI:0,IQ:0,PC:1,IC:1,RA:2,AE:3,ES:3};
  const [hover,setHover]=useState<Selection>(null);
  const [box,setBox]=useState<Box>(BASE);
  const drag=useRef<{x:number;y:number;box:Box}|null>(null);
  const relation=hover??selected;
  const highlightedNodes=useMemo(()=>{
    const s=new Set<NodeId>(activeNodes);
    if(relation?.type==='node'){
      s.add(relation.id);
      paths.forEach(p=>{if(p.from===relation.id||p.to===relation.id){s.add(p.from);s.add(p.to);}});
    }else if(relation?.type==='path'){
      const p=paths.find(x=>x.id===relation.id); if(p){s.add(p.from);s.add(p.to);}
    }
    return s;
  },[activeNodes,relation]);
  const highlightedPaths=useMemo(()=>{
    const s=new Set(activePaths);
    if(relation?.type==='node') paths.forEach(p=>{if(p.from===relation.id||p.to===relation.id)s.add(p.id)});
    if(relation?.type==='path') s.add(relation.id);
    // A path may be emphasized only when both endpoint constructs are active.
    // This prevents orphaned arrows from remaining highlighted after a node is dimmed.
    return new Set([...s].filter(id=>{
      const p=paths.find(x=>x.id===id);
      return Boolean(p&&highlightedNodes.has(p.from)&&highlightedNodes.has(p.to));
    }));
  },[activePaths,relation,highlightedNodes]);
  const hasContext=activeNodes.length>0||Boolean(relation);
  const completePoster=mode==='poster'&&activeNodes.length===constructs.length&&activePaths.length===paths.length&&!relation;
  const zoom=(factor:number,cx=box.x+box.w/2,cy=box.y+box.h/2)=>{
    const nw=clamp(box.w*factor,520,1550); const nh=nw*(BASE.h/BASE.w);
    const rx=(cx-box.x)/box.w; const ry=(cy-box.y)/box.h;
    setBox({x:cx-rx*nw,y:cy-ry*nh,w:nw,h:nh});
  };
  const pointerDown=(e:React.PointerEvent<SVGSVGElement>)=>{
    if(!interactive || (e.target as Element).closest('[data-interactive="true"]')) return;
    e.currentTarget.setPointerCapture(e.pointerId); drag.current={x:e.clientX,y:e.clientY,box};
  };
  const pointerMove=(e:React.PointerEvent<SVGSVGElement>)=>{
    if(!drag.current)return; const rect=e.currentTarget.getBoundingClientRect();
    const dx=(e.clientX-drag.current.x)*(drag.current.box.w/rect.width); const dy=(e.clientY-drag.current.y)*(drag.current.box.h/rect.height);
    setBox({...drag.current.box,x:drag.current.box.x-dx,y:drag.current.box.y-dy});
  };
  const pointerUp=()=>{drag.current=null};
  const wheel=(e:React.WheelEvent<SVGSVGElement>)=>{
    if(!interactive || !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const rect=e.currentTarget.getBoundingClientRect();
    const cx=box.x+(e.clientX-rect.left)/rect.width*box.w;
    const cy=box.y+(e.clientY-rect.top)/rect.height*box.h;
    zoom(e.deltaY>0?1.12:.89,cx,cy);
  };
  const activate=(s:Selection)=>{if(interactive)onSelect?.(s)};
  const key=(e:React.KeyboardEvent,s:Selection)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(s)}};
  return <div className={`sem-shell sem-${mode} ${intro?'is-intro':''}`} data-testid={`sem-${mode}`}>
    {interactive&&showControls&&<div className="sem-controls" aria-label="Diagram controls">
      <button onClick={()=>zoom(.84)} aria-label="Zoom in">+</button>
      <button onClick={()=>zoom(1.18)} aria-label="Zoom out">−</button>
      <button onClick={()=>setBox(BASE)}>Reset</button>
    </div>}
    <svg className="sem-svg" viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Structural equation model with seven constructs and nine paths" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheel}>
      <defs>
        <marker id={`arrow-${uid}`} markerWidth="6.5" markerHeight="6.5" refX="5.9" refY="3.25" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6.5,3.25 L0,6.5 z" fill="#73848f"/></marker>
        <marker id={`arrow-neg-${uid}`} markerWidth="6.5" markerHeight="6.5" refX="5.9" refY="3.25" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6.5,3.25 L0,6.5 z" fill="#c45542"/></marker>
        <marker id={`arrow-active-${uid}`} markerWidth="6.5" markerHeight="6.5" refX="5.9" refY="3.25" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6.5,3.25 L0,6.5 z" fill="var(--crimson)"/></marker>
        <marker id={`arrow-active-neg-${uid}`} markerWidth="6.5" markerHeight="6.5" refX="5.9" refY="3.25" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6.5,3.25 L0,6.5 z" fill="var(--negative)"/></marker>
      </defs>
      <g className="edge-layer">
        {paths.map((p,pathIndex)=>{
          const active=highlightedPaths.has(p.id); const contextual=hasContext&&!active; const neg=p.coefficient<0;
          return <g key={`${p.id}-${intro?sequenceKey:'static'}`} className={`sem-edge ${active?'is-active':''} ${contextual?'is-context':''}`} data-path-id={p.id} style={{'--edge-delay':`${1150+pathIndex*170}ms`} as React.CSSProperties}>
            <path d={p.route} className={`edge-base ${neg?'negative':''}`} markerEnd={`url(#${neg?`arrow-neg-${uid}`:`arrow-${uid}`})`}/>
            {intro&&<path d={p.route} pathLength={1} className={`intro-edge ${neg?'negative':''}`} style={{'--intro-delay':`${1150+pathIndex*170}ms`} as React.CSSProperties}/>} 
            {active&&!completePoster&&<path d={p.route} className={`edge-accent ${neg?'negative':''}`} markerEnd={`url(#${neg?`arrow-active-neg-${uid}`:`arrow-active-${uid}`})`}/>} 
            {interactive&&<path d={p.route} className="edge-hit" data-interactive="true" tabIndex={0} role="button" aria-label={`${p.hypothesis}: ${p.from} to ${p.to}, coefficient ${p.coefficient}`} onMouseEnter={()=>{onInteractionStart?.();setHover({type:'path',id:p.id})}} onMouseLeave={()=>setHover(null)} onFocus={()=>{onInteractionStart?.();setHover({type:'path',id:p.id})}} onBlur={()=>setHover(null)} onClick={()=>activate({type:'path',id:p.id})} onKeyDown={e=>key(e,{type:'path',id:p.id})}/>} 
            <g className={`edge-label ${active?'is-active':''}`} transform={`translate(${p.label[0]} ${p.label[1]})`} data-interactive={interactive?'true':undefined} tabIndex={interactive?0:undefined} role={interactive?'button':undefined} aria-label={interactive?`${p.hypothesis} ${p.symbol} ${p.coefficient}`:undefined} onMouseEnter={()=>{if(interactive){onInteractionStart?.();setHover({type:'path',id:p.id})}}} onMouseLeave={()=>interactive&&setHover(null)} onFocus={()=>{if(interactive){onInteractionStart?.();setHover({type:'path',id:p.id})}}} onBlur={()=>interactive&&setHover(null)} onClick={()=>activate({type:'path',id:p.id})} onKeyDown={e=>key(e,{type:'path',id:p.id})}>
              <rect x="-50" y="-16" width="100" height="32" rx="15"/><text textAnchor="middle" dominantBaseline="middle">{p.symbol} = {p.coefficient.toFixed(3)}</text>
            </g>
          </g>;
        })}
      </g>
      <g className="node-layer">
        {constructs.map((n,nodeIndex)=>{
          const active=highlightedNodes.has(n.id); const contextual=hasContext&&!active;
          const introDelay=380+nodeIntroOrder[n.id]*230+nodeIndex*28;
          return <g key={`${n.id}-${intro?sequenceKey:'static'}`} className={`sem-node ${active?'is-active':''} ${contextual?'is-context':''}`} style={{'--intro-delay':`${introDelay}ms`} as React.CSSProperties} transform={`translate(${n.x} ${n.y})`} data-node-id={n.id} data-interactive={interactive?'true':undefined} tabIndex={interactive?0:undefined} role={interactive?'button':undefined} aria-label={interactive?`${n.name}. ${n.role}. Select for details.`:undefined} onMouseEnter={()=>{if(interactive){onInteractionStart?.();setHover({type:'node',id:n.id})}}} onMouseLeave={()=>interactive&&setHover(null)} onFocus={()=>{if(interactive){onInteractionStart?.();setHover({type:'node',id:n.id})}}} onBlur={()=>interactive&&setHover(null)} onClick={()=>activate({type:'node',id:n.id})} onKeyDown={e=>key(e,{type:'node',id:n.id})}>
            {(() => { const size=n.id==='RA'?{rx:94,ry:58}:n.id==='PC'||n.id==='IC'?{rx:88,ry:54}:{rx:84,ry:52}; return <>
              <ellipse className="node-focus" rx={size.rx+11} ry={size.ry+9}/>
              <ellipse className="node-body" rx={size.rx} ry={size.ry} fill={n.color}/>
            </>; })()}
            <text className="node-code" textAnchor="middle" y="-5">{n.id}</text>
            <text className="node-name" textAnchor="middle" y="20">{n.name}</text>
          </g>;
        })}
      </g>
    </svg>
    {interactive&&showControls&&<div className="sem-help">Hover to trace · select for evidence · drag to pan · ⌘/Ctrl + wheel to zoom</div>}
  </div>;
}
