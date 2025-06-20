import os
import json
import aiohttp
from typing import Optional
from fastmcp import FastMCP
from dotenv import load_dotenv
import time
# Load environment variables
load_dotenv()
# Initialize FastMCP server
mcp = FastMCP(name="Logistics Server", version="1.0.0")

# Configuration
PAYMENT_SERVICE = os.getenv("PAYMENT_SERVICE")
SESSIONS_SERVICE = os.getenv("TRANSFER_SERVICE")
TRANSFER_ENDPOINT = "api/sessions/transfer"
GET_SESSIONS_ENDPOINT = "api/sessions"

def is_non_empty_string(value: Optional[str]) -> bool:
    """Check if a string is non-empty"""
    return value is not None and value.strip() != ""

async def make_logistics_api_call(url: str, transactionHash: Optional[str] = None) -> str:
    """Make API call to logistics service"""
    try:
        headers = {"Content-Type": "application/json"}
        
        if is_non_empty_string(transactionHash):
            headers["X-Transaction-Hash"] = transactionHash
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers) as response:
                data = await response.json()
                
                if response.status == 402:
                    payment_option = data["paymentRequest"]["paymentOptions"][0]
                    return json.dumps({
                        "status": 402,
                        "message": f"Successfully called {url}",
                        "recipient": payment_option["recipient"],
                        "amount": payment_option["amount"] / (10 ** payment_option["decimals"]),
                        "paymentOptionId": payment_option["id"],
                        "paymentToken": data["paymentToken"]
                    })
                else:
                    return json.dumps(data)
                    
    except Exception as error:
        return json.dumps({
            "error": "Internal server error",
            "details": str(error)
        })


@mcp.tool
async def get_delivery_estimate(watch_id: int, transactionHash: Optional[str] = None) -> str:
    """Provides a delivery estimate for the given watch ID.
    
    Args:
        watch_id: The watch ID to get delivery estimate for
        transactionHash: The on chain transaction hash for verification
    
    Returns:
        JSON string with delivery estimate information
    """
    if not PAYMENT_SERVICE:
        return json.dumps({
            "error": "Payment service not configured",
            "details": "PAYMENT_SERVICE environment variable is not set"
        })
    
    url = f"{PAYMENT_SERVICE}/logistics/quote/{watch_id}"
    return await make_logistics_api_call(url, transactionHash)

@mcp.tool
async def get_warranty_check(watch_id: int, transactionHash: Optional[str] = None) -> str:
    """Provides a warranty check for the given watch ID.
    
    Args:
        watch_id: The watch ID to check warranty for
        transactionHash: The on chain transaction hash for verification
    
    Returns:
        JSON string with warranty check information
    """
    if not PAYMENT_SERVICE:
        return json.dumps({
            "error": "Payment service not configured",
            "details": "PAYMENT_SERVICE environment variable is not set"
        })
    
    url = f"{PAYMENT_SERVICE}/warranty/check/{watch_id}"
    return await make_logistics_api_call(url, transactionHash)

@mcp.tool
async def get_watches():
    """
    Returns a list of all watches available in inventory
    """
    if not PAYMENT_SERVICE:
        return json.dumps({
            "error": "Payment service not configured",
            "details": "PAYMENT_SERVICE environment variable is not set"
        })
    
    url = f"{PAYMENT_SERVICE}/get-watches"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                data = await response.json()
                return json.dumps(data)
    except Exception as error:
        return json.dumps({
            "error": "Internal server error",
            "details": str(error)
        })

async def getSessionData(sessionId):
    urlGetSessionData = f"{SESSIONS_SERVICE}/{GET_SESSIONS_ENDPOINT}/{sessionId}"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(urlGetSessionData) as response:
                data = await response.json()
                return json.dumps(data)

    except Exception as error:
        return json.dumps({
            "error": "Internal server error getting session data",
            "details": str(error)
        })




@mcp.tool
async def make_payment(paymentOptionId: str, senderAddress: str, sessionId: str, recipientAddress: str, amount: float) -> str:
    """
    Endpoint to make payment through the /api/sessions/transfer endpoint.
    """
    if not SESSIONS_SERVICE:
        return json.dumps({
            "error": "Transfer Service not configured",
            "details": "TRANSFER_SERVICE environment variable is not set"
        })
    
    
    url = f"{SESSIONS_SERVICE}/{TRANSFER_ENDPOINT}"
    try:
        reqData = data = {
                "accountAddress": senderAddress, "sessionId": sessionId, "amount": amount, "recipient": recipientAddress
            }
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=reqData) as response:
                data = await response.json() 
                data["paymentOptionId"] = paymentOptionId
                return json.dumps(data)
                    
    except Exception as error:
        return json.dumps({
            "error": "Internal server error",
            "details": str(error)
        })



@mcp.tool
async def get_receipt(sessionId, paymentToken, transactionHash, paymentOptionId) -> str:
    """Provides a warranty check for the given watch ID.
    
    Args:
        watch_id: The watch ID to check warranty for
        receipt_token: Optional receipt token for verification
    
    Returns:
        JSON string with warranty check information
    """
    if not PAYMENT_SERVICE:
        return json.dumps({
            "error": "Payment service not configured",
            "details": "PAYMENT_SERVICE environment variable is not set"
        })
    sessionData = json.loads(await getSessionData(sessionId))
    url = f"{PAYMENT_SERVICE}/get-receipt"
    try:
        reqData = data = {
                "paymentToken": paymentToken, "settlementTxnHash": transactionHash, "clientPrivateKey": sessionData["sessionPrivateKey"], "paymentOptionId": paymentOptionId
            }
        print(reqData)
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=reqData) as response:
                data = await response.json()
                return json.dumps(data)
            
                    
    except Exception as error:
        return json.dumps({
            "error": "Internal server error",
            "details": str(error)
        })

if __name__ == "__main__":
    print("Starting Logistics MCP Server...")
    print(f"Payment Service URL: {PAYMENT_SERVICE}")
    print("\nServer running on port 8080 with SSE transport")
    
    mcp.run(transport="sse", port=8080)