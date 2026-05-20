import AgentSkillTree from '@/components/tree/AgentSkillTree';
import { decodeBuild } from '@/lib/build';
export default async function BuildPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) { const params = await searchParams; return <AgentSkillTree initialAllocated={decodeBuild(params.b)} />; }
