export interface DelegationTreeNode {
  id: string;
  parent_run_id: string | null;
  run_kind: string;
  status: string;
  delegation_kind: string | null;
  delegation_depth: number;
  target_agent_name: string | null;
  created_at: string;
  completed_at: string | null;
  latency_ms: number | null;
  children: DelegationTreeNode[];
}

export function readMetadataNumber(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): number {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function isChildBudgetAccountedToParent(
  metadata: Record<string, unknown> | null | undefined,
  parentRunId: string | null | undefined
): boolean {
  if (!parentRunId) {
    return false;
  }

  return metadata?.budget_accounted_to_parent_run_id === parentRunId;
}

export function buildDelegationTree(
  rows: Omit<DelegationTreeNode, "children">[],
  rootParentRunId: string
): DelegationTreeNode[] {
  const nodeMap = new Map<string, DelegationTreeNode>();
  const childrenByParent = new Map<string, DelegationTreeNode[]>();

  for (const row of rows) {
    nodeMap.set(row.id, { ...row, children: [] });
  }

  for (const node of nodeMap.values()) {
    const parentId = node.parent_run_id;
    if (!parentId) {
      continue;
    }

    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(parentId, siblings);
  }

  for (const node of nodeMap.values()) {
    node.children = childrenByParent.get(node.id) ?? [];
    node.children.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const roots = childrenByParent.get(rootParentRunId) ?? [];
  return roots.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function countDelegationTreeNodes(nodes: ReadonlyArray<DelegationTreeNode>): number {
  let count = 0;

  for (const node of nodes) {
    count += 1;
    count += countDelegationTreeNodes(node.children);
  }

  return count;
}
