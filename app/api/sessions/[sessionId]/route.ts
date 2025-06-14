import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type SessionKeyData = {
  id: string;
  address: string;
  privateKey: string;
  sessionEntityId: number;
  hookEntityId: number;
};

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const filePath = path.join(process.cwd(), 'session-keys.json');
    const sessions = JSON.parse(await fs.promises.readFile(filePath, 'utf-8')) as SessionKeyData[];
    
    const session = sessions.find((s) => s.id === params.sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sessionKeyAddress: session.address,
      installParams: {
        validationConfig: {
          entityId: session.sessionEntityId
        }
      }
    });
    
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 