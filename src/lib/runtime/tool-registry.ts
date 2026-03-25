/**
 * Lightweight tool registry singleton.
 *
 * Provides centralized metadata lookups for tool classification,
 * replacing scattered heuristic checks (regex patterns, hardcoded maps).
 * Populated from the native tool catalog at first access and extended
 * dynamically for MCP/Composio tools at runtime.
 */

import type { CanonicalToolMeta } from "./tool-contracts";
import { NATIVE_TOOL_CATALOG } from "./tool-catalog";

class ToolRegistry {
  private byKey = new Map<string, CanonicalToolMeta>();
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized) return;
    for (const [key, meta] of NATIVE_TOOL_CATALOG) {
      this.byKey.set(key, meta);
    }
    this.initialized = true;
  }

  /** Register a dynamic tool (MCP, Composio, extension). */
  register(meta: CanonicalToolMeta): void {
    this.ensureInitialized();
    this.byKey.set(meta.toolKey, meta);
  }

  /** Look up canonical metadata by tool key. */
  get(toolKey: string): CanonicalToolMeta | undefined {
    this.ensureInitialized();
    return this.byKey.get(toolKey);
  }

  /** True if the tool is a read-only query tool. */
  isQuery(toolKey: string): boolean {
    this.ensureInitialized();
    const meta = this.byKey.get(toolKey);
    return meta?.isQuery ?? false;
  }

  /** True if the tool mutates runtime state. */
  isMutating(toolKey: string): boolean {
    this.ensureInitialized();
    const meta = this.byKey.get(toolKey);
    return meta?.isMutating ?? meta?.capabilities.writesState ?? false;
  }

  /** Returns the autonomy gate for a tool, or undefined if ungated. */
  getAutonomyGate(toolKey: string): "assisted" | "copilot" | undefined {
    this.ensureInitialized();
    const meta = this.byKey.get(toolKey);
    return meta?.autonomyGate;
  }

  /** Number of registered tools. */
  get size(): number {
    this.ensureInitialized();
    return this.byKey.size;
  }
}

export const toolRegistry = new ToolRegistry();
