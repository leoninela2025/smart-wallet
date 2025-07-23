import os
import json
import aiohttp
from typing import Optional, List
from fastmcp import FastMCP
from dotenv import load_dotenv
import time
# Load environment variables
load_dotenv()
# Initialize FastMCP server
mcp = FastMCP(name="Logistics Server", version="1.0.0")
from pprint import pprint

# Configuration
PAYMENT_SERVICE = os.getenv("PAYMENT_SERVICE")
SESSIONS_SERVICE = os.getenv("TRANSFER_SERVICE")
TRANSFER_ENDPOINT = "api/sessions/transfer"
GET_SESSIONS_ENDPOINT = "api/sessions"

def is_non_empty_string(value: Optional[str]) -> bool:
    """Check if a string is non-empty"""
    return value is not None and value.strip() != ""

async def make_logistics_api_call(url: str, receiptToken: Optional[str] = None, payload: Optional[dict] = None) -> str:
    """Make API call to logistics service"""
    try:
        headers = {"Content-Type": "application/json"}
        
        if is_non_empty_string(receiptToken):
            headers["Authorization"] = f"Bearer {receiptToken}"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                data = await response.json()
                
            if response.status == 402:
                payment_option = data["paymentRequest"]["paymentOptions"][0]
                return json.dumps({
                    "status": 402,
                    "message": f"Successfully called {url}",
                    "recipient": payment_option["recipient"],
                    "amount": payment_option["amount"] / (10 ** payment_option["decimals"]),
                    "paymentOptionId": payment_option["id"],
                    "paymentToken": data["paymentToken"],
                    "purpose": "x402 endpoint",
                    "displayData": f"Hit a 402: Payment Required response when calling {url} ❗️"
                })
            else:
                if response.status == 200:
                    data["displayData"] = f"Successfully called the utility with receipt token"
                    data["purpose"] = "x402 endpoint"
                else:
                    data["displayData"] = f"Issue encountered when calling utility endpoint."
                return json.dumps(data)
                    
    except Exception as error:
        return json.dumps({
            "error": "Internal server error",
            "details": str(error)
        })



@mcp.tool
async def get_reviews(laptop_ids: List[str], receiptToken: Optional[str] = None) -> str:
    """Fetches information related to reviews and ratings for given laptop ids
    
    Args:
        laptop_ids: A list of laptop IDs to get ratings and reviews for
        receiptToken: The receipt token for verification
    
    Returns:
        JSON string with rating and review information
    """
    if not PAYMENT_SERVICE:
        return json.dumps({
            "error": "Payment service not configured",
            "details": "PAYMENT_SERVICE environment variable is not set"
        })
    
    url = f"{PAYMENT_SERVICE}/logistics/reviews"
    payload = {"laptopIds": laptop_ids} # Pass laptop_ids in the request body
    return await make_logistics_api_call(url, receiptToken, payload)


@mcp.tool
async def get_availability(laptop_ids: List[str], receiptToken: Optional[str] = None) -> str:
    """Fetches information related to availability for given laptop ids
    
    Args:
        laptop_ids: A list of laptop IDs to get availability for
        receiptToken: The receipt token for verification
    
    Returns:
        JSON string with availability information
    """
    if not PAYMENT_SERVICE:
        return json.dumps({
            "error": "Payment service not configured",
            "details": "PAYMENT_SERVICE environment variable is not set"
        })
    
    url = f"{PAYMENT_SERVICE}/logistics/availability"
    payload = {"laptopIds": laptop_ids} # Pass laptop_ids in the request body
    return await make_logistics_api_call(url, receiptToken, payload)

@mcp.tool
async def get_laptops():
    """
    Returns a list of all laptops available in inventory with images
    """
    if not PAYMENT_SERVICE:
        return json.dumps({
            "error": "Payment service not configured",
            "details": "PAYMENT_SERVICE environment variable is not set"
        })
    
    url = f"{PAYMENT_SERVICE}/get-laptops"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                data = await response.json()
                data["images"] = True
                # Ensure each laptop has an image URL
                for laptop in data["items"]:
                    if 'image' not in laptop or not laptop['image']:
                        # Add placeholder image if no image is provided
                        laptop['image'] = f"/{laptop["id"]}.png"
                data["purpose"] = "get-all for inventory"
                return json.dumps(data)
    except Exception as error:
        return json.dumps({
            "error": "Internal server error",
            "details": str(error)
        })
    

@mcp.tool
async def get_laptop(laptopId):
    """
    Returns the laptop with the given laptop id available in inventory with its image
    """
    if not PAYMENT_SERVICE:
        return json.dumps({
            "error": "Payment service not configured",
            "details": "PAYMENT_SERVICE environment variable is not set"
        })
    
    url = f"{PAYMENT_SERVICE}/get-laptops/{laptopId}"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                data = await response.json()
                data["images"] = True
                # Ensure each laptop has an image URL
                for laptop in data["items"]:
                    if 'image' not in laptop or not laptop['image']:
                        # Add placeholder image if no image is provided
                        laptop['image'] = f"/{laptop["id"]}.png"
                data["purpose"] = "viewing a specific product"
                return json.dumps(data)
    except Exception as error:
        return json.dumps({
            "error": "Internal server error",
            "details": str(error)
        })
    
@mcp.tool
async def purchase_laptop(laptopId):
    """
    Fulfils the request of buying a laptop
    """
    if not PAYMENT_SERVICE:
        return json.dumps({
            "error": "Payment service not configured",
            "details": "PAYMENT_SERVICE environment variable is not set"
        })
    
    url = f"{PAYMENT_SERVICE}/get-laptops/{laptopId}"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                data = await response.json()
                data["purpose"] = "making a purchase"
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
                time.sleep(3) 
                data["paymentOptionId"] = paymentOptionId
                data["purpose"] = f"{data["transactionHash"]}"

                data["displayData"] = f"Made a payment for {amount} USDC to merchant with address: {recipientAddress}"
                return json.dumps(data)
                    
    except Exception as error:
        return json.dumps({
            "error": "Internal server error",
            "details": str(error)
        })

@mcp.tool
async def get_receipt(sessionId, paymentToken, transactionHash, paymentOptionId) -> str:
    """Gets the receipt for verification of an on chain transaction.
    
    Args:
        sessionId: The current session id of agent
        paymentToken: jwt token for payment to get receipt for
        transactionHash: the transaction hash of on chain payment
        paymentOptionId: the payment option id use case for the transaction. 
    
    Returns:
        JSON string with receipt information
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
                "paymentToken": paymentToken, "settlementTxnHash": transactionHash, "clientPrivateKey": sessionData["sessionPrivateKey"], "paymentOptionId": paymentOptionId, "smartWalletAddress": sessionData["smartWalletAddress"]
            }
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=reqData) as response:
                data = await response.json()
                ret = {"receipt": data["receipt"]}
                print(ret)
                ret["purpose"] = "Verification service endpoint"
                ret["displayData"] = f"Obtained a receipt for the transaction: {transactionHash}, receipt token: {data["receipt"][:15]}..."

                return json.dumps(ret)
            
                    
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