"use client"

import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, Send, User, Bot, CreditCard, DollarSign, Receipt } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useSmartAccountClient } from "@account-kit/react"
import { FiExternalLink } from "react-icons/fi";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react"; // Using Lucide for a clean chevron
import Image from "next/image"


export default function LogisticsChatbot() {
  const { client, address } = useSmartAccountClient({})
  const sessionId = localStorage.getItem("currentSessionId")!
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: "/api/sessions/chat",
    headers: {
      smartContractWalletAddress: address!,
      sessionId: sessionId,
    },
    maxSteps: 20, // Allow multiple steps for tool calls and responses
  })

  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        // Find the actual scrollable viewport within the ScrollArea
        const viewport = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight
        } else {
          // Fallback to the ref element itself
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
        }
      }
    }

    // Use setTimeout to ensure DOM has updated before scrolling
    const timeoutId = setTimeout(scrollToBottom, 100)

    return () => clearTimeout(timeoutId)
  }, [messages])

  useEffect(() => {
    if (!isLoading) {
      const scrollToBottom = () => {
        if (scrollAreaRef.current) {
          const viewport = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
          if (viewport) {
            viewport.scrollTop = viewport.scrollHeight
          } else {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
          }
        }
      }
      setTimeout(scrollToBottom, 200)
    }
  }, [isLoading])

  const toolNames = new Map<string, { color: string; properName: string }>();
  toolNames.set("get_laptops", { properName: "Get laptops", color: "green" });
  toolNames.set("get_reviews", { properName: "Get reviews for all laptops", color: "yellow" });
  toolNames.set("get_availability", { properName: "Get availability for all laptops", color: "yellow" });
  toolNames.set("make_payment", { properName: "Make payment for 402 endpoint", color: "green" });
  toolNames.set("get_receipt", { properName: "Get receipt for previous payment", color: "purple" });
  toolNames.set("purchase_laptop", { properName: "Purchase a laptop", color: "green" });
  toolNames.set("get_laptop", { properName: "Get laptop", color: "green" });





  const renderProductCard = (item: any, index: number) => {
    return (
      <Card key={index} className="w-full max-w-xs bg-white border border-gray-200 hover:shadow-lg transition-shadow">
        <CardContent className="p-3">
          <div className="aspect-[4/3] mb-2 bg-gray-50 rounded-lg overflow-hidden">
            <img
              src={item.image || "/placeholder.svg?height=150&width=200"}
              alt={item.name || `Product ${index + 1}`}
              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
              onClick={() => {
                append({ role: "user", content: `Tell me more about ${item.name || "this product"}` })
              }}
            />
          </div>

          <div className="space-y-1">
            <h3 className="font-medium text-xs text-gray-900 line-clamp-2 leading-tight">
              {item.name || item.title || "Product Name"}
            </h3>

            <div className="flex items-center justify-between">
              <div className="text-base font-bold text-blue-600">${item.price || "0.00"}</div>
              {item.originalPrice && item.originalPrice > item.price && (
                <div className="text-xs text-gray-500 line-through">${item.originalPrice}</div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs text-green-600 border-green-200 hover:bg-green-50 h-7"
              onClick={() => {
                append({ role: "user", content: `I want to buy ${item.name || "this product"}` })
              }}
            >
              Purchase Product
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const toolIcons: Record<string, React.ReactNode> = {
    make_payment: <DollarSign className="w-3 h-3 text-white" />,
    get_receipt: <Receipt className="w-3 h-3 text-white" />,
    purchase_laptop: <CreditCard className="w-3 h-3 text-white" />,
  };

  const PaymentCardsComponent = ({ onCardClick, price, itemName }: { onCardClick: (card: any) => void, price?: number, itemName?: string }) => {
  const [showBiometric, setShowBiometric] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authSuccess, setAuthSuccess] = useState(false)
  const [selectedCard, setSelectedCard] = useState<any>(null)

  const cards = [
    { last4: "1234", expiry: "12/26", bg: "from-blue-600 to-indigo-700" },
    { last4: "5678", expiry: "09/27", bg: "from-green-600 to-emerald-700" },
  ]

  const handleCardClick = async (card: any) => {
    setSelectedCard(card)
    setShowBiometric(true)
    setIsAuthenticating(true)
    
    // Simulate biometric authentication process automatically
    await new Promise(resolve => setTimeout(resolve, 2500))
    
    setAuthSuccess(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Reset states and call the original onCardClick
    setShowBiometric(false)
    setIsAuthenticating(false)
    setAuthSuccess(false)
    onCardClick(card)
  }

  const handleCancelAuth = () => {
    setShowBiometric(false)
    setIsAuthenticating(false)
    setAuthSuccess(false)
    setSelectedCard(null)
  }

  if (showBiometric) {
    return (
      <div className="mt-4 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
        <div className="flex flex-col items-center justify-center py-8">
          {authSuccess ? (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-green-600">
                Authentication Successful!
              </h2>
              <p className="text-gray-600">
                Processing payment with card ending in {selectedCard?.last4}...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Biometric Authentication</h2>
              </div>

              <div className="relative mb-6">
                <div
                  className="w-32 h-32 rounded-full border-4 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg flex items-center justify-center transition-all duration-500"
                  style={{
                    animation: 'pulse 2s infinite',
                    transform: 'scale(1)',
                  }}
                >
                  <div className="relative">
                    <User className="w-16 h-16 text-blue-500" />
                    {/* Fingerprint scanner animation */}
                    <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-75"></div>
                    <div className="absolute inset-2 rounded-full border-2 border-blue-300 animate-ping opacity-50" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                </div>
              </div>

              <div className="text-center mb-6">
                <p className="text-gray-700 mb-2 font-medium">
                  Authenticating biometric data...
                </p>
                <p className="text-sm text-gray-500">
                  Processing payment with card ending in {selectedCard?.last4}
                </p>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-600">Verifying identity...</span>
              </div>

              <Button
                variant="outline"
                onClick={handleCancelAuth}
                className="px-6 py-2 rounded-lg text-sm"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
      <div className="mb-6 flex flex-col items-center">
        <h3 className="text-base text-gray-800 mb-1 text-center">
          Select a payment method
        </h3>
        {price !== undefined && (
          <div className="text-sm text-blue-600 font-medium text-center">
            Total: <span className="font-bold">${price}</span>
          </div>
        )}
        {itemName !== undefined && (
          <div className="text-sm text-blue-600 font-medium text-center">
            Product Name:{" "}
            <span className="font-bold">
            {itemName.length > 25
              ? `${itemName.slice(0, 15)}...${itemName.slice(-10)}`
              : itemName}
            </span>
          </div>
        )}
      </div>
      <div className="flex justify-center gap-6 flex-wrap">
        {cards.map((card, idx) => (
          <div 
            key={idx} 
            className="transform hover:scale-105 transition-all duration-300 cursor-pointer"
            onClick={() => handleCardClick(card)}
          >
            <Card
              className={`w-60 h-36 p-4 rounded-2xl shadow-md cursor-pointer bg-gradient-to-br ${card.bg} text-white relative overflow-hidden hover:shadow-lg transition-shadow`}
            >
              <div className="w-10 h-6 bg-yellow-300 rounded-sm mb-3" />
              <div className="text-sm tracking-widest font-mono whitespace-nowrap mb-3">
                **** **** **** {card.last4}
              </div>
              <div className="flex justify-between items-center text-xs font-light">
                <div>
                  <p className="uppercase text-[10px] text-white/70">Expires</p>
                  <p>{card.expiry}</p>
                </div>
                <Image src={"/mastercard-logo.svg"} width={40} height={24} alt="Card logo" className="object-contain" />
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}

  const renderToolInvocation = (invocation: any, index: number) => {
    const handleCardClick = (card: any) => {
      append({ 
        role: "user", 
        content: `Get me the confirmation number for this order.` 
      })
    }

    // Get the color for this tool, default to green if not found
    const toolColor = toolNames.get(invocation.toolName)?.color || "green"

    return (
      <div key={index} className={`p-3 rounded-lg max-w-4xl border ${
        toolColor === 'green' ? 'bg-green-50 border-green-200' :
        toolColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
        toolColor === 'purple' ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              toolColor === 'green' ? 'bg-green-500' :
              toolColor === 'yellow' ? 'bg-yellow-500' :
              toolColor === 'purple' ? 'bg-purple-500' : 'bg-green-500'
            }`}>
              {toolIcons[invocation.toolName] || <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
          <div className="flex-1 text-sm">
            <div className={`font-medium mb-1 ${
              toolColor === 'green' ? 'text-green-800' :
              toolColor === 'yellow' ? 'text-yellow-800' :
              toolColor === 'purple' ? 'text-purple-800' : 'text-green-800'
            }`}>
              {(toolNames.get(invocation.toolName)?.properName) || "Tool Execution"}
              {invocation.state === "result" && (() => {
                const parsed = JSON.parse(invocation.result.content[0].text);
                const purpose = parsed?.purpose;

                if (!purpose) return null;

                return invocation.toolName === "make_payment" ? (
                  <span>
                    {" "}
                    (<a
                      href={`https://sepolia.basescan.org/tx/${purpose}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`underline inline-flex items-center gap-1 ${
                        toolColor === 'green' ? 'text-green-700 hover:text-green-900' :
                        toolColor === 'yellow' ? 'text-yellow-700 hover:text-yellow-900' :
                        toolColor === 'purple' ? 'text-purple-700 hover:text-purple-900' : 'text-green-700 hover:text-green-900'
                      }`}
                    >
                      {`View transaction on Basescan`}
                      <FiExternalLink className="w-4 h-4 inline" />
                    </a>)
                  </span>
                ) : (
                  <> ({purpose})</>
                );
              })()}
            </div>

            {/* Tool call states */}
            {invocation.state === "partial-call" && (
              <div className={`text-xs italic ${
                toolColor === 'green' ? 'text-green-600' :
                toolColor === 'yellow' ? 'text-yellow-600' :
                toolColor === 'purple' ? 'text-purple-600' : 'text-green-600'
              }`}>Preparing tool call...</div>
            )}

            {invocation.state === "call" && (
              <>
                {invocation.args && (
                  <div className={`mb-2 ${
                    toolColor === 'green' ? 'text-green-700' :
                    toolColor === 'yellow' ? 'text-yellow-700' :
                    toolColor === 'purple' ? 'text-purple-700' : 'text-green-700'
                  }`}>
                    {typeof invocation.args === "object"
                      ? Object.entries(invocation.args).map(([key, value]) => (
                          <div key={key} className="mb-1">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))
                      : String(invocation.args)}
                  </div>
                )}
                <div className={`text-xs italic ${
                  toolColor === 'green' ? 'text-green-600' :
                  toolColor === 'yellow' ? 'text-yellow-600' :
                  toolColor === 'purple' ? 'text-purple-600' : 'text-green-600'
                }`}>Executing...</div>
              </>
            )}

            {invocation.state === "result" && (
              <>
                {invocation.toolName === "purchase_laptop" && (() => {
                  const price = JSON.parse(invocation.result.content[0].text).items[0].price;
                  const itemName = JSON.parse(invocation.result.content[0].text).items[0].name;
                  return <PaymentCardsComponent onCardClick={handleCardClick} price={price} itemName={itemName}/>;
                })()}

                {invocation.toolName !== "purchase_laptop" && invocation.result &&
                  (() => {
                    const res = JSON.parse(invocation.result.content[0].text);
                    const displayData = res.displayData;

                    const keysToRemove = ["displayData", "paymentToken", "sessionId", "purpose", "paymentOptionId"];

                    const cleaned = Object.fromEntries(
                      Object.entries(res).filter(([key]) => !keysToRemove.includes(key))
                    );

                    return (
                      <div className="mt-3">
                        {typeof res === "object" &&
                        res.images &&
                        Array.isArray(res.items) ? (
                          <div className="space-y-3">
                            <div className={`text-sm font-medium ${
                              toolColor === 'green' ? 'text-green-800' :
                              toolColor === 'yellow' ? 'text-yellow-800' :
                              toolColor === 'purple' ? 'text-purple-800' : 'text-green-800'
                            }`}>
                              Found {res.items.length} products:
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-w-none">
                              {res.items.map((item, index) =>
                                item.image ? renderProductCard(item, index) : null
                              )}
                            </div>
                          </div>
                        ) : (
                          // START: New conditional rendering for Accordion and Result
                          (invocation.toolName === "get_reviews" || invocation.toolName === "get_availability") && (
                            <div className={`p-2 rounded text-xs space-y-2 ${
                              toolColor === 'green' ? 'bg-green-100 text-green-800' :
                              toolColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                              toolColor === 'purple' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                            }`}>
                              <div>
                                <strong>Result:</strong>{" "}
                                {displayData}
                              </div>

                              <Accordion.Root
                                type="single"
                                collapsible
                                className={`w-full border rounded ${
                                  toolColor === 'green' ? 'border-green-300 bg-green-50' :
                                  toolColor === 'yellow' ? 'border-yellow-300 bg-yellow-50' :
                                  toolColor === 'purple' ? 'border-purple-300 bg-purple-50' : 'border-green-300 bg-green-50'
                                }`}
                              >
                                <Accordion.Item value="parsed-response">
                                  <Accordion.Header>
                                    <Accordion.Trigger className={`w-full flex justify-between items-center px-3 py-2 text-xs font-medium transition-colors ${
                                      toolColor === 'green' ? 'text-green-700 hover:bg-green-100' :
                                      toolColor === 'yellow' ? 'text-yellow-700 hover:bg-yellow-100' :
                                      toolColor === 'purple' ? 'text-purple-700 hover:bg-purple-100' : 'text-green-700 hover:bg-green-100'
                                    }`}>
                                      <span>Details</span>
                                      <ChevronDown
                                        className="h-4 w-4 transition-transform duration-200"
                                        aria-hidden
                                      />
                                    </Accordion.Trigger>
                                  </Accordion.Header>
                                  <Accordion.Content className={`px-3 py-2 text-[10px] border-t overflow-hidden animate-accordion-down ${
                                    toolColor === 'green' ? 'bg-green-50 border-green-200' :
                                    toolColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                                    toolColor === 'purple' ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200'
                                  }`}>
                                    <pre className="whitespace-pre-wrap break-words">
                                      {JSON.stringify(cleaned, null, 2)}
                                    </pre>
                                  </Accordion.Content>
                                </Accordion.Item>
                              </Accordion.Root>
                            </div>
                          )
                          // END: New conditional rendering
                        )}
                      </div>
                    );
                  })()}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };
  return (
    <>
      <Card className="w-full max-w-8xl mx-auto min-h-screen flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Shopping Assistant
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="h-[calc(100vh-150px)] overflow-y-auto p-4" ref={scrollAreaRef}>
            <div className="space-y-4 w-full max-w-7xl mx-auto break-words break-all whitespace-pre-wrap">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Welcome to your Shopping Assistant!</p>
                  <p className="text-sm">Say "I want to buy a laptop"</p>
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
                          <div className="max-w-4xl">{renderToolInvocation(part.toolInvocation, partIndex)}</div>
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
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Begin your shopping journey here..."
                className="flex-1"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isLoading && input.trim()) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading || !input.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}