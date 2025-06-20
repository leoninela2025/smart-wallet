// app/api/example/route.ts

import { NextRequest, NextResponse } from 'next/server';

const paymentService = process.env.PAYMENT_SERVICE

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

export async function GET(req: NextRequest, { params }: { params: { watchId: string } }) {
  try {
    // Call another API on localhost

    const { watchId } = params;
    const receiptToken = req.headers.get("receipt-token")
    const url = `${paymentService}/logistics/quote/${watchId}`
    let reqHeaders: Record<string, string> =  {
        'Content-Type': 'application/json',
    }
    if (receiptToken !== null && isNonEmptyString(receiptToken)) {
        reqHeaders = {
            ...reqHeaders,
            'Authorization': `Bearer ${receiptToken}`
        }
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: reqHeaders,
    });

    const data = await res.json();

    const paymentOption = data.paymentRequest.paymentOptions[0];

    return NextResponse.json({
      message: 'Successfully called internal API',
    //   data,
      paymentToken: data.paymentToken,
      recipient: paymentOption.recipient,
      amount: paymentOption.amount / (10 ** paymentOption.decimals)
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', details: (error as Error).message }, { status: 500 });
  }
}




