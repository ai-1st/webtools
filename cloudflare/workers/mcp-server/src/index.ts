export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      })
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { jsonrpc, method, params, id } = await request.json() as any

      if (jsonrpc !== "2.0" || !method) {
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: id || null, error: { code: -32600, message: "Invalid Request" } }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }

      // Handle notifications
      if (!id) {
          if (method === "notifications/initialized") {
              // Do nothing, no response for notifications
              return new Response(null, { status: 204 })
          }
          // For other notifications, we also do nothing.
          return new Response(null, { status: 204 })
      }

      let result: unknown = {}
      switch (method) {
        case "initialize":
          result = {
            protocolVersion: "2025-03-26",
            capabilities: {
              logging: {},
              prompts: {
                listChanged: true
              },
              resources: {
                subscribe: true,
                listChanged: true
              },
              tools: {
                listChanged: true
              }
            },
            serverInfo: {
              name: "CloudflareMCP",
              version: "1.0.0"
            },
            instructions: "Welcome to the Cloudflare MCP Server"
          }
          break
        case "ping":
          result = {}
          break
        case "resources/list":
          result = {
            resources: [
              {
                uri: "file:///project/src/main.rs",
                name: "main.rs",
                description: "Primary application entry point",
                mimeType: "text/x-rust"
              }
            ],
            nextCursor: "next-page-cursor"
          }
          break
        case "resources/read":
          const readParams = params as any
          if (readParams?.uri === "file:///project/src/main.rs") {
            result = {
              contents: [
                {
                  uri: "file:///project/src/main.rs",
                  mimeType: "text/x-rust",
                  text: 'fn main() {\\n    println!("Hello world!");\\n}'
                }
              ]
            }
          } else {
              return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32602, message: "Invalid params: resource not found" } }), {
                  status: 400,
                  headers: { "Content-Type": "application/json" },
              })
          }
          break
        case "resources/templates/list":
          result = {
            resourceTemplates: [
              {
                uriTemplate: "file:///{path}",
                name: "Project Files",
                description: "Access files in the project directory",
                mimeType: "application/octet-stream"
              }
            ]
          }
          break
        case "prompts/list":
          result = {
            prompts: [
              {
                name: "code_review",
                description: "Asks the LLM to analyze code quality and suggest improvements",
                arguments: [
                  {
                    name: "code",
                    description: "The code to review",
                    required: true
                  }
                ]
              }
            ],
            nextCursor: "next-page-cursor"
          }
          break
        case "prompts/get":
          const getParams = params as any
          if (getParams?.name === "code_review") {
              result = {
                  description: "Code review prompt",
                  messages: [
                  {
                      role: "user",
                      content: {
                          type: "text",
                          text: `Please review this Python code:\\n ${getParams.arguments?.code}`
                      }
                  }
                  ]
              }
          } else {
              return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32602, message: "Invalid params: prompt not found" } }), {
                  status: 400,
                  headers: { "Content-Type": "application/json" },
              })
          }
          break
        case "tools/list":
          result = {
              tools: [
              {
                  name: "get_weather",
                  description: "Get current weather information for a location",
                  inputSchema: {
                  type: "object",
                  properties: {
                      location: {
                      type: "string",
                      description: "City name or zip code"
                      }
                  },
                  required: ["location"]
                  }
              }
              ],
              nextCursor: "next-page-cursor"
          }
          break
        case "tools/call":
          const callParams = params as any
          if (callParams?.name === "get_weather") {
              result = {
                  content: [
                      {
                          type: "text",
                          text: `Current weather in ${callParams.arguments?.location}:\\n Temperature: 72°F\\n Conditions: Partly cloudy`
                      }
                  ],
                  isError: false
              }
          } else {
              return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32602, message: "Invalid params: tool not found" } }), {
                  status: 400,
                  headers: { "Content-Type": "application/json" },
              })
          }
          break
        default:
          return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          })
      }

      return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })

    } catch (e) {
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }
  },
}
