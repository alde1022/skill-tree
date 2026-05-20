import { NODES, SYNERGIES, type AgentConfigContribution } from './tree-data';

export type AgentBuildSpec = {
  name: string;
  model: string;
  capabilities: string[];
  tools: string[];
  systemPrompt: string;
  buildId?: string;
  buildUrl?: string;
  allocatedSkills: string[];
  synergies: string[];
  title: string;
  intendedUse: string;
  notes: string[];
};

const merge = (base: AgentConfigContribution, add?: AgentConfigContribution) => !add ? base : ({
  model: add.model ?? base.model,
  tools: [...new Set([...(base.tools ?? []), ...(add.tools ?? [])])],
  capabilities: [...new Set([...(base.capabilities ?? []), ...(add.capabilities ?? [])])],
  systemPromptAdditions: [...new Set([...(base.systemPromptAdditions ?? []), ...(add.systemPromptAdditions ?? [])])],
  notes: [...new Set([...(base.notes ?? []), ...(add.notes ?? [])])],
});

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function base64ToBytes(value: string) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
export function encodeBuild(ids: Iterable<string>) {
  const raw = [...new Set(ids)].filter((id) => id in NODES).sort().join(',');
  return bytesToBase64(new TextEncoder().encode(raw));
}
export function decodeBuild(value?: string | null) {
  if (!value) return ['birth'];
  try {
    const raw = new TextDecoder().decode(base64ToBytes(value));
    return [...new Set(['birth', ...raw.split(',').filter((id) => id in NODES)])];
  } catch {
    return ['birth'];
  }
}
export function activeSynergies(allocated: Set<string>) { return SYNERGIES.filter((s) => s.requires.every((id) => allocated.has(id))); }
export function buildSpec(ids: string[], meta: { buildId?: string; buildUrl?: string } = {}): AgentBuildSpec {
  const allocated = new Set(['birth', ...ids.filter((id) => id in NODES)]);
  let config: AgentConfigContribution = {};
  for (const id of allocated) config = merge(config, NODES[id]?.config);
  const synergies = activeSynergies(allocated);
  for (const s of synergies) config = merge(config, s.bonus);
  const title = synergies[0]?.name ?? 'Generated agent';
  const keystones = [...allocated].filter((id) => NODES[id]?.type === 'keystone').map((id) => NODES[id].label);
  return {
    name: 'Generated agent',
    model: config.model ?? 'claude-sonnet-4',
    capabilities: config.capabilities ?? [],
    tools: config.tools ?? [],
    systemPrompt: [...(config.systemPromptAdditions ?? [])].join('\n'),
    buildId: meta.buildId,
    buildUrl: meta.buildUrl,
    allocatedSkills: [...allocated],
    synergies: synergies.map((s) => s.name),
    title: `${title}${keystones.length ? ` (${keystones.join(' + ')})` : ''}`,
    intendedUse: synergies[0]?.desc ?? 'A custom agent assembled from selected capabilities.',
    notes: config.notes ?? [],
  };
}
export function markdownSpec(spec: AgentBuildSpec) {
  const cleanTools = spec.tools.map((t) => t.replace(/^mcp:/, ''));
  return `# Your Agent\n\nBuild: ${spec.title}\n\n${spec.intendedUse}\n\nSuggested model: ${spec.model}${spec.capabilities.includes('extended_thinking') ? ' with extended thinking' : ''}\n\nTools: ${cleanTools.join(', ') || 'none'}\n\nCapabilities: ${spec.capabilities.join(', ') || 'none'}\n\nWhere to use it: ${whereToUse(spec)}\n\n## System Prompt\n\`\`\`\n${spec.systemPrompt || 'No extra system prompt additions selected.'}\n\`\`\`\n`;
}
function whereToUse(spec: AgentBuildSpec) {
  if (spec.synergies.includes('Research Analyst')) return 'document analysis, source-grounded research, technical review';
  if (spec.synergies.includes('Operations Agent')) return 'long-running workflows, monitoring, production operations';
  if (spec.synergies.includes('Defined Agent')) return 'delegated work with approval gates and stable values';
  if (spec.synergies.includes('Companion')) return 'persistent personal assistance over long timelines';
  return 'agent runtimes that need the selected capabilities and tool list';
}
