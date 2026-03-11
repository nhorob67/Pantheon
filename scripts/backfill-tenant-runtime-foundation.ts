/**
 * Idempotent tenant runtime foundation backfill.
 *
 * Usage:
 *   node --experimental-strip-types scripts/backfill-tenant-runtime-foundation.ts [options]
 *
 * Options:
 *   --dry-run                         Show planned changes without writing
 *   --customer-id <uuid>              Run for a single customer
 *   --limit <n>                       Limit number of customers processed
 *   --reconcile-owner-membership      Force owner membership role/status correction
 *   --refresh-legacy-instance-count   Refresh tenants.metadata.legacy_instance_count
 *   --help                            Show usage
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_TENANT_NAME = "Pantheon Tenant";
const BACKFILL_SEED_MIGRATION = "00036_tenant_runtime_foundation";
const PAGE_SIZE = 500;

interface CliOptions {
  dryRun: boolean;
  customerId: string | null;
  limit: number | null;
  reconcileOwnerMembership: boolean;
  refreshLegacyInstanceCount: boolean;
}

interface CustomerRow {
  id: string;
  user_id: string | null;
  email: string | null;
  created_at: string;
}

interface TenantRow {
  id: string;
  customer_id: string;
  slug: string;
  name: string;
  metadata: Record<string, unknown> | null;
}

interface TenantMemberRow {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  status: string;
}

interface InstanceRow {
  id: string;
  customer_id: string;
}

interface InstanceTenantMappingRow {
  id: string;
  instance_id: string;
  tenant_id: string;
  customer_id: string;
  mapping_status: string;
}

interface BackfillCounters {
  customers_processed: number;
  tenants_created: number;
  tenants_existing: number;
  tenant_metadata_refreshed: number;
  owner_memberships_inserted: number;
  owner_memberships_existing: number;
  owner_memberships_reconciled: number;
  owner_memberships_skipped_no_user: number;
  instance_mappings_inserted: number;
  instance_mappings_existing: number;
  mapping_drift_detected: number;
  errors: number;
}

function printHelp() {
  console.log(`Usage: node --experimental-strip-types scripts/backfill-tenant-runtime-foundation.ts [options]

Options:
  --dry-run                         Show planned changes without writing
  --customer-id <uuid>              Run for a single customer
  --limit <n>                       Limit number of customers processed
  --reconcile-owner-membership      Force owner membership role/status correction
  --refresh-legacy-instance-count   Refresh tenants.metadata.legacy_instance_count
  --help                            Show usage
`);
}

function parseIntegerArg(value: string, argName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${argName} must be a positive integer`);
  }
  return parsed;
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    customerId: null,
    limit: null,
    reconcileOwnerMembership: false,
    refreshLegacyInstanceCount: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--reconcile-owner-membership") {
      options.reconcileOwnerMembership = true;
      continue;
    }

    if (arg === "--refresh-legacy-instance-count") {
      options.refreshLegacyInstanceCount = true;
      continue;
    }

    if (arg === "--customer-id") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for --customer-id");
      }
      options.customerId = nextValue;
      index += 1;
      continue;
    }

    if (arg.startsWith("--customer-id=")) {
      const [, value] = arg.split("=", 2);
      options.customerId = value || null;
      continue;
    }

    if (arg === "--limit") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for --limit");
      }
      options.limit = parseIntegerArg(nextValue, "--limit");
      index += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const [, value] = arg.split("=", 2);
      if (!value) {
        throw new Error("Missing value for --limit");
      }
      options.limit = parseIntegerArg(value, "--limit");
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (name === "NEXT_PUBLIC_SUPABASE_URL" && value.includes("your-project.supabase.co")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is still set to placeholder value 'https://your-project.supabase.co'"
    );
  }
  if (
    name === "SUPABASE_SERVICE_ROLE_KEY" &&
    (value.includes("your-service-role-key") || value === "your-service-role-key")
  ) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is still set to a placeholder value");
  }
  return value;
}

function createAdminClientFromEnv(): SupabaseClient {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function toTenantSlug(customerId: string): string {
  return `tenant-${customerId.replace(/-/g, "").slice(0, 12)}`;
}

function toTenantName(farmName: string | null, email: string | null): string {
  const normalizedFarmName = typeof farmName === "string" ? farmName.trim() : "";
  if (normalizedFarmName.length > 0) {
    return normalizedFarmName.slice(0, 120);
  }

  const emailLocalPart =
    typeof email === "string" && email.includes("@")
      ? email.split("@")[0].trim()
      : "";
  if (emailLocalPart.length > 0) {
    return emailLocalPart.slice(0, 120);
  }

  return DEFAULT_TENANT_NAME;
}

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function chunkValues<T>(values: T[], chunkSize: number): T[][] {
  if (values.length === 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

async function fetchCustomers(
  admin: SupabaseClient,
  options: CliOptions
): Promise<CustomerRow[]> {
  let query = admin
    .from("customers")
    .select("id, user_id, email, created_at")
    .order("created_at", { ascending: true });

  if (options.customerId) {
    query = query.eq("id", options.customerId);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load customers: ${error.message}`);
  }

  return (data || []) as CustomerRow[];
}

async function fetchFarmNameForCustomer(
  admin: SupabaseClient,
  customerId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("farm_profiles")
    .select("farm_name, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`Failed to load farm profile for customer ${customerId}: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  const farmName = data[0]?.farm_name;
  return typeof farmName === "string" ? farmName : null;
}

async function listInstancesForCustomer(
  admin: SupabaseClient,
  customerId: string
): Promise<InstanceRow[]> {
  const instances: InstanceRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from("instances")
      .select("id, customer_id, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load instances for customer ${customerId}: ${error.message}`);
    }

    const page = ((data || []) as Array<InstanceRow & { created_at: string }>).map(
      ({ id, customer_id }) => ({
        id,
        customer_id,
      })
    );
    instances.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return instances;
}

async function fetchTenantForCustomer(
  admin: SupabaseClient,
  customerId: string
): Promise<TenantRow | null> {
  const { data, error } = await admin
    .from("tenants")
    .select("id, customer_id, slug, name, metadata")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load tenant for customer ${customerId}: ${error.message}`);
  }

  return (data as TenantRow | null) ?? null;
}

async function createTenantForCustomer(
  admin: SupabaseClient,
  customer: CustomerRow,
  farmName: string | null,
  legacyInstanceCount: number,
  dryRun: boolean
): Promise<{ tenant: TenantRow | null; created: boolean }> {
  if (dryRun) {
    const simulatedTenant: TenantRow = {
      id: `dry-run-${customer.id}`,
      customer_id: customer.id,
      slug: toTenantSlug(customer.id),
      name: toTenantName(farmName, customer.email),
      metadata: {
        seed_migration: BACKFILL_SEED_MIGRATION,
        legacy_instance_count: legacyInstanceCount,
      },
    };
    return { tenant: simulatedTenant, created: true };
  }

  const { data, error } = await admin
    .from("tenants")
    .insert({
      customer_id: customer.id,
      slug: toTenantSlug(customer.id),
      name: toTenantName(farmName, customer.email),
      metadata: {
        seed_migration: BACKFILL_SEED_MIGRATION,
        legacy_instance_count: legacyInstanceCount,
      },
    })
    .select("id, customer_id, slug, name, metadata")
    .single();

  if (error) {
    throw new Error(`Failed to create tenant for customer ${customer.id}: ${error.message}`);
  }

  return { tenant: data as TenantRow, created: true };
}

async function refreshTenantMetadata(
  admin: SupabaseClient,
  tenant: TenantRow,
  legacyInstanceCount: number,
  dryRun: boolean
): Promise<boolean> {
  const currentMetadata = toObject(tenant.metadata);
  const nextMetadata: Record<string, unknown> = {
    ...currentMetadata,
    legacy_instance_count: legacyInstanceCount,
  };

  if (typeof nextMetadata.seed_migration !== "string") {
    nextMetadata.seed_migration = BACKFILL_SEED_MIGRATION;
  }

  const currentCount = currentMetadata.legacy_instance_count;
  const seedMigration = currentMetadata.seed_migration;
  const hasSameCount = currentCount === legacyInstanceCount;
  const hasSeedMigration = typeof seedMigration === "string" && seedMigration.length > 0;
  if (hasSameCount && hasSeedMigration) {
    return false;
  }

  if (dryRun) {
    return true;
  }

  const { error } = await admin
    .from("tenants")
    .update({ metadata: nextMetadata })
    .eq("id", tenant.id);

  if (error) {
    throw new Error(`Failed to refresh metadata for tenant ${tenant.id}: ${error.message}`);
  }

  return true;
}

async function fetchTenantMember(
  admin: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<TenantMemberRow | null> {
  const { data, error } = await admin
    .from("tenant_members")
    .select("id, tenant_id, user_id, role, status")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load tenant membership for tenant ${tenantId}: ${error.message}`);
  }

  return (data as TenantMemberRow | null) ?? null;
}

async function ensureOwnerMembership(
  admin: SupabaseClient,
  tenantId: string,
  userId: string,
  dryRun: boolean
): Promise<"inserted" | "existing" | "reconciled"> {
  const existingMembership = await fetchTenantMember(admin, tenantId, userId);

  if (!existingMembership) {
    if (!dryRun) {
      const { error } = await admin.from("tenant_members").insert({
        tenant_id: tenantId,
        user_id: userId,
        role: "owner",
        status: "active",
        invited_by: userId,
      });

      if (error) {
        throw new Error(
          `Failed to insert owner membership for tenant ${tenantId}: ${error.message}`
        );
      }
    }

    return "inserted";
  }

  return "existing";
}

async function reconcileOwnerMembership(
  admin: SupabaseClient,
  membership: TenantMemberRow,
  dryRun: boolean
): Promise<boolean> {
  if (membership.role === "owner" && membership.status === "active") {
    return false;
  }

  if (dryRun) {
    return true;
  }

  const { error } = await admin
    .from("tenant_members")
    .update({
      role: "owner",
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", membership.id);

  if (error) {
    throw new Error(
      `Failed to reconcile owner membership ${membership.id}: ${error.message}`
    );
  }

  return true;
}

async function fetchMappingsForInstances(
  admin: SupabaseClient,
  instanceIds: string[]
): Promise<Map<string, InstanceTenantMappingRow>> {
  const mappingsByInstance = new Map<string, InstanceTenantMappingRow>();

  for (const chunk of chunkValues(instanceIds, 200)) {
    const { data, error } = await admin
      .from("instance_tenant_mappings")
      .select("id, instance_id, tenant_id, customer_id, mapping_status")
      .in("instance_id", chunk);

    if (error) {
      throw new Error(`Failed to load instance mappings: ${error.message}`);
    }

    for (const row of (data || []) as InstanceTenantMappingRow[]) {
      mappingsByInstance.set(row.instance_id, row);
    }
  }

  return mappingsByInstance;
}

async function insertInstanceMapping(
  admin: SupabaseClient,
  instance: InstanceRow,
  tenantId: string,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    return;
  }

  const { error } = await admin.from("instance_tenant_mappings").insert({
    instance_id: instance.id,
    tenant_id: tenantId,
    customer_id: instance.customer_id,
    mapping_source: "backfill",
    mapping_status: "active",
  });

  if (error) {
    throw new Error(
      `Failed to insert instance mapping for instance ${instance.id}: ${error.message}`
    );
  }
}

function createEmptyCounters(): BackfillCounters {
  return {
    customers_processed: 0,
    tenants_created: 0,
    tenants_existing: 0,
    tenant_metadata_refreshed: 0,
    owner_memberships_inserted: 0,
    owner_memberships_existing: 0,
    owner_memberships_reconciled: 0,
    owner_memberships_skipped_no_user: 0,
    instance_mappings_inserted: 0,
    instance_mappings_existing: 0,
    mapping_drift_detected: 0,
    errors: 0,
  };
}

async function processCustomer(
  admin: SupabaseClient,
  customer: CustomerRow,
  options: CliOptions,
  counters: BackfillCounters
) {
  counters.customers_processed += 1;
  const mode = options.dryRun ? "dry-run" : "write";
  console.log(`\n[${mode}] Processing customer ${customer.id}`);

  const instances = await listInstancesForCustomer(admin, customer.id);
  const legacyInstanceCount = instances.length;

  let tenant = await fetchTenantForCustomer(admin, customer.id);
  if (!tenant) {
    const farmName = await fetchFarmNameForCustomer(admin, customer.id);
    const created = await createTenantForCustomer(
      admin,
      customer,
      farmName,
      legacyInstanceCount,
      options.dryRun
    );
    if (!created.tenant) {
      throw new Error(`Unable to resolve tenant after creation for customer ${customer.id}`);
    }
    tenant = created.tenant;
    counters.tenants_created += 1;
    console.log(`Created tenant ${tenant.id}`);
  } else {
    counters.tenants_existing += 1;
  }

  if (options.refreshLegacyInstanceCount) {
    const refreshed = await refreshTenantMetadata(
      admin,
      tenant,
      legacyInstanceCount,
      options.dryRun
    );
    if (refreshed) {
      counters.tenant_metadata_refreshed += 1;
      console.log(`Refreshed metadata for tenant ${tenant.id}`);
    }
  }

  if (!customer.user_id) {
    counters.owner_memberships_skipped_no_user += 1;
  } else {
    const ownerResult = await ensureOwnerMembership(
      admin,
      tenant.id,
      customer.user_id,
      options.dryRun
    );

    if (ownerResult === "inserted") {
      counters.owner_memberships_inserted += 1;
    } else {
      counters.owner_memberships_existing += 1;
      if (options.reconcileOwnerMembership) {
        const membership = await fetchTenantMember(admin, tenant.id, customer.user_id);
        if (!membership) {
          throw new Error(
            `Membership unexpectedly missing during reconciliation for tenant ${tenant.id}`
          );
        }
        const reconciled = await reconcileOwnerMembership(admin, membership, options.dryRun);
        if (reconciled) {
          counters.owner_memberships_reconciled += 1;
          console.log(`Reconciled owner membership ${membership.id}`);
        }
      }
    }
  }

  if (instances.length === 0) {
    return;
  }

  const mappingLookup = await fetchMappingsForInstances(
    admin,
    instances.map((instance) => instance.id)
  );

  for (const instance of instances) {
    const existingMapping = mappingLookup.get(instance.id);

    if (!existingMapping) {
      await insertInstanceMapping(admin, instance, tenant.id, options.dryRun);
      counters.instance_mappings_inserted += 1;
      continue;
    }

    counters.instance_mappings_existing += 1;
    if (
      existingMapping.customer_id !== customer.id ||
      existingMapping.tenant_id !== tenant.id ||
      existingMapping.mapping_status !== "active"
    ) {
      counters.mapping_drift_detected += 1;
      console.warn(
        `Mapping drift detected for instance ${instance.id}: mapping tenant=${existingMapping.tenant_id}, customer=${existingMapping.customer_id}, status=${existingMapping.mapping_status}, expected tenant=${tenant.id}, expected customer=${customer.id}`
      );
    }
  }
}

function printSummary(counters: BackfillCounters, options: CliOptions) {
  console.log("\nBackfill summary");
  console.log("================");
  console.log(`Mode: ${options.dryRun ? "dry-run" : "write"}`);
  console.log(`Customers processed: ${counters.customers_processed}`);
  console.log(`Tenants created: ${counters.tenants_created}`);
  console.log(`Tenants already present: ${counters.tenants_existing}`);
  console.log(`Tenant metadata refreshed: ${counters.tenant_metadata_refreshed}`);
  console.log(`Owner memberships inserted: ${counters.owner_memberships_inserted}`);
  console.log(`Owner memberships existing: ${counters.owner_memberships_existing}`);
  console.log(
    `Owner memberships reconciled: ${counters.owner_memberships_reconciled}`
  );
  console.log(
    `Owner memberships skipped (customer without user_id): ${counters.owner_memberships_skipped_no_user}`
  );
  console.log(`Instance mappings inserted: ${counters.instance_mappings_inserted}`);
  console.log(`Instance mappings existing: ${counters.instance_mappings_existing}`);
  console.log(`Mapping drift detected: ${counters.mapping_drift_detected}`);
  console.log(`Errors: ${counters.errors}`);
}

async function main() {
  let options: CliOptions;

  try {
    options = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid arguments");
    printHelp();
    process.exit(1);
    return;
  }

  let admin: SupabaseClient;
  try {
    admin = createAdminClientFromEnv();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Missing environment setup");
    process.exit(1);
    return;
  }

  const counters = createEmptyCounters();

  try {
    const customers = await fetchCustomers(admin, options);
    if (customers.length === 0) {
      console.log("No customers matched the requested filters.");
      return;
    }

    for (const customer of customers) {
      try {
        await processCustomer(admin, customer, options, counters);
      } catch (error) {
        counters.errors += 1;
        const message =
          error instanceof Error ? error.message : "Unexpected customer processing error";
        console.error(`Failed processing customer ${customer.id}: ${message}`);
      }
    }
  } finally {
    printSummary(counters, options);
  }

  if (counters.errors > 0) {
    process.exit(1);
  }
}

void main();
