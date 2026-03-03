/**
 * Validation checks for customer/billing linkage integrity.
 *
 * Usage:
 *   node --experimental-strip-types scripts/verify-customer-billing-linkage.ts [options]
 *
 * Options:
 *   --customer-id <uuid>    Validate a single customer
 *   --limit <n>             Limit number of customers evaluated
 *   --sample <n>            Sample rows printed per finding type (default: 10)
 *   --help                  Show usage
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SAMPLE_SIZE = 10;
const CUSTOMER_PAGE_SIZE = 500;
const IN_CLAUSE_CHUNK_SIZE = 200;

interface CliOptions {
  customerId: string | null;
  limit: number | null;
  sampleSize: number;
}

interface CustomerRow {
  id: string;
  user_id: string | null;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  plan: string | null;
  created_at: string;
}

interface TenantRow {
  id: string;
  customer_id: string;
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

interface ValidationFindings {
  errors: {
    duplicateStripeCustomerIds: Array<{
      stripe_customer_id: string;
      customer_ids: string[];
    }>;
    duplicateStripeSubscriptionIds: Array<{
      stripe_subscription_id: string;
      customer_ids: string[];
    }>;
    subscriptionMissingStripeCustomerId: Array<{
      customer_id: string;
      stripe_subscription_id: string;
    }>;
    activePastDueMissingStripeSubscriptionId: Array<{
      customer_id: string;
      subscription_status: string | null;
      stripe_customer_id: string | null;
    }>;
    activePastDueMissingStripeCustomerId: Array<{
      customer_id: string;
      subscription_status: string | null;
      stripe_subscription_id: string | null;
    }>;
    billedCustomerWithoutTenant: Array<{
      customer_id: string;
      email: string | null;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      subscription_status: string | null;
      plan: string | null;
    }>;
    customerWithMultipleTenants: Array<{
      customer_id: string;
      tenant_ids: string[];
    }>;
    instanceMissingTenantMapping: Array<{
      customer_id: string;
      instance_id: string;
    }>;
    duplicateInstanceMappings: Array<{
      customer_id: string;
      instance_id: string;
      mapping_ids: string[];
    }>;
    mappingOrphanInstance: Array<{
      mapping_id: string;
      customer_id: string;
      instance_id: string;
    }>;
    mappingOrphanTenant: Array<{
      mapping_id: string;
      customer_id: string;
      tenant_id: string;
    }>;
    mappingInstanceCustomerMismatch: Array<{
      mapping_id: string;
      mapping_customer_id: string;
      instance_id: string;
      instance_customer_id: string;
    }>;
    mappingTenantCustomerMismatch: Array<{
      mapping_id: string;
      mapping_customer_id: string;
      tenant_id: string;
      tenant_customer_id: string;
    }>;
    mappingUnexpectedTenantForCustomer: Array<{
      mapping_id: string;
      customer_id: string;
      tenant_id: string;
      expected_tenant_ids: string[];
    }>;
  };
  warnings: {
    customerWithoutTenant: Array<{
      customer_id: string;
      email: string | null;
    }>;
    billedCustomerWithoutUserLink: Array<{
      customer_id: string;
      email: string | null;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      subscription_status: string | null;
    }>;
  };
}

function printHelp() {
  console.log(`Usage: node --experimental-strip-types scripts/verify-customer-billing-linkage.ts [options]

Options:
  --customer-id <uuid>    Validate a single customer
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

function normalizeText(value: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function isBillingAnchoredCustomer(customer: CustomerRow): boolean {
  const stripeCustomerId = normalizeText(customer.stripe_customer_id);
  const stripeSubscriptionId = normalizeText(customer.stripe_subscription_id);
  return Boolean(stripeCustomerId || stripeSubscriptionId);
}

function isActivePaidStatus(status: string | null): boolean {
  return status === "active" || status === "past_due";
}

function pushMapArray<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
    return;
  }
  map.set(key, [value]);
}

async function fetchCustomers(
  admin: SupabaseClient,
  options: CliOptions
): Promise<CustomerRow[]> {
  const customers: CustomerRow[] = [];
  let from = 0;
  const maxRows = options.limit ?? Number.POSITIVE_INFINITY;

  while (customers.length < maxRows) {
    let query = admin
      .from("customers")
      .select(
        "id, user_id, email, stripe_customer_id, stripe_subscription_id, subscription_status, plan, created_at"
      )
      .order("created_at", { ascending: true })
      .range(from, from + CUSTOMER_PAGE_SIZE - 1);

    if (options.customerId) {
      query = query.eq("id", options.customerId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load customers: ${error.message}`);
    }

    const page = (data || []) as CustomerRow[];
    if (page.length === 0) {
      break;
    }

    customers.push(...page);
    if (page.length < CUSTOMER_PAGE_SIZE) {
      break;
    }

    from += CUSTOMER_PAGE_SIZE;
  }

  if (Number.isFinite(maxRows) && customers.length > maxRows) {
    return customers.slice(0, maxRows);
  }

  return customers;
}

async function fetchTenantsByCustomerIds(
  admin: SupabaseClient,
  customerIds: string[]
): Promise<TenantRow[]> {
  const results: TenantRow[] = [];
  for (const chunk of chunkValues(customerIds, IN_CLAUSE_CHUNK_SIZE)) {
    const { data, error } = await admin
      .from("tenants")
      .select("id, customer_id")
      .in("customer_id", chunk);
    if (error) {
      throw new Error(`Failed to load tenants: ${error.message}`);
    }
    results.push(...((data || []) as TenantRow[]));
  }
  return results;
}

async function fetchTenantsByIds(
  admin: SupabaseClient,
  tenantIds: string[]
): Promise<TenantRow[]> {
  const results: TenantRow[] = [];
  for (const chunk of chunkValues(tenantIds, IN_CLAUSE_CHUNK_SIZE)) {
    const { data, error } = await admin
      .from("tenants")
      .select("id, customer_id")
      .in("id", chunk);
    if (error) {
      throw new Error(`Failed to load referenced tenants: ${error.message}`);
    }
    results.push(...((data || []) as TenantRow[]));
  }
  return results;
}

async function fetchInstancesByCustomerIds(
  admin: SupabaseClient,
  customerIds: string[]
): Promise<InstanceRow[]> {
  const results: InstanceRow[] = [];
  for (const chunk of chunkValues(customerIds, IN_CLAUSE_CHUNK_SIZE)) {
    const { data, error } = await admin
      .from("instances")
      .select("id, customer_id")
      .in("customer_id", chunk);
    if (error) {
      throw new Error(`Failed to load instances: ${error.message}`);
    }
    results.push(...((data || []) as InstanceRow[]));
  }
  return results;
}

async function fetchInstancesByIds(
  admin: SupabaseClient,
  instanceIds: string[]
): Promise<InstanceRow[]> {
  const results: InstanceRow[] = [];
  for (const chunk of chunkValues(instanceIds, IN_CLAUSE_CHUNK_SIZE)) {
    const { data, error } = await admin
      .from("instances")
      .select("id, customer_id")
      .in("id", chunk);
    if (error) {
      throw new Error(`Failed to load referenced instances: ${error.message}`);
    }
    results.push(...((data || []) as InstanceRow[]));
  }
  return results;
}

async function fetchMappingsByCustomerIds(
  admin: SupabaseClient,
  customerIds: string[]
): Promise<InstanceTenantMappingRow[]> {
  const results: InstanceTenantMappingRow[] = [];
  for (const chunk of chunkValues(customerIds, IN_CLAUSE_CHUNK_SIZE)) {
    const { data, error } = await admin
      .from("instance_tenant_mappings")
      .select("id, instance_id, tenant_id, customer_id")
      .in("customer_id", chunk);
    if (error) {
      throw new Error(`Failed to load instance_tenant_mappings: ${error.message}`);
    }
    results.push(...((data || []) as InstanceTenantMappingRow[]));
  }
  return results;
}

function createFindings(): ValidationFindings {
  return {
    errors: {
      duplicateStripeCustomerIds: [],
      duplicateStripeSubscriptionIds: [],
      subscriptionMissingStripeCustomerId: [],
      activePastDueMissingStripeSubscriptionId: [],
      activePastDueMissingStripeCustomerId: [],
      billedCustomerWithoutTenant: [],
      customerWithMultipleTenants: [],
      instanceMissingTenantMapping: [],
      duplicateInstanceMappings: [],
      mappingOrphanInstance: [],
      mappingOrphanTenant: [],
      mappingInstanceCustomerMismatch: [],
      mappingTenantCustomerMismatch: [],
      mappingUnexpectedTenantForCustomer: [],
    },
    warnings: {
      customerWithoutTenant: [],
      billedCustomerWithoutUserLink: [],
    },
  };
}

function countEntries(record: Record<string, unknown[]>): number {
  return Object.values(record).reduce((sum, value) => sum + value.length, 0);
}

function printFindingBlock<T>(title: string, findings: T[], sampleSize: number) {
  console.log(`\n${title}: ${findings.length}`);
  if (findings.length === 0) {
    return;
  }
  const sample = findings.slice(0, sampleSize);
  console.log(`Sample (${sample.length}):`);
  console.log(JSON.stringify(sample, null, 2));
}

async function runValidation(admin: SupabaseClient, options: CliOptions) {
  const findings = createFindings();
  const customers = await fetchCustomers(admin, options);
  const customerIds = customers.map((customer) => customer.id);

  if (customerIds.length === 0) {
    console.log("No customers matched the requested scope.");
    return {
      customers,
      findings,
      summary: {
        customers_evaluated: 0,
        tenants_evaluated: 0,
        instances_evaluated: 0,
        mappings_evaluated: 0,
        error_count: 0,
        warning_count: 0,
        passed: true,
      },
    };
  }

  const [tenants, instances, mappings] = await Promise.all([
    fetchTenantsByCustomerIds(admin, customerIds),
    fetchInstancesByCustomerIds(admin, customerIds),
    fetchMappingsByCustomerIds(admin, customerIds),
  ]);

  const tenantIdsReferenced = Array.from(
    new Set(mappings.map((mapping) => mapping.tenant_id))
  );
  const instanceIdsReferenced = Array.from(
    new Set(mappings.map((mapping) => mapping.instance_id))
  );

  const [referencedTenants, referencedInstances] = await Promise.all([
    fetchTenantsByIds(admin, tenantIdsReferenced),
    fetchInstancesByIds(admin, instanceIdsReferenced),
  ]);

  const tenantsByCustomer = new Map<string, TenantRow[]>();
  const instancesByCustomer = new Map<string, InstanceRow[]>();
  const mappingsByCustomer = new Map<string, InstanceTenantMappingRow[]>();
  const tenantById = new Map<string, TenantRow>();
  const instanceById = new Map<string, InstanceRow>();

  for (const tenant of [...tenants, ...referencedTenants]) {
    tenantById.set(tenant.id, tenant);
  }
  for (const instance of [...instances, ...referencedInstances]) {
    instanceById.set(instance.id, instance);
  }
  for (const tenant of tenants) {
    pushMapArray(tenantsByCustomer, tenant.customer_id, tenant);
  }
  for (const instance of instances) {
    pushMapArray(instancesByCustomer, instance.customer_id, instance);
  }
  for (const mapping of mappings) {
    pushMapArray(mappingsByCustomer, mapping.customer_id, mapping);
  }

  const stripeCustomerIdToCustomers = new Map<string, string[]>();
  const stripeSubscriptionIdToCustomers = new Map<string, string[]>();

  for (const customer of customers) {
    const stripeCustomerId = normalizeText(customer.stripe_customer_id);
    const stripeSubscriptionId = normalizeText(customer.stripe_subscription_id);
    const subscriptionStatus = normalizeText(customer.subscription_status);
    const customerTenants = tenantsByCustomer.get(customer.id) || [];

    if (stripeCustomerId) {
      pushMapArray(stripeCustomerIdToCustomers, stripeCustomerId, customer.id);
    }
    if (stripeSubscriptionId) {
      pushMapArray(stripeSubscriptionIdToCustomers, stripeSubscriptionId, customer.id);
    }

    if (customerTenants.length === 0) {
      findings.warnings.customerWithoutTenant.push({
        customer_id: customer.id,
        email: customer.email,
      });
    }

    if (customerTenants.length > 1) {
      findings.errors.customerWithMultipleTenants.push({
        customer_id: customer.id,
        tenant_ids: customerTenants.map((tenant) => tenant.id),
      });
    }

    if (stripeSubscriptionId && !stripeCustomerId) {
      findings.errors.subscriptionMissingStripeCustomerId.push({
        customer_id: customer.id,
        stripe_subscription_id: stripeSubscriptionId,
      });
    }

    if (isActivePaidStatus(subscriptionStatus) && !stripeSubscriptionId) {
      findings.errors.activePastDueMissingStripeSubscriptionId.push({
        customer_id: customer.id,
        subscription_status: subscriptionStatus,
        stripe_customer_id: stripeCustomerId,
      });
    }

    if (isActivePaidStatus(subscriptionStatus) && !stripeCustomerId) {
      findings.errors.activePastDueMissingStripeCustomerId.push({
        customer_id: customer.id,
        subscription_status: subscriptionStatus,
        stripe_subscription_id: stripeSubscriptionId,
      });
    }

    if (isBillingAnchoredCustomer(customer) && customerTenants.length === 0) {
      findings.errors.billedCustomerWithoutTenant.push({
        customer_id: customer.id,
        email: customer.email,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        subscription_status: subscriptionStatus,
        plan: normalizeText(customer.plan),
      });
    }

    if (isBillingAnchoredCustomer(customer) && !customer.user_id) {
      findings.warnings.billedCustomerWithoutUserLink.push({
        customer_id: customer.id,
        email: customer.email,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        subscription_status: subscriptionStatus,
      });
    }

    const customerInstances = instancesByCustomer.get(customer.id) || [];
    const customerMappings = mappingsByCustomer.get(customer.id) || [];
    const mappingIdsByInstance = new Map<string, string[]>();

    for (const mapping of customerMappings) {
      pushMapArray(mappingIdsByInstance, mapping.instance_id, mapping.id);
    }

    for (const [instanceId, mappingIds] of mappingIdsByInstance.entries()) {
      if (mappingIds.length > 1) {
        findings.errors.duplicateInstanceMappings.push({
          customer_id: customer.id,
          instance_id: instanceId,
          mapping_ids: mappingIds,
        });
      }
    }

    for (const instance of customerInstances) {
      if (!mappingIdsByInstance.has(instance.id)) {
        findings.errors.instanceMissingTenantMapping.push({
          customer_id: customer.id,
          instance_id: instance.id,
        });
      }
    }

    const expectedTenantIds = new Set(customerTenants.map((tenant) => tenant.id));

    for (const mapping of customerMappings) {
      const mappedInstance = instanceById.get(mapping.instance_id);
      const mappedTenant = tenantById.get(mapping.tenant_id);

      if (!mappedInstance) {
        findings.errors.mappingOrphanInstance.push({
          mapping_id: mapping.id,
          customer_id: mapping.customer_id,
          instance_id: mapping.instance_id,
        });
      } else if (mappedInstance.customer_id !== mapping.customer_id) {
        findings.errors.mappingInstanceCustomerMismatch.push({
          mapping_id: mapping.id,
          mapping_customer_id: mapping.customer_id,
          instance_id: mapping.instance_id,
          instance_customer_id: mappedInstance.customer_id,
        });
      }

      if (!mappedTenant) {
        findings.errors.mappingOrphanTenant.push({
          mapping_id: mapping.id,
          customer_id: mapping.customer_id,
          tenant_id: mapping.tenant_id,
        });
      } else if (mappedTenant.customer_id !== mapping.customer_id) {
        findings.errors.mappingTenantCustomerMismatch.push({
          mapping_id: mapping.id,
          mapping_customer_id: mapping.customer_id,
          tenant_id: mapping.tenant_id,
          tenant_customer_id: mappedTenant.customer_id,
        });
      }

      if (expectedTenantIds.size > 0 && !expectedTenantIds.has(mapping.tenant_id)) {
        findings.errors.mappingUnexpectedTenantForCustomer.push({
          mapping_id: mapping.id,
          customer_id: mapping.customer_id,
          tenant_id: mapping.tenant_id,
          expected_tenant_ids: Array.from(expectedTenantIds.values()),
        });
      }
    }
  }

  for (const [stripeCustomerId, ids] of stripeCustomerIdToCustomers.entries()) {
    const uniqueCustomerIds = Array.from(new Set(ids));
    if (uniqueCustomerIds.length > 1) {
      findings.errors.duplicateStripeCustomerIds.push({
        stripe_customer_id: stripeCustomerId,
        customer_ids: uniqueCustomerIds,
      });
    }
  }

  for (const [stripeSubscriptionId, ids] of stripeSubscriptionIdToCustomers.entries()) {
    const uniqueCustomerIds = Array.from(new Set(ids));
    if (uniqueCustomerIds.length > 1) {
      findings.errors.duplicateStripeSubscriptionIds.push({
        stripe_subscription_id: stripeSubscriptionId,
        customer_ids: uniqueCustomerIds,
      });
    }
  }

  const errorCount = countEntries(findings.errors as unknown as Record<string, unknown[]>);
  const warningCount = countEntries(findings.warnings as unknown as Record<string, unknown[]>);

  return {
    customers,
    findings,
    summary: {
      customers_evaluated: customers.length,
      tenants_evaluated: tenants.length,
      instances_evaluated: instances.length,
      mappings_evaluated: mappings.length,
      error_count: errorCount,
      warning_count: warningCount,
      passed: errorCount === 0,
    },
  };
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

  const admin = createAdminClientFromEnv();
  const result = await runValidation(admin, options);

  const report = {
    captured_at: new Date().toISOString(),
    scope: {
      customer_id: options.customerId,
      limit: options.limit,
      sample_size: options.sampleSize,
    },
    summary: result.summary,
  };

  console.log("Customer/Billing Linkage Validation Summary:");
  console.log(JSON.stringify(report, null, 2));

  printFindingBlock(
    "ERROR duplicateStripeCustomerIds",
    result.findings.errors.duplicateStripeCustomerIds,
    options.sampleSize
  );
  printFindingBlock(
    "ERROR duplicateStripeSubscriptionIds",
    result.findings.errors.duplicateStripeSubscriptionIds,
    options.sampleSize
  );
  printFindingBlock(
    "ERROR subscriptionMissingStripeCustomerId",
    result.findings.errors.subscriptionMissingStripeCustomerId,
    options.sampleSize
  );
  printFindingBlock(
    "ERROR activePastDueMissingStripeSubscriptionId",
    result.findings.errors.activePastDueMissingStripeSubscriptionId,
    options.sampleSize
  );
  printFindingBlock(
    "ERROR activePastDueMissingStripeCustomerId",
    result.findings.errors.activePastDueMissingStripeCustomerId,
    options.sampleSize
  );
  printFindingBlock(
    "ERROR billedCustomerWithoutTenant",
    result.findings.errors.billedCustomerWithoutTenant,
    options.sampleSize
  );
  printFindingBlock(
    "ERROR customerWithMultipleTenants",
    result.findings.errors.customerWithMultipleTenants,
    options.sampleSize
  );
  printFindingBlock(
    "ERROR instanceMissingTenantMapping",
    result.findings.errors.instanceMissingTenantMapping,
    options.sampleSize
  );
  printFindingBlock(
    "ERROR duplicateInstanceMappings",
    result.findings.errors.duplicateInstanceMappings,
    options.sampleSize
  );
  printFindingBlock(
    "ERROR mappingOrphanInstance",
    result.findings.errors.mappingOrphanInstance,
    options.sampleSize
  );
  printFindingBlock(
    "ERROR mappingOrphanTenant",
    result.findings.errors.mappingOrphanTenant,
    options.sampleSize
  );
  printFindingBlock(
    "ERROR mappingInstanceCustomerMismatch",
    result.findings.errors.mappingInstanceCustomerMismatch,
    options.sampleSize
  );
  printFindingBlock(
    "ERROR mappingTenantCustomerMismatch",
    result.findings.errors.mappingTenantCustomerMismatch,
    options.sampleSize
  );
  printFindingBlock(
    "ERROR mappingUnexpectedTenantForCustomer",
    result.findings.errors.mappingUnexpectedTenantForCustomer,
    options.sampleSize
  );
  printFindingBlock(
    "WARN customerWithoutTenant",
    result.findings.warnings.customerWithoutTenant,
    options.sampleSize
  );
  printFindingBlock(
    "WARN billedCustomerWithoutUserLink",
    result.findings.warnings.billedCustomerWithoutUserLink,
    options.sampleSize
  );

  if (!result.summary.passed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
