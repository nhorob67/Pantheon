/**
 * Verification checks for tenant runtime foundation backfill integrity.
 *
 * Usage:
 *   node --experimental-strip-types scripts/verify-tenant-runtime-backfill.ts [options]
 *
 * Options:
 *   --customer-id <uuid>    Verify a single customer
 *   --limit <n>             Limit number of customers evaluated
 *   --sample <n>            Sample rows printed per finding type (default: 10)
 *   --help                  Show usage
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 500;
const DEFAULT_SAMPLE_SIZE = 10;

interface CliOptions {
  customerId: string | null;
  limit: number | null;
  sampleSize: number;
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
}

interface TenantMemberRow {
  id: string;
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
}

interface MissingTenantFinding {
  customer_id: string;
  email: string | null;
}

interface MissingOwnerFinding {
  customer_id: string;
  tenant_id: string;
  user_id: string;
  reason: string;
}

interface UnmappedInstanceFinding {
  customer_id: string;
  tenant_id: string;
  instance_id: string;
}

interface MappingCustomerMismatchFinding {
  mapping_id: string;
  instance_id: string;
  tenant_id: string;
  mapping_customer_id: string;
  tenant_customer_id: string;
}

interface OrphanMappingFinding {
  mapping_id: string;
  instance_id: string;
  tenant_id: string;
  mapping_customer_id: string;
}

interface MappingTenantMismatchFinding {
  customer_id: string;
  expected_tenant_id: string;
  instance_id: string;
  mapping_id: string;
  mapping_tenant_id: string;
}

interface VerificationFindings {
  missingTenantCustomers: MissingTenantFinding[];
  missingOwnerMemberships: MissingOwnerFinding[];
  unmappedInstances: UnmappedInstanceFinding[];
  mappingCustomerMismatches: MappingCustomerMismatchFinding[];
  orphanMappings: OrphanMappingFinding[];
  mappingTenantMismatches: MappingTenantMismatchFinding[];
}

function printHelp() {
  console.log(`Usage: node --experimental-strip-types scripts/verify-tenant-runtime-backfill.ts [options]

Options:
  --customer-id <uuid>    Verify a single customer
  --limit <n>             Limit number of customers evaluated
  --sample <n>            Sample rows printed per finding type (default: 10)
  --help                  Show usage
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
    customerId: null,
    limit: null,
    sampleSize: DEFAULT_SAMPLE_SIZE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
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

    if (arg === "--sample") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for --sample");
      }
      options.sampleSize = parseIntegerArg(nextValue, "--sample");
      index += 1;
      continue;
    }

    if (arg.startsWith("--sample=")) {
      const [, value] = arg.split("=", 2);
      if (!value) {
        throw new Error("Missing value for --sample");
      }
      options.sampleSize = parseIntegerArg(value, "--sample");
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

async function fetchTenantForCustomer(
  admin: SupabaseClient,
  customerId: string
): Promise<TenantRow | null> {
  const { data, error } = await admin
    .from("tenants")
    .select("id, customer_id")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load tenant for customer ${customerId}: ${error.message}`);
  }

  return (data as TenantRow | null) ?? null;
}

async function fetchOwnerMembership(
  admin: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<TenantMemberRow | null> {
  const { data, error } = await admin
    .from("tenant_members")
    .select("id, role, status")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load tenant membership for tenant ${tenantId}: ${error.message}`);
  }

  return (data as TenantMemberRow | null) ?? null;
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

async function listMappingsForCustomer(
  admin: SupabaseClient,
  customerId: string
): Promise<InstanceTenantMappingRow[]> {
  const mappings: InstanceTenantMappingRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from("instance_tenant_mappings")
      .select("id, instance_id, tenant_id, customer_id, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load instance mappings for customer ${customerId}: ${error.message}`);
    }

    const page = ((data || []) as Array<InstanceTenantMappingRow & { created_at: string }>).map(
      ({ id, instance_id, tenant_id, customer_id }) => ({
        id,
        instance_id,
        tenant_id,
        customer_id,
      })
    );
    mappings.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return mappings;
}

async function fetchTenantById(
  admin: SupabaseClient,
  tenantId: string
): Promise<TenantRow | null> {
  const { data, error } = await admin
    .from("tenants")
    .select("id, customer_id")
    .eq("id", tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load tenant ${tenantId}: ${error.message}`);
  }

  return (data as TenantRow | null) ?? null;
}

function printFindingBlock<T>(
  title: string,
  findings: T[],
  sampleSize: number
) {
  console.log(`\n${title}: ${findings.length}`);
  if (findings.length === 0) {
    return;
  }

  const sample = findings.slice(0, sampleSize);
  console.log(`Sample (${sample.length}):`);
  console.log(JSON.stringify(sample, null, 2));
}

function createFindings(): VerificationFindings {
  return {
    missingTenantCustomers: [],
    missingOwnerMemberships: [],
    unmappedInstances: [],
    mappingCustomerMismatches: [],
    orphanMappings: [],
    mappingTenantMismatches: [],
  };
}

async function runVerification(
  admin: SupabaseClient,
  customers: CustomerRow[],
  findings: VerificationFindings
) {
  const tenantCustomerIdCache = new Map<string, string | null>();

  for (const customer of customers) {
    const tenant = await fetchTenantForCustomer(admin, customer.id);
    if (!tenant) {
      findings.missingTenantCustomers.push({
        customer_id: customer.id,
        email: customer.email,
      });
      continue;
    }

    if (customer.user_id) {
      const ownerMembership = await fetchOwnerMembership(admin, tenant.id, customer.user_id);
      if (!ownerMembership) {
        findings.missingOwnerMemberships.push({
          customer_id: customer.id,
          tenant_id: tenant.id,
          user_id: customer.user_id,
          reason: "missing_membership",
        });
      } else if (ownerMembership.role !== "owner" || ownerMembership.status !== "active") {
        findings.missingOwnerMemberships.push({
          customer_id: customer.id,
          tenant_id: tenant.id,
          user_id: customer.user_id,
          reason: `unexpected_role_or_status(role=${ownerMembership.role}, status=${ownerMembership.status})`,
        });
      }
    }

    const instances = await listInstancesForCustomer(admin, customer.id);
    const mappings = await listMappingsForCustomer(admin, customer.id);
    const mappingByInstanceId = new Map<string, InstanceTenantMappingRow>();

    for (const mapping of mappings) {
      mappingByInstanceId.set(mapping.instance_id, mapping);

      let tenantCustomerId = tenantCustomerIdCache.get(mapping.tenant_id);
      if (tenantCustomerId === undefined) {
        const mappingTenant = await fetchTenantById(admin, mapping.tenant_id);
        tenantCustomerId = mappingTenant?.customer_id ?? null;
        tenantCustomerIdCache.set(mapping.tenant_id, tenantCustomerId);
      }

      if (!tenantCustomerId) {
        findings.orphanMappings.push({
          mapping_id: mapping.id,
          instance_id: mapping.instance_id,
          tenant_id: mapping.tenant_id,
          mapping_customer_id: mapping.customer_id,
        });
      } else if (tenantCustomerId !== mapping.customer_id) {
        findings.mappingCustomerMismatches.push({
          mapping_id: mapping.id,
          instance_id: mapping.instance_id,
          tenant_id: mapping.tenant_id,
          mapping_customer_id: mapping.customer_id,
          tenant_customer_id: tenantCustomerId,
        });
      }
    }

    for (const instance of instances) {
      const mapping = mappingByInstanceId.get(instance.id);
      if (!mapping) {
        findings.unmappedInstances.push({
          customer_id: customer.id,
          tenant_id: tenant.id,
          instance_id: instance.id,
        });
        continue;
      }

      if (mapping.tenant_id !== tenant.id) {
        findings.mappingTenantMismatches.push({
          customer_id: customer.id,
          expected_tenant_id: tenant.id,
          instance_id: instance.id,
          mapping_id: mapping.id,
          mapping_tenant_id: mapping.tenant_id,
        });
      }
    }
  }
}

function totalFindings(findings: VerificationFindings): number {
  return (
    findings.missingTenantCustomers.length +
    findings.missingOwnerMemberships.length +
    findings.unmappedInstances.length +
    findings.mappingCustomerMismatches.length +
    findings.orphanMappings.length +
    findings.mappingTenantMismatches.length
  );
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

  const customers = await fetchCustomers(admin, options);
  if (customers.length === 0) {
    console.log("No customers matched the requested filters.");
    return;
  }

  const findings = createFindings();
  await runVerification(admin, customers, findings);

  console.log("\nTenant runtime backfill verification");
  console.log("==================================");
  console.log(`Customers evaluated: ${customers.length}`);
  printFindingBlock(
    "Customers missing tenant",
    findings.missingTenantCustomers,
    options.sampleSize
  );
  printFindingBlock(
    "Tenants missing expected owner membership",
    findings.missingOwnerMemberships,
    options.sampleSize
  );
  printFindingBlock("Instances missing mapping", findings.unmappedInstances, options.sampleSize);
  printFindingBlock(
    "Mappings with customer mismatch (mapping.customer_id != tenant.customer_id)",
    findings.mappingCustomerMismatches,
    options.sampleSize
  );
  printFindingBlock(
    "Orphan mappings (mapping tenant missing)",
    findings.orphanMappings,
    options.sampleSize
  );
  printFindingBlock(
    "Mappings pointing at unexpected tenant for customer",
    findings.mappingTenantMismatches,
    options.sampleSize
  );

  const findingCount = totalFindings(findings);
  console.log(`\nTotal findings: ${findingCount}`);

  if (findingCount > 0) {
    process.exit(1);
  }
}

void main();
