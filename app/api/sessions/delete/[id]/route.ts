import { NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';

const SESSION_KEYS_PATH = path.join(process.cwd(), 'session-keys.json');

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Read existing session keys
    const fileData = await fs.readFile(SESSION_KEYS_PATH, 'utf8');
    const sessionKeys = JSON.parse(fileData);
    
    // Find and remove the session key
    const initialLength = sessionKeys.length;
    const filteredKeys = sessionKeys.filter((key: any) => key.id !== id);
    
    if (filteredKeys.length === initialLength) {
      return NextResponse.json(
        { error: 'Session key not found' },
        { status: 404 }
      );
    }

    // Save updated keys
    await fs.writeFile(
      SESSION_KEYS_PATH,
      JSON.stringify(filteredKeys, null, 2)
    );

    return NextResponse.json(
      { success: true, message: 'Session key deleted' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Delete session key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
} 