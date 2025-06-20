"use client"

import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, Send, User, Bot, CreditCard } from "lucide-react"
import { useEffect, useRef } from "react"
import { useSmartAccountClient } from "@account-kit/react"

export default function LogisticsChatbot() {
  const { client, address }              = useSmartAccountClient({});
  const sessionId = localStorage.getItem('currentSessionId')!
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/sessions/chat",
    headers: {
      smartContractWalletAddress: address!,
      sessionId: sessionId,

    },
    maxSteps: 10, // Allow multiple steps for tool calls and responses
  })




  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const renderToolInvocation = (invocation: any, index: number) => {
    return (
      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex-1 text-sm">
            <div className="font-medium text-green-800 mb-1">{invocation.toolName || "Tool Execution"}</div>

            {/* Handle different tool invocation states */}
            {invocation.state === "partial-call" && (
              <div className="text-green-600 text-xs italic">Preparing tool call...</div>
            )}

            {invocation.state === "call" && (
              <>
                {invocation.args && (
                  <div className="text-green-700 mb-2">
                    {typeof invocation.args === "object"
                      ? Object.entries(invocation.args).map(([key, value]) => (
                          <div key={key} className="mb-1">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))
                      : String(invocation.args)}
                  </div>
                )}
                <div className="text-green-600 text-xs italic">Executing...</div>
              </>
            )}

            {invocation.state === "result" && (
              <>
                {invocation.args && (
                  <div className="text-green-700 mb-2">
                    {typeof invocation.args === "object"
                      ? Object.entries(invocation.args).map(([key, value]) => (
                          <div key={key} className="mb-1">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))
                      : String(invocation.args)}
                  </div>
                )}
                {invocation.result && (
                  <div className="p-2 bg-green-100 rounded text-green-800 text-xs">
                    <strong>Result:</strong>{" "}
                    {typeof invocation.result === "object"
                      ? JSON.stringify(invocation.result, null, 2)
                      : String(invocation.result)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto min-h-screen flex flex-col">
      <CardHeader className="flex-shrink-0 border-b">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-600" />
          Shopping Assistant
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="h-[calc(100vh-150px)] overflow-y-auto p-4" ref={scrollAreaRef}>
          <div className="space-y-4 w-full max-w-3xl mx-auto break-words break-all whitespace-pre-wrap">

            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Welcome to your Shopping Assistant!</p>
                <p className="text-sm">Say "I want to buy a watch"</p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                {/* Render message parts */}
                {message.parts?.map((part, partIndex) => {
                  if (part.type === "text") {
                    return (
                      <div
                        key={partIndex}
                        className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex gap-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                        >
                          <div className="flex-shrink-0">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div
                              className={`rounded-lg px-4 py-2 ${
                                message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
                              }`}
                            >
                              <div className="whitespace-pre-wrap">{part.text}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  if (part.type === "tool-invocation") {
                    return (
                      <div key={partIndex} className="flex justify-start">
                        <div className="max-w-[80%]">{renderToolInvocation(part.toolInvocation, partIndex)}</div>
                      </div>
                    )
                  }

                  return null
                })}

              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-600">
                      <Bot className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="rounded-lg px-4 py-2 bg-gray-100">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Begin your shopping journey here..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
