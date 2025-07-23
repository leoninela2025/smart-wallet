"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import * as Accordion from "@radix-ui/react-accordion"
import Image from "next/image"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Fingerprint, Shield, CheckCircle, X, RefreshCw } from "lucide-react"
import { useEffect } from "react"
import { useMotionValue, animate } from "framer-motion"


interface WalletCardModalProps {
  onFundWallet: () => Promise<void>
  cardLogoPath?: string
  creditLimit: number
  onChainBalance: number
  onRefreshBalances?: () => Promise<void>
}

interface ProgressStep {
  id: string
  message: string
  completed: boolean
}

export default function WalletCardModal({ onFundWallet, cardLogoPath = "/mastercard-logo.svg", creditLimit, onChainBalance, onRefreshBalances }: WalletCardModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [showPasskey, setShowPasskey] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authSuccess, setAuthSuccess] = useState(false)
  const [authMethod, setAuthMethod] = useState<'fingerprint'>('fingerprint')
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const [selectedCard, setSelectedCard] = useState<{ last4: string; expiry: string; bg: string } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefreshBalances = async () => {
    if (!onRefreshBalances) return
    setIsRefreshing(true)
    try {
      await onRefreshBalances()
    } finally {
      setIsRefreshing(false)
    }
  }

  const creditLimitMotion = useMotionValue(creditLimit)
  const onChainBalanceMotion = useMotionValue(onChainBalance)

  const [creditDisplay, setCreditDisplay] = useState(creditLimit)
  const [onChainDisplay, setOnChainDisplay] = useState(onChainBalance)

  // Update display values when props change
  useEffect(() => {
    setCreditDisplay(creditLimit)
    setOnChainDisplay(onChainBalance)
    creditLimitMotion.set(creditLimit)
    onChainBalanceMotion.set(onChainBalance)
  }, [creditLimit, onChainBalance, creditLimitMotion, onChainBalanceMotion])

  useEffect(() => {
    if (progressSteps.length > 0 && progressSteps.every(s => s.completed) && selectedAmount != null) {
      const controls1 = animate(creditLimitMotion, creditLimit - selectedAmount, {
        duration: 1,
        onUpdate: latest => setCreditDisplay(latest),
      })

      const controls2 = animate(onChainBalanceMotion, onChainBalance + selectedAmount, {
        duration: 1,
        onUpdate: latest => setOnChainDisplay(latest),
      })

      return () => {
        controls1.stop()
        controls2.stop()
      }
    }
  }, [progressSteps, selectedAmount, creditLimit, onChainBalance])

  const cards = [
    { last4: "1234", expiry: "12/26", bg: "from-blue-600 to-indigo-700" }
  ]

  const handleCardClick = (card: { last4: string; expiry: string; bg: string }) => {
    setSelectedCard(card)
    setProgressSteps([]) // Reset progress
  }

  const handleAmountSelection = (amount: number) => {
    if (!selectedCard) return
    setSelectedAmount(amount)
    setShowPasskey(true)
  }

  const handlePasskeyAuth = async () => {
    if (!selectedAmount || !selectedCard) return

    setIsAuthenticating(true)

    const steps: ProgressStep[] = [
      { id: '1', message: `Debiting $${selectedAmount} from card ending in ${selectedCard.last4}`, completed: false },
      { id: '2', message: `Preparing on chain transaction for ${selectedAmount} USDC`, completed: false },
      { id: '3', message: `Broadcasting transaction on chain for ${selectedAmount} USDC`, completed: false },
      { id: '4', message: `${selectedAmount} USDC credited to on chain wallet!`, completed: false }
    ]

    setProgressSteps(steps)

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800))
      setProgressSteps(prev =>
        prev.map((step, index) =>
          index === i ? { ...step, completed: true } : step
        )
      )
    }

    await new Promise(resolve => setTimeout(resolve, 1000))

    setAuthSuccess(true)
    await new Promise(resolve => setTimeout(resolve, 1500))

    setSelectedAmount(null)
    setSelectedCard(null)
    setShowPasskey(false)
    setIsAuthenticating(false)
    setAuthSuccess(false)

    await onFundWallet()
  }

  const handleCancelAuth = () => {
    setShowPasskey(false)
    setIsAuthenticating(false)
    setAuthSuccess(false)
  }

  const authMethodIcons = {
    fingerprint: Fingerprint
  }

  const AuthIcon = authMethodIcons[authMethod]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Balance Display - Always Visible */}
      <div className="flex justify-center items-center gap-6 mb-8">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center bg-red-50 px-6 py-4 rounded-lg border border-red-200 shadow-sm"
        >
          <p className="text-sm text-red-600 font-medium">Credit Limit</p>
          <p className="text-2xl font-bold text-red-700">${Math.round(creditDisplay).toLocaleString()}</p>
        </motion.div>


        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center bg-green-50 px-6 py-4 rounded-lg border border-green-200 shadow-sm"
          >
          <p className="text-sm text-green-600 font-medium">On-chain Balance</p>
          <p className="text-2xl font-bold text-green-700">{onChainDisplay.toFixed(2)} USDC</p>
        </motion.div>
          {onRefreshBalances && (
            <motion.button
              onClick={handleRefreshBalances}
              disabled={isRefreshing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw 
                className={`w-5 h-5 text-blue-600 transition-transform ${
                  isRefreshing ? 'animate-spin' : ''
                }`} 
              />
            </motion.button>
          )}
      </div>

      <div className="flex flex-col gap-8">
        <AnimatePresence mode="wait">
          {!showPasskey ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }} 
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col items-center gap-6">
                {/* Larger Credit Card */}
                <div className="flex justify-center">
                  {cards.map((card, idx) => (
                    <motion.div 
                      key={idx} 
                      whileHover={{ scale: 1.02 }} 
                      whileTap={{ scale: 0.98 }} 
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Card
                        className={`w-80 h-48 p-6 rounded-2xl shadow-lg cursor-pointer bg-gradient-to-br ${card.bg} text-white relative overflow-hidden ${
                          selectedCard?.last4 === card.last4 ? 'ring-4 ring-blue-400' : ''
                        }`}
                        onClick={() => handleCardClick(card)}
                      >
                        <div className="w-12 h-8 bg-yellow-300 rounded-sm mb-4" />
                        <div className="text-lg tracking-widest font-mono whitespace-nowrap mb-6">
                          **** **** **** {card.last4}
                        </div>
                        <div className="flex justify-between items-center text-sm font-light">
                          <div>
                            <p className="uppercase text-xs text-white/70">Expires</p>
                            <p className="text-base">{card.expiry}</p>
                          </div>
                          <Image 
                            src={cardLogoPath} 
                            width={50} 
                            height={30} 
                            alt="Card logo" 
                            className="object-contain" 
                          />
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Amount Selection - Always Visible */}
                <div className="flex justify-center gap-4">
                  {[1, 5, 10].map((amount) => (
                    <motion.div 
                      key={amount} 
                      whileHover={{ scale: 1.05 }} 
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        onClick={() => handleAmountSelection(amount)} 
                        disabled={!selectedCard}
                        className={`px-8 py-4 text-lg font-semibold ${
                          selectedAmount === amount 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                        size="lg"
                      >
                        {amount} USDC
                      </Button>
                    </motion.div>
                  ))}
                </div>

                {!selectedCard && (
                  <p className="text-gray-500 text-center">Select a card to continue</p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }} 
              transition={{ duration: 0.4 }} 
              className="flex flex-col items-center justify-center py-8"
            >
              <AnimatePresence mode="wait">
                {authSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.5 }} 
                    transition={{ duration: 0.5, ease: "backOut" }} 
                    className="flex flex-col items-center"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <motion.h2 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: 0.2 }} 
                      className="text-xl font-semibold mb-2 text-green-600"
                    >
                      Authentication Successful!
                    </motion.h2>
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: 0.3 }} 
                      className="text-gray-600"
                    >
                      Processing your payment of {selectedAmount} USDC...
                    </motion.p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.4 }} 
                    className="flex flex-col items-center"
                  >
                    <div className="flex items-center gap-2 mb-6">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <h2 className="text-xl font-semibold">Secure Authentication</h2>
                    </div>

                    <div className="relative mb-6">
                      <motion.div
                        className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
                          isAuthenticating ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg' : 'border-gray-300 bg-gray-50'
                        }`}
                        animate={isAuthenticating ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <AuthIcon className={`w-16 h-16 transition-all duration-500 ${isAuthenticating ? 'text-blue-500' : 'text-gray-400'}`} />
                      </motion.div>
                    </div>

                    <motion.div className="text-center mb-6">
                      <p className="text-gray-700 mb-2 font-medium">
                        {isAuthenticating ? "Processing payment..." : "Authenticate to continue"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {authMethod === 'fingerprint' && "Place your finger on the sensor"}
                      </p>
                    </motion.div>

                    <div className="flex gap-2 mb-6">
                      {(['fingerprint'] as const).map((method) => {
                        const Icon = authMethodIcons[method]
                        return (
                          <motion.button 
                            key={method} 
                            whileHover={{ scale: 1.1 }} 
                            whileTap={{ scale: 0.9 }} 
                            onClick={() => setAuthMethod(method)} 
                            disabled={isAuthenticating}
                            className={`p-3 rounded-lg transition-all ${
                              authMethod === method
                                ? 'bg-blue-100 text-blue-600 border-2 border-blue-300'
                                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </motion.button>
                        )
                      })}
                    </div>

                    <div className="flex gap-3">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          onClick={handlePasskeyAuth} 
                          disabled={isAuthenticating} 
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg shadow-md"
                        >
                          {isAuthenticating ? (
                            <div className="flex items-center gap-2">
                              <motion.div 
                                animate={{ rotate: 360 }} 
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }} 
                                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" 
                              />
                              Processing...
                            </div>
                          ) : (
                            "Authenticate"
                          )}
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          variant="outline" 
                          onClick={handleCancelAuth} 
                          disabled={isAuthenticating} 
                          className="px-6 py-2 rounded-lg"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {progressSteps.length > 0 && (
          <Accordion.Root
            type="single"
            collapsible
            className="w-full max-w-md mx-auto mb-6 border rounded-lg shadow"
            defaultValue="progress"
          >
            <Accordion.Item value="progress">
              <Accordion.Header>
                <Accordion.Trigger className="w-full text-left px-4 py-2 bg-gray-100 font-semibold text-gray-800">
                  View Payment Progress
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="p-4 space-y-3">
                {progressSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step.completed ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                      {step.completed ? <CheckCircle className="w-4 h-4" /> : null}
                    </div>
                    <span className={step.completed ? "text-green-700" : "text-gray-700"}>{step.message}</span>
                  </div>
                ))}
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        )}
      </div>
    </div>
  )
}