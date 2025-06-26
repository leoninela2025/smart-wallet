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
        url: "http://127.0.0.1:8080/sse",
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
      1. When a user wants to buy a product, make tool call to fetch the inventory. Don't stream the results of what was fetched from the inventory. Then make the utility tool calls necessary to fetch the data for all the products in inventory.
      2. Whenever you come across a 402 response, automatically initiate the USDC blockchain transaction necessary from the sender address: ${address} and sessionId: ${sessionId} 
      3. After you make a payment, get a receipt using session id, transaction hash, payment token, and paymentOptionId.
      4. Make call to the utility endpoint again by passing the receipt token.
      5. Based on the output from the tool calls and the user's criteria for a product in the input, suggest a product to buy.
      6. For ease of flow, always try to use conversation history at hand to inform tool calls.
      7. Do not shorten your storage of keys by using ellipsis at the end.
      8. Do not return or expose any tokens or keys, only the data that is required.
      
      STREAMING BEHAVIOR:
      - Provide real-time updates on your progress
      - After making a tool call, if there are more to be made, don't display the result of the intermediary tool call step.
      - Just summarize the ultimate result of the user's intended query. When making suggestion, just make a suggestion and fetch the item associated with that item id. Give one sentence of logic why it was chosen.
      - Be conversational and engaging`,
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
