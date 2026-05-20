import AgentSkillTree from '@/components/tree/AgentSkillTree';
import { getSupabaseAdmin } from '@/lib/supabase';
export default async function SavedBuildPage({ params }: { params: Promise<{ shortId: string }> }) { const { shortId } = await params; let allocated = ['birth']; const supabase = getSupabaseAdmin(); if (supabase) { const { data } = await supabase.from('builds').select('allocated').eq('short_id', shortId).single(); if (data?.allocated) allocated = data.allocated; } return <AgentSkillTree initialAllocated={allocated} shortId={shortId} />; }
