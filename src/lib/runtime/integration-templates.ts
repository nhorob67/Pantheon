export interface IntegrationTemplate {
  slug: string;
  display_name: string;
  service_type: string;
  base_url: string;
  auth_method: "api_key" | "bearer" | "basic" | "header" | "multi_header";
  auth_header?: string;
  additional_headers?: Record<string, string>;
  api_docs_url: string;
  capabilities_summary: string;
  discovered_endpoints: Array<{
    method: string;
    path: string;
    description: string;
  }>;
  setup_instructions: string;
}

export const INTEGRATION_TEMPLATES: IntegrationTemplate[] = [
  {
    slug: "discourse",
    display_name: "Discourse",
    service_type: "forum",
    base_url: "https://community.example.com",
    auth_method: "multi_header",
    api_docs_url: "https://docs.discourse.org/",
    capabilities_summary:
      "Read and post to forum topics, manage categories, moderate users, and access admin dashboard data.",
    discovered_endpoints: [
      { method: "GET", path: "/site.json", description: "Site configuration and metadata" },
      { method: "GET", path: "/latest.json", description: "Latest topics across all categories" },
      { method: "GET", path: "/c/{id}.json", description: "Topics in a specific category" },
      { method: "GET", path: "/t/{id}.json", description: "Single topic with posts" },
      { method: "POST", path: "/posts.json", description: "Create a new post or topic" },
      { method: "GET", path: "/admin/dashboard.json", description: "Admin dashboard stats" },
      {
        method: "GET",
        path: "/admin/users/list/active.json",
        description: "List active users (admin only)",
      },
    ],
    setup_instructions:
      'Ask for both the Discourse API key AND API username. Both are required for every request. ' +
      'Use auth_method "multi_header" and pass the credential as a JSON object: ' +
      '{"Api-Key": "<key>", "Api-Username": "<username>"}.',
  },
  {
    slug: "github",
    display_name: "GitHub",
    service_type: "code_hosting",
    base_url: "https://api.github.com",
    auth_method: "bearer",
    api_docs_url: "https://docs.github.com/en/rest",
    capabilities_summary:
      "Manage repositories, issues, pull requests, and user data across GitHub organizations and personal accounts.",
    discovered_endpoints: [
      { method: "GET", path: "/repos/{owner}/{repo}", description: "Repository details" },
      {
        method: "GET",
        path: "/repos/{owner}/{repo}/issues",
        description: "List issues for a repository",
      },
      {
        method: "POST",
        path: "/repos/{owner}/{repo}/issues",
        description: "Create a new issue",
      },
      {
        method: "GET",
        path: "/repos/{owner}/{repo}/pulls",
        description: "List pull requests for a repository",
      },
      { method: "GET", path: "/user", description: "Authenticated user profile" },
    ],
    setup_instructions:
      "Ask for a GitHub Personal Access Token (classic or fine-grained). The token scope determines which repos/actions are available.",
  },
  {
    slug: "jira",
    display_name: "Jira",
    service_type: "project_management",
    base_url: "https://yoursite.atlassian.net",
    auth_method: "basic",
    api_docs_url: "https://developer.atlassian.com/cloud/jira/platform/rest/v3/",
    capabilities_summary:
      "Search and manage Jira issues, create tickets, track project progress, and query project metadata.",
    discovered_endpoints: [
      { method: "GET", path: "/rest/api/3/search", description: "Search issues via JQL" },
      {
        method: "GET",
        path: "/rest/api/3/issue/{issueKey}",
        description: "Get a single issue by key",
      },
      { method: "POST", path: "/rest/api/3/issue", description: "Create a new issue" },
      { method: "GET", path: "/rest/api/3/project", description: "List all accessible projects" },
    ],
    setup_instructions:
      "Ask for the Jira instance URL, user email, and API token. Combine email:token as the credential for Basic auth.",
  },
  {
    slug: "linear",
    display_name: "Linear",
    service_type: "project_management",
    base_url: "https://api.linear.app",
    auth_method: "bearer",
    api_docs_url: "https://developers.linear.app/docs",
    capabilities_summary:
      "Query and manage Linear issues, projects, teams, and cycles via a GraphQL API.",
    discovered_endpoints: [
      {
        method: "POST",
        path: "/graphql",
        description: "GraphQL endpoint — all queries and mutations",
      },
    ],
    setup_instructions:
      "Ask for a Linear API key. Linear uses a GraphQL API — all queries go to POST /graphql.",
  },
  {
    slug: "slack",
    display_name: "Slack",
    service_type: "messaging",
    base_url: "https://slack.com/api",
    auth_method: "bearer",
    api_docs_url: "https://api.slack.com/methods",
    capabilities_summary:
      "Send messages, list channels, read conversation history, and look up workspace users.",
    discovered_endpoints: [
      {
        method: "POST",
        path: "/chat.postMessage",
        description: "Send a message to a channel or user",
      },
      { method: "GET", path: "/conversations.list", description: "List channels in the workspace" },
      {
        method: "GET",
        path: "/conversations.history",
        description: "Fetch messages from a channel",
      },
      { method: "GET", path: "/users.list", description: "List workspace members" },
    ],
    setup_instructions:
      "Ask for a Slack Bot Token (starts with xoxb-). The token's OAuth scopes determine available actions.",
  },
  {
    slug: "notion",
    display_name: "Notion",
    service_type: "workspace",
    base_url: "https://api.notion.com/v1",
    auth_method: "bearer",
    additional_headers: { "Notion-Version": "2022-06-28" },
    api_docs_url: "https://developers.notion.com/reference/intro",
    capabilities_summary:
      "Search pages and databases, read and create pages, and traverse block hierarchies in a Notion workspace.",
    discovered_endpoints: [
      { method: "POST", path: "/search", description: "Search pages and databases by keyword" },
      {
        method: "GET",
        path: "/databases/{id}/query",
        description: "Query a database with filters and sorts",
      },
      { method: "GET", path: "/pages/{id}", description: "Retrieve a single page" },
      { method: "POST", path: "/pages", description: "Create a new page in a database or page" },
      {
        method: "GET",
        path: "/blocks/{id}/children",
        description: "List child blocks of a page or block",
      },
    ],
    setup_instructions:
      "Ask for a Notion Internal Integration Token. The integration must be connected to specific pages/databases in Notion settings.",
  },
];

export function findTemplate(slug: string): IntegrationTemplate | undefined {
  return INTEGRATION_TEMPLATES.find((t) => t.slug === slug);
}

export function getTemplateList(): Array<{
  slug: string;
  display_name: string;
  service_type: string;
  capabilities_summary: string;
}> {
  return INTEGRATION_TEMPLATES.map(({ slug, display_name, service_type, capabilities_summary }) => ({
    slug,
    display_name,
    service_type,
    capabilities_summary,
  }));
}
