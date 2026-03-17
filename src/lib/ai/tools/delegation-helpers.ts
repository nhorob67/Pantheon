// Shared pure helpers for delegation tools.

/** Maximum nesting depth for delegation chains */
export const MAX_DELEGATION_DEPTH = 3;

export function canExposeDelegationTool(
  canDelegate: boolean | undefined,
  currentDepth: number
): boolean {
  return canDelegate === true && currentDepth < MAX_DELEGATION_DEPTH;
}

export function injectDelegationContext(
  systemPrompt: string,
  parentAgentName: string,
  task: string,
  context?: string
): string {
  return systemPrompt + `\n\n## Delegated Task

You are handling a task delegated to you by ${parentAgentName}.

**Task:** ${task}${context ? `\n\n**Additional Context:** ${context}` : ""}

Respond with the result of the task. Be thorough but concise. Do not ask clarifying questions — work with the information provided.`;
}

export function narrowChildTools<T>(
  childTools: Record<string, T>,
  parentToolKeys: Set<string> | undefined
): Record<string, T> {
  if (!parentToolKeys || parentToolKeys.size === 0) {
    return childTools;
  }

  const narrowed: Record<string, T> = {};
  for (const [name, tool] of Object.entries(childTools)) {
    if (parentToolKeys.has(name)) {
      narrowed[name] = tool;
    }
  }
  return narrowed;
}

export function adjustChildBudget<
  T extends {
    maxToolInvocations: number;
    maxTokens: number;
    maxSpendCents: number;
    maxElapsedMs: number;
  },
>(
  childConfig: T,
  parentSummary: {
    totalInvocations: number;
    totalTokens: number;
    totalSpendCents: number;
    elapsedMs: number;
  }
): T {
  return {
    ...childConfig,
    maxToolInvocations: Math.min(
      childConfig.maxToolInvocations,
      Math.max(1, childConfig.maxToolInvocations - parentSummary.totalInvocations)
    ),
    maxTokens: Math.min(
      childConfig.maxTokens,
      Math.max(1000, childConfig.maxTokens - parentSummary.totalTokens)
    ),
    maxSpendCents: Math.min(
      childConfig.maxSpendCents,
      Math.max(1, childConfig.maxSpendCents - parentSummary.totalSpendCents)
    ),
    maxElapsedMs: Math.min(
      childConfig.maxElapsedMs,
      Math.max(1000, childConfig.maxElapsedMs - parentSummary.elapsedMs)
    ),
  };
}
