import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/infrastructure/prisma';
import { jwtVerify } from 'jose';
import { handleApiError } from '@/shared/kernel/error-handler';
import { verifyTokenSchema } from '@/shared/validation/auth-schemas';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    return await verifyEmailToken(token);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = verifyTokenSchema.parse(await request.json());
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    return await verifyEmailToken(token);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

async function verifyEmailToken(token: string) {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret);

  if ((payload as any).purpose !== 'email-verification') {
    return NextResponse.json({ error: 'Invalid token purpose' }, { status: 400 });
  }

  const userId = payload.sub;
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ success: true, message: 'Email already verified' });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });

  return NextResponse.json({ success: true });
}
