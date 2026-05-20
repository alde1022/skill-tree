'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Crosshair, RotateCcw, Save, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { activeSynergies, buildSpec, encodeBuild } from '@/lib/build';
import { EDGES, NODES, type TreeNode } from '@/lib/tree-data';
import { canAllocate, wouldOrphan } from '@/lib/tree-rules';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = { initialAllocated?: string[]; shortId?: string };
const AXIS_LABELS = [
  { label: 'Senses', x: 500, y: 34 },
  { label: 'Judgment', x: 895, y: 320 },
  { label: 'Memory', x: 758, y: 820 },
  { label: 'Hands', x: 242, y: 820 },
  { label: 'Character', x: 105, y: 320 },
];
const isCluster = (id: string) => ['pra','prN','prc','rma','rmN','rmc','maA','maN','maC','aiA','aiN','aiC','ipA','ipN','ipC'].includes(id);
const edgeKey = (a: string, b: string) => [a,b].sort().join('::');
const MAJOR_IDS = Object.values(NODES).filter((n) => n.type === 'keystone' || n.type === 'notable').map((n) => n.id);
function pathTo(target?: string | null) {
  if (!target || target === 'birth' || !(target in NODES)) return ['birth'];
  const graph = new Map<string, string[]>();
  for (const e of EDGES) {
    graph.set(e.from, [...(graph.get(e.from) ?? []), e.to]);
    graph.set(e.to, [...(graph.get(e.to) ?? []), e.from]);
  }
  const queue = ['birth'];
  const prev = new Map<string, string | null>([['birth', null]]);
  for (const cur of queue) {
    if (cur === target) break;
    for (const next of graph.get(cur) ?? []) if (!prev.has(next)) { prev.set(next, cur); queue.push(next); }
  }
  if (!prev.has(target)) return ['birth'];
  const path: string[] = [];
  for (let cur: string | null = target; cur; cur = prev.get(cur) ?? null) path.push(cur);
  return path.reverse();
}

export default function AgentSkillTree({ initialAllocated = ['birth'], shortId }: Props) {
  const [allocated, setAllocated] = useState(new Set(['birth', ...initialAllocated]));
  const [hovered, setHovered] = useState<TreeNode | null>(null);
  const [selected, setSelected] = useState<TreeNode | null>(NODES.birth);
  const [scale, setScale] = useState(0.86);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{x:number;y:number;pan:{x:number;y:number}} | null>(null);
  const [savedId, setSavedId] = useState(shortId ?? '');
  const [budget, setBudget] = useState(25);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [pathMode, setPathMode] = useState(true);
  const [revealedSynergies, setRevealedSynergies] = useState(new Set<string>());
  const viewport = useRef<HTMLDivElement>(null);
  const synergies = useMemo(() => activeSynergies(allocated), [allocated]);
  const spent = Math.max(0, allocated.size - 1);
  const remaining = budget - spent;
  const skillHealth = spent <= 12 ? { label: 'Focused', tone: 'text-green-300', note: 'Sweet spot: 5-12 active skills.' } : spent <= 20 ? { label: 'Broad', tone: 'text-amber-300', note: 'Broad build. Still usable if the role is clear.' } : { label: 'Noisy', tone: 'text-red-300', note: 'Too many active skills can hurt tool choice and reliability.' };
  const grouped = useMemo(() => {
    const groups: Record<string, string[]> = { keystone: [], notable: [], minor: [], start: [] };
    [...allocated].forEach((id) => groups[NODES[id].type]?.push(id));
    return groups;
  }, [allocated]);
  useEffect(() => {
    const next = new Set(revealedSynergies);
    for (const s of synergies) next.add(s.id);
    if (next.size !== revealedSynergies.size) setRevealedSynergies(next);
  }, [synergies, revealedSynergies]);
  const spec = useMemo(() => buildSpec([...allocated]), [allocated]);
  const focusNode = hovered ?? selected;
  const highlightedPath = useMemo(() => pathMode ? pathTo(focusNode?.id) : [], [focusNode?.id, pathMode]);
  const pathNodes = useMemo(() => new Set(highlightedPath), [highlightedPath]);
  const pathEdges = useMemo(() => new Set(highlightedPath.slice(1).map((id, i) => edgeKey(highlightedPath[i], id))), [highlightedPath]);
  const share = typeof window !== 'undefined' ? `${window.location.origin}/build?b=${encodeBuild(allocated)}` : '';
  function toggle(node: TreeNode) { if (node.id === 'birth') return; const next = new Set(allocated); if (allocated.has(node.id)) { if (wouldOrphan(node.id, allocated)) return; next.delete(node.id); } else if (remaining > 0 && canAllocate(node.id, allocated)) next.add(node.id); setAllocated(next); setSelected(node); }
  function focus(id: string) { const node = NODES[id]; setSelected(node); setPulseId(id); setScale(1.18); setPan({ x: (500 - node.x) * .34, y: (450 - node.y) * .34 }); setTimeout(()=>setPulseId(null), 800); }
  async function saveBuild() { const res = await fetch('/api/builds', { method: 'POST', body: JSON.stringify({ allocated: [...allocated], spec, pointsTotal: budget }) }); const data = await res.json(); if (data.shortId) setSavedId(data.shortId); }
  return <div className="grid min-h-screen grid-cols-1 bg-[#09070b] text-stone-100 lg:grid-cols-[minmax(0,1fr)_380px]">
    <div className="relative overflow-hidden border-r border-amber-500/10 bg-[radial-gradient(circle_at_50%_40%,rgba(120,53,15,.22),transparent_35%),radial-gradient(circle_at_50%_60%,rgba(127,29,29,.16),transparent_50%),#07060a]">
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-2xl border border-amber-500/15 bg-black/45 p-2 backdrop-blur"><Button title="Zoom in" onClick={() => setScale((s)=>Math.min(1.8,s+.12))}><ZoomIn size={16}/></Button><Button title="Zoom out" onClick={() => setScale((s)=>Math.max(.42,s-.12))}><ZoomOut size={16}/></Button><span className="min-w-12 text-center font-mono text-xs text-amber-100">{Math.round(scale*100)}%</span><Button title="Reset view" onClick={() => {setScale(.86); setPan({x:0,y:0});}}><RotateCcw size={16}/></Button><Button title="Toggle path highlight" onClick={() => setPathMode((v)=>!v)} className={pathMode ? 'border-amber-300 text-amber-100' : ''}><Crosshair size={16}/></Button></div><div className="absolute right-4 top-4 z-20 hidden max-w-56 rounded-2xl border border-amber-500/15 bg-black/50 p-3 backdrop-blur xl:block"><p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">Major nodes</p><div className="mt-2 flex flex-wrap gap-1.5">{MAJOR_IDS.map((id)=><button key={id} onClick={()=>focus(id)} className={cn('rounded-full border px-2 py-1 text-[10px] text-stone-300 hover:border-amber-300 hover:text-amber-100', allocated.has(id) ? 'border-amber-400/70 bg-amber-500/15' : 'border-stone-700 bg-black/30')}>{NODES[id].label}</button>)}</div><p className="mt-3 text-[11px] text-stone-500">Hover/select any node to light the route from Base Agent.</p></div>
      <div ref={viewport} className="h-[68vh] min-h-[560px] cursor-grab overflow-hidden lg:h-full lg:min-h-screen" onWheel={(e)=>{ e.preventDefault(); setScale((s)=>Math.min(1.8, Math.max(.42, s + (e.deltaY < 0 ? .08 : -.08)))); }} onMouseDown={(e)=>setDrag({x:e.clientX,y:e.clientY,pan})} onMouseMove={(e)=>{ if(drag) setPan({x:drag.pan.x+e.clientX-drag.x,y:drag.pan.y+e.clientY-drag.y}); }} onMouseUp={()=>setDrag(null)} onMouseLeave={()=>setDrag(null)}>
        <svg viewBox="0 0 1000 900" className="h-full w-full" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin:'center' }}>
          <defs><filter id="goldGlow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="redGlow"><feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <circle cx="500" cy="450" r="390" fill="none" stroke="rgba(251,191,36,.08)"/><circle cx="500" cy="450" r="250" fill="none" stroke="rgba(251,191,36,.06)"/>{AXIS_LABELS.map((axis) => <text key={axis.label} x={axis.x} y={axis.y} textAnchor="middle" className="fill-amber-200/70 text-[18px] tracking-[.28em]" style={{fontFamily:'Cinzel'}}>{axis.label}</text>)}
          {EDGES.map((e) => { const a=NODES[e.from], b=NODES[e.to]; const on = allocated.has(e.from) && allocated.has(e.to); const bridge = isCluster(e.from) || isCluster(e.to); const inPath = pathEdges.has(edgeKey(e.from, e.to)); const muted = pathMode && focusNode && !inPath; return <line key={`${e.from}-${e.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={inPath ? 'rgba(96,165,250,.95)' : on ? (bridge ? 'rgba(220,38,38,.9)' : 'rgba(251,191,36,.85)') : bridge ? 'rgba(127,29,29,.35)' : 'rgba(120,113,108,.24)'} strokeWidth={inPath?5:on?4:bridge?2.5:1.6} strokeDasharray={!on && inPath ? '8 7' : undefined} opacity={muted ? .28 : 1}/>; })}
          {Object.values(NODES).map((node) => { const on = allocated.has(node.id), avail = remaining > 0 && canAllocate(node.id, allocated), syn = isCluster(node.id), inPath = pathNodes.has(node.id), major = node.type === 'keystone' || node.type === 'notable'; const r = node.type === 'keystone' ? 25 : node.type === 'notable' ? 18 : node.type === 'start' ? 26 : 11; return <g key={node.id} onClick={(e)=>{e.stopPropagation();toggle(node);}} onMouseEnter={()=>setHovered(node)} onMouseLeave={()=>setHovered(null)} className="cursor-pointer" opacity={pathMode && focusNode && !inPath && !major ? .45 : 1}><motion.circle cx={node.x} cy={node.y} r={r+9} fill={inPath?'rgba(37,99,235,.22)':syn?'rgba(127,29,29,.22)':'rgba(0,0,0,.35)'} stroke={inPath?'#60a5fa':on?'#fbbf24':avail?'#a16207':'#57534e'} strokeWidth={inPath?3.5:on?3:major?2:1.3} filter={on || inPath ? (syn?'url(#redGlow)':'url(#goldGlow)') : undefined} initial={false} animate={{ scale: pulseId === node.id || inPath && node.id === focusNode?.id ? 1.24 : on ? 1.06 : 1 }}/><circle cx={node.x} cy={node.y} r={r} fill={on ? (syn ? '#7f1d1d' : '#b7791f') : inPath ? '#172554' : '#15110d'} stroke={node.type==='keystone'?'#f5d080':inPath?'#93c5fd':'#78716c'} strokeWidth={major?2:1.3}/>{major && <circle cx={node.x} cy={node.y} r={r+15} fill="none" stroke={on?'rgba(251,191,36,.32)':'rgba(245,208,128,.16)'} strokeWidth="2"/>}{(node.type !== 'minor' || on || avail || inPath) && <text x={node.x} y={node.y+r+20} textAnchor="middle" className={cn('fill-stone-500 text-[10px]', major && 'fill-amber-200/80 text-[12px]', node.type === 'keystone' && 'text-[14px]', inPath && 'fill-blue-100', on && 'fill-amber-100')} style={{fontFamily:'Cinzel'}}>{node.label}</text>}</g>; })}
        </svg>
        <AnimatePresence>{hovered && <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="pointer-events-none absolute left-6 top-20 z-30 w-80 rounded-xl border border-amber-400/20 bg-black/80 p-4 shadow-2xl backdrop-blur"><p className="font-mono text-xs uppercase text-amber-400">{hovered.type} {hovered.axis ? `· ${hovered.axis}` : ''}</p><h3 className="mt-1 font-[Cinzel] text-xl text-amber-100">{hovered.label}</h3><p className="mt-2 text-sm text-stone-300">{hovered.desc}</p><p className="mt-3 font-mono text-xs text-stone-400">Status: {allocated.has(hovered.id)?'allocated':canAllocate(hovered.id,allocated)?'available':'locked'}</p><p className="mt-3 text-sm text-amber-100/90">{hovered.practice}</p></motion.div>}</AnimatePresence>
      </div>
    </div>
    <aside className="max-h-[60vh] overflow-auto rounded-t-3xl border-t border-amber-500/10 bg-[#0f0b10]/95 p-5 shadow-[0_-20px_60px_rgba(0,0,0,.45)] backdrop-blur lg:max-h-none lg:rounded-none lg:border-l lg:border-t-0"><div className="flex items-center justify-between gap-3"><div><p className="font-mono text-xs uppercase text-amber-500">Agent Skill Tree</p><h1 className="font-[Cinzel] text-3xl text-amber-100">Outcome Planner</h1><p className="mt-1 max-w-72 text-xs text-stone-400">Design what the agent helps with in modern life. Keep the active loadout focused.</p></div><Sparkles className="text-red-400"/></div><div className="mt-5 grid grid-cols-3 gap-2 font-mono text-xs"><Stat label="Skills" value={spent}/><Stat label="Left" value={remaining}/><Stat label="Archetype" value={synergies.length}/></div><div className={cn('mt-3 rounded-xl border border-stone-800 bg-black/25 p-3 font-mono text-xs', skillHealth.tone)}><div className="flex items-center justify-between"><span>Loadout: {skillHealth.label}</span><span>{spent}/12 ideal</span></div><p className="mt-1 text-stone-400">{skillHealth.note}</p></div><div className="mt-4 flex flex-wrap gap-2"><Button onClick={()=>navigator.clipboard.writeText(share)}><Copy size={15}/> Share</Button><Button onClick={()=>setBudget((b)=>b+5)}>+5 points</Button><Button onClick={saveBuild}><Save size={15}/> Save</Button>{savedId && <Button asChild><Link href={`/build/${savedId}/spec`}>Spec</Link></Button>}</div>{savedId && <p className="mt-2 font-mono text-xs text-green-300">Saved: /build/{savedId}</p>}<section className="mt-6"><h2 className="font-[Cinzel] text-xl text-amber-100">Selected</h2>{selected && <div className="mt-3 rounded-xl border border-amber-500/15 bg-black/25 p-4"><p className="font-mono text-xs uppercase text-amber-400">{selected.type}</p><h3 className="font-[Cinzel] text-2xl">{selected.label}</h3><p className="mt-2 text-sm text-stone-300">{selected.desc}</p><details open className="mt-3"><summary className="cursor-pointer text-sm text-amber-200">Practice</summary><p className="mt-2 text-sm text-stone-300">{selected.practice}</p></details></div>}</section><section className="mt-6"><h2 className="font-[Cinzel] text-xl text-amber-100">Outcome Archetypes</h2><div className="mt-3 space-y-2">{synergies.map((s)=><motion.div key={s.id} initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 shadow-[0_0_24px_rgba(185,28,28,.18)]"><p className="font-[Cinzel] text-lg text-red-100">{s.name}</p><p className="text-sm text-stone-300">{s.desc}</p></motion.div>)}{!synergies.length && <p className="text-sm text-stone-500">Combine major capabilities to reveal useful real-world agent roles.</p>}</div></section><section className="mt-6"><h2 className="font-[Cinzel] text-xl text-amber-100">Allocated Practice</h2><div className="mt-3 max-h-72 space-y-3 overflow-auto pr-2">{(['keystone','notable','minor','start'] as const).map((type)=>grouped[type].length ? <div key={type}><p className="mb-1 font-mono text-xs uppercase text-stone-500">{type}</p>{grouped[type].map((id)=><details key={id} className="mb-2 rounded-lg border border-stone-800 bg-black/20 p-2" onToggle={()=>{setPulseId(id); setTimeout(()=>setPulseId(null), 650);}}><summary className="cursor-pointer text-sm text-amber-100">{NODES[id].label}</summary><p className="mt-2 text-sm text-stone-400">{NODES[id].practice}</p></details>)}</div> : null)}</div></section></aside>
  </div>;
}
function Stat({label,value}:{label:string;value:number}) { return <div className="rounded-lg border border-amber-500/10 bg-black/30 p-2"><div className="text-stone-500">{label}</div><div className="text-lg text-amber-100">{value}</div></div>; }
