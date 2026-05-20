'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, RotateCcw, Save, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { activeSynergies, buildSpec, encodeBuild } from '@/lib/build';
import { EDGES, NODES, type TreeNode } from '@/lib/tree-data';
import { canAllocate, wouldOrphan } from '@/lib/tree-rules';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = { initialAllocated?: string[]; shortId?: string };
const AXIS_LABELS = [
  { label: 'Perception', x: 500, y: 34 },
  { label: 'Reasoning', x: 895, y: 320 },
  { label: 'Memory', x: 758, y: 820 },
  { label: 'Action', x: 242, y: 820 },
  { label: 'Identity', x: 105, y: 320 },
];
const isCluster = (id: string) => ['pra','prN','prc','rma','rmN','rmc','maA','maN','maC','aiA','aiN','aiC','ipA','ipN','ipC'].includes(id);

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
  const [revealedSynergies, setRevealedSynergies] = useState(new Set<string>());
  const viewport = useRef<HTMLDivElement>(null);
  const synergies = useMemo(() => activeSynergies(allocated), [allocated]);
  const spent = Math.max(0, allocated.size - 1);
  const remaining = budget - spent;
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
  const share = typeof window !== 'undefined' ? `${window.location.origin}/build?b=${encodeBuild(allocated)}` : '';
  function toggle(node: TreeNode) { if (node.id === 'birth') return; const next = new Set(allocated); if (allocated.has(node.id)) { if (wouldOrphan(node.id, allocated)) return; next.delete(node.id); } else if (remaining > 0 && canAllocate(node.id, allocated)) next.add(node.id); setAllocated(next); setSelected(node); }
  async function saveBuild() { const res = await fetch('/api/builds', { method: 'POST', body: JSON.stringify({ allocated: [...allocated], spec, pointsTotal: budget }) }); const data = await res.json(); if (data.shortId) setSavedId(data.shortId); }
  return <div className="grid min-h-screen grid-cols-1 bg-[#09070b] text-stone-100 lg:grid-cols-[minmax(0,1fr)_380px]">
    <div className="relative overflow-hidden border-r border-amber-500/10 bg-[radial-gradient(circle_at_50%_40%,rgba(120,53,15,.22),transparent_35%),radial-gradient(circle_at_50%_60%,rgba(127,29,29,.16),transparent_50%),#07060a]">
      <div className="absolute left-4 top-4 z-20 flex gap-2"><Button onClick={() => setScale((s)=>Math.min(1.4,s+.1))}>+</Button><Button onClick={() => setScale((s)=>Math.max(.45,s-.1))}>−</Button><Button onClick={() => {setScale(.86); setPan({x:0,y:0});}}><RotateCcw size={16}/></Button></div>
      <div ref={viewport} className="h-[68vh] min-h-[560px] cursor-grab overflow-hidden lg:h-full lg:min-h-screen" onMouseDown={(e)=>setDrag({x:e.clientX,y:e.clientY,pan})} onMouseMove={(e)=>{ if(drag) setPan({x:drag.pan.x+e.clientX-drag.x,y:drag.pan.y+e.clientY-drag.y}); }} onMouseUp={()=>setDrag(null)} onMouseLeave={()=>setDrag(null)}>
        <svg viewBox="0 0 1000 900" className="h-full w-full" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin:'center' }}>
          <defs><filter id="goldGlow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="redGlow"><feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <circle cx="500" cy="450" r="390" fill="none" stroke="rgba(251,191,36,.08)"/><circle cx="500" cy="450" r="250" fill="none" stroke="rgba(251,191,36,.06)"/>{AXIS_LABELS.map((axis) => <text key={axis.label} x={axis.x} y={axis.y} textAnchor="middle" className="fill-amber-200/70 text-[18px] tracking-[.28em]" style={{fontFamily:'Cinzel'}}>{axis.label}</text>)}
          {EDGES.map((e) => { const a=NODES[e.from], b=NODES[e.to]; const on = allocated.has(e.from) && allocated.has(e.to); const bridge = isCluster(e.from) || isCluster(e.to); return <line key={`${e.from}-${e.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={on ? (bridge ? 'rgba(220,38,38,.9)' : 'rgba(251,191,36,.85)') : bridge ? 'rgba(127,29,29,.35)' : 'rgba(120,113,108,.24)'} strokeWidth={on?4:bridge?2.5:1.6}/>; })}
          {Object.values(NODES).map((node) => { const on = allocated.has(node.id), avail = remaining > 0 && canAllocate(node.id, allocated), syn = isCluster(node.id); const r = node.type === 'keystone' ? 22 : node.type === 'notable' ? 17 : node.type === 'start' ? 24 : 12; return <g key={node.id} onClick={(e)=>{e.stopPropagation();toggle(node);}} onMouseEnter={()=>setHovered(node)} onMouseLeave={()=>setHovered(null)} className="cursor-pointer"><motion.circle cx={node.x} cy={node.y} r={r+8} fill={syn?'rgba(127,29,29,.22)':'rgba(0,0,0,.35)'} stroke={on?'#fbbf24':avail?'#a16207':'#57534e'} strokeWidth={on?3:1.5} filter={on ? (syn?'url(#redGlow)':'url(#goldGlow)') : undefined} initial={false} animate={{ scale: pulseId === node.id ? 1.28 : on ? 1.06 : 1 }}/><circle cx={node.x} cy={node.y} r={r} fill={on ? (syn ? '#7f1d1d' : '#b7791f') : '#15110d'} stroke={node.type==='keystone'?'#f5d080':'#78716c'} strokeWidth="1.5"/>{(node.type !== 'minor' || on || avail) && <text x={node.x} y={node.y+r+20} textAnchor="middle" className={cn('fill-stone-500 text-[11px]', node.type === 'keystone' && 'text-[13px]', on && 'fill-amber-100')} style={{fontFamily:'Cinzel'}}>{node.label}</text>}</g>; })}
        </svg>
        <AnimatePresence>{hovered && <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="pointer-events-none absolute left-6 top-20 z-30 w-80 rounded-xl border border-amber-400/20 bg-black/80 p-4 shadow-2xl backdrop-blur"><p className="font-mono text-xs uppercase text-amber-400">{hovered.type} {hovered.axis ? `· ${hovered.axis}` : ''}</p><h3 className="mt-1 font-[Cinzel] text-xl text-amber-100">{hovered.label}</h3><p className="mt-2 text-sm text-stone-300">{hovered.desc}</p><p className="mt-3 font-mono text-xs text-stone-400">Status: {allocated.has(hovered.id)?'allocated':canAllocate(hovered.id,allocated)?'available':'locked'}</p><p className="mt-3 text-sm text-amber-100/90">{hovered.practice}</p></motion.div>}</AnimatePresence>
      </div>
    </div>
    <aside className="max-h-[60vh] overflow-auto rounded-t-3xl border-t border-amber-500/10 bg-[#0f0b10]/95 p-5 shadow-[0_-20px_60px_rgba(0,0,0,.45)] backdrop-blur lg:max-h-none lg:rounded-none lg:border-l lg:border-t-0"><div className="flex items-center justify-between gap-3"><div><p className="font-mono text-xs uppercase text-amber-500">Agent Skill Tree</p><h1 className="font-[Cinzel] text-3xl text-amber-100">Build Planner</h1></div><Sparkles className="text-red-400"/></div><div className="mt-5 grid grid-cols-3 gap-2 font-mono text-xs"><Stat label="Spent" value={spent}/><Stat label="Left" value={remaining}/><Stat label="Synergy" value={synergies.length}/></div><div className="mt-4 flex flex-wrap gap-2"><Button onClick={()=>navigator.clipboard.writeText(share)}><Copy size={15}/> Share</Button><Button onClick={()=>setBudget((b)=>b+5)}>+5 points</Button><Button onClick={saveBuild}><Save size={15}/> Save</Button>{savedId && <Button asChild><Link href={`/build/${savedId}/spec`}>Spec</Link></Button>}</div>{savedId && <p className="mt-2 font-mono text-xs text-green-300">Saved: /build/{savedId}</p>}<section className="mt-6"><h2 className="font-[Cinzel] text-xl text-amber-100">Selected</h2>{selected && <div className="mt-3 rounded-xl border border-amber-500/15 bg-black/25 p-4"><p className="font-mono text-xs uppercase text-amber-400">{selected.type}</p><h3 className="font-[Cinzel] text-2xl">{selected.label}</h3><p className="mt-2 text-sm text-stone-300">{selected.desc}</p><details open className="mt-3"><summary className="cursor-pointer text-sm text-amber-200">Practice</summary><p className="mt-2 text-sm text-stone-300">{selected.practice}</p></details></div>}</section><section className="mt-6"><h2 className="font-[Cinzel] text-xl text-amber-100">Synergies</h2><div className="mt-3 space-y-2">{synergies.map((s)=><motion.div key={s.id} initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 shadow-[0_0_24px_rgba(185,28,28,.18)]"><p className="font-[Cinzel] text-lg text-red-100">{s.name}</p><p className="text-sm text-stone-300">{s.desc}</p></motion.div>)}{!synergies.length && <p className="text-sm text-stone-500">Allocate keystone combos to reveal archetypes.</p>}</div></section><section className="mt-6"><h2 className="font-[Cinzel] text-xl text-amber-100">Allocated Practice</h2><div className="mt-3 max-h-72 space-y-3 overflow-auto pr-2">{(['keystone','notable','minor','start'] as const).map((type)=>grouped[type].length ? <div key={type}><p className="mb-1 font-mono text-xs uppercase text-stone-500">{type}</p>{grouped[type].map((id)=><details key={id} className="mb-2 rounded-lg border border-stone-800 bg-black/20 p-2" onToggle={()=>{setPulseId(id); setTimeout(()=>setPulseId(null), 650);}}><summary className="cursor-pointer text-sm text-amber-100">{NODES[id].label}</summary><p className="mt-2 text-sm text-stone-400">{NODES[id].practice}</p></details>)}</div> : null)}</div></section></aside>
  </div>;
}
function Stat({label,value}:{label:string;value:number}) { return <div className="rounded-lg border border-amber-500/10 bg-black/30 p-2"><div className="text-stone-500">{label}</div><div className="text-lg text-amber-100">{value}</div></div>; }
