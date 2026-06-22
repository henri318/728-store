import { NextRequest, NextResponse } from 'next/server';
import { VerifyEmailUseCase } from '@/modules/auth/application/verify-email';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { verifyTokenSchema } from '@/modules/auth/presentation/schemas/auth-schemas';

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
  const useCase = new VerifyEmailUseCase(
    container.getSecrets(),
    container.getUserVerification(),
  );

  const result = await useCase.execute({ token });

  if (!result.success) {
    return NextResponse.json(
      { error: result.message },
      { status: result.statusCode ?? 400 },
    );
  }

  return NextResponse.json({ success: true, message: result.message });
}
