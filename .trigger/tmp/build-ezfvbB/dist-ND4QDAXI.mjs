import {
  BaseAgenticProvider,
  jsonSchemaToZodSchema,
  removeNonRequiredProperties
} from "./chunk-J4LCIBVK.mjs";
import {
  tool
} from "./chunk-5R2YARHQ.mjs";
import "./chunk-6FHKRVG7.mjs";
import "./chunk-YHJ4RCX5.mjs";
import "./chunk-WWNEOE5T.mjs";
import {
  __name,
  init_esm
} from "./chunk-262SQFPS.mjs";

// node_modules/@composio/vercel/dist/index.mjs
init_esm();
var VercelProvider = class extends BaseAgenticProvider {
  static {
    __name(this, "VercelProvider");
  }
  name = "vercel";
  strict;
  /**
  * Creates a new instance of the VercelProvider.
  *
  * This provider enables integration with the Vercel AI SDK,
  * allowing Composio tools to be used with Vercel AI applications.
  *
  * @example
  * ```typescript
  * // Initialize the Vercel provider
  * const provider = new VercelProvider();
  *
  * // Use with Composio
  * const composio = new Composio({
  *   apiKey: 'your-api-key',
  *   provider: new VercelProvider()
  * });
  *
  * // Use the provider to wrap tools for Vercel AI SDK
  * const vercelTools = provider.wrapTools(composioTools, composio.tools.execute);
  * ```
  */
  constructor({ strict = false } = {}) {
    super();
    this.strict = strict;
  }
  /**
  * Wraps a Composio tool in a Vercel AI SDK tool format.
  *
  * This method transforms a Composio tool definition into the format
  * expected by Vercel's AI SDK for function calling.
  *
  * @param {ComposioTool} composioTool - The Composio tool to wrap
  * @param {ExecuteToolFn} executeTool - Function to execute the tool
  * @returns {VercelTool} The wrapped Vercel tool
  *
  * @example
  * ```typescript
  * // Wrap a single tool for use with Vercel AI SDK
  * const composioTool = {
  *   slug: 'SEARCH_TOOL',
  *   description: 'Search for information',
  *   inputParameters: {
  *     type: 'object',
  *     properties: {
  *       query: { type: 'string' }
  *     },
  *     required: ['query']
  *   }
  * };
  *
  * // Create a Vercel tool using the provider
  * const vercelTool = provider.wrapTool(
  *   composioTool,
  *   composio.tools.execute
  * );
  *
  * // Use with Vercel AI SDK
  * import { StreamingTextResponse, Message } from 'ai';
  * import { OpenAI } from 'openai';
  *
  * export async function POST(req: Request) {
  *   const { messages } = await req.json();
  *   const openai = new OpenAI();
  *
  *   const response = await openai.chat.completions.create({
  *     model: 'gpt-4',
  *     messages,
  *     tools: [vercelTool]
  *   });
  *
  *   return new StreamingTextResponse(response.choices[0].message);
  * }
  * ```
  */
  wrapTool(composioTool, executeTool) {
    const inputParams = composioTool.inputParameters;
    const inputParametersSchema = jsonSchemaToZodSchema(this.strict && inputParams?.type === "object" ? removeNonRequiredProperties(inputParams) : inputParams ?? {});
    return tool({
      description: composioTool.description,
      inputSchema: inputParametersSchema,
      execute: /* @__PURE__ */ __name(async (params) => {
        const input = typeof params === "string" ? JSON.parse(params) : params;
        return await executeTool(composioTool.slug, input);
      }, "execute")
    });
  }
  /**
  * Wraps a list of Composio tools as a Vercel AI SDK tool collection.
  *
  * This method transforms multiple Composio tool definitions into the format
  * expected by Vercel's AI SDK for function calling, organizing them
  * into a dictionary keyed by tool slug.
  *
  * @param {ComposioTool[]} tools - Array of Composio tools to wrap
  * @param {ExecuteToolFn} executeTool - Function to execute the tools
  * @returns {VercelToolCollection} Dictionary of wrapped tools in Vercel AI SDK format
  *
  * @example
  * ```typescript
  * // Wrap multiple tools for use with Vercel AI SDK
  * const composioTools = [
  *   {
  *     slug: 'SEARCH_TOOL',
  *     description: 'Search for information',
  *     inputParameters: {
  *       type: 'object',
  *       properties: {
  *         query: { type: 'string' }
  *       },
  *       required: ['query']
  *     }
  *   },
  *   {
  *     slug: 'WEATHER_TOOL',
  *     description: 'Get weather information',
  *     inputParameters: {
  *       type: 'object',
  *       properties: {
  *         location: { type: 'string' }
  *       },
  *       required: ['location']
  *     }
  *   }
  * ];
  *
  * // Create Vercel tools using the provider
  * const vercelTools = provider.wrapTools(
  *   composioTools,
  *   composio.tools.execute
  * );
  *
  * // Use with Vercel AI SDK in a Next.js API route
  * import { StreamingTextResponse } from 'ai';
  * import { OpenAI } from 'openai';
  *
  * export async function POST(req: Request) {
  *   const { messages } = await req.json();
  *   const openai = new OpenAI();
  *
  *   const response = await openai.chat.completions.create({
  *     model: 'gpt-4',
  *     messages,
  *     tools: Object.values(vercelTools)
  *   });
  *
  *   return new StreamingTextResponse(response.choices[0].message);
  * }
  * ```
  */
  wrapTools(tools, executeTool) {
    return tools.reduce((acc, tool$1) => {
      acc[tool$1.slug] = this.wrapTool(tool$1, executeTool);
      return acc;
    }, {});
  }
  /**
  * Transform MCP URL response into Anthropic-specific format.
  * By default, Anthropic uses the standard format (same as default),
  * but this method is here to show providers can customize if needed.
  *
  * @param data - The MCP URL response data
  * @returns Standard MCP server response format
  */
  wrapMcpServerResponse(data) {
    return data.map((item) => ({
      url: new URL(item.url),
      name: item.name
    }));
  }
};
export {
  VercelProvider
};
//# sourceMappingURL=dist-ND4QDAXI.mjs.map
