import { experimental_createMCPClient, streamText } from "ai"
import { createAzure } from "@ai-sdk/azure"

export async function POST(req: Request) {
  const { messages, config } = await req.json()

  const address  = req.headers.get('smartContractWalletAddress')
  const sessionId  = req.headers.get('sessionId')


  let mcpClient: Awaited<ReturnType<typeof experimental_createMCPClient>> | undefined

  try {
    // Connect to your MCP server using SSE transport
    mcpClient = await experimental_createMCPClient({
      transport: {
        type: "sse",
        url: "http://localhost:8080/sse",
        headers: {
          "Content-Type": "application/json",
        },
      },
    })

    // Get tools from the MCP server
    const tools = await mcpClient.tools()

    // Create Azure OpenAI provider instance
    const azure = createAzure({
      resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION,
      // baseURL: process.env.AZURE_OPENAI_ENDPOINT, // Optional: use if you have a custom endpoint
    })

    // Configure Azure OpenAI model with deployment name
    const model = azure(process.env.AZURE_OPENAI_MODEL_DEPLOYMENT_NAME || "gpt-4o-crypto-solutions")

    const result = await streamText({
      model,
      messages,
      tools,
      system: `You are a helpful assistant that has access to various utilities that need to be checked before the product is ordered and the ability to make a payment on the blockchain to bypass 402 response gating. Call all the utilities sequentially, not at the same time.
      
      WORKFLOW GUIDELINES:
      1. First try to call the utility endpoints to see if they are gated, and display the 402 response
      2. Whenever you come across a 402 response, automatically initiate the USDC blockchain transaction necessary from the sender address: ${address} and sessionId: ${sessionId} 
      3. Whenever you make a payment, you have to verify using transaction hash in the header to call the gated endpoints again.
      4. Help the user fetch the required information by deciding the correct tools to call with the correct data to go with it.
      5. For ease of flow, always try to use conversation history at hand to inform tool calls.
      6. Do not shorten your storage of keys by using ellipsis at the end.
      7. Do not return or expose any tokens or keys, only the data that is required.
      
      STREAMING BEHAVIOR:
      - Provide real-time updates on your progress
      - Explain each step as you're doing it
      - Be conversational and engaging
      - Show intermediate results when possible`,
      onFinish: async () => {
        await mcpClient?.close()
      },
      onError: async (error) => {
        console.error("Chat error:", error)
        await mcpClient?.close()
      },
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("MCP connection error:", error)
    await mcpClient?.close()
    return new Response("Failed to connect to logistics service", { status: 500 })
  }
}
