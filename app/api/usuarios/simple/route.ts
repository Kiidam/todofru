import { NextRequest } from 'next/server';
import { withAuth, withErrorHandling, successResponse } from '../../../../src/lib/api-utils';
import { prisma } from '../../../../src/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(withAuth(async (_request: NextRequest) => {
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true }
  });
  return successResponse({ data: users });
}));
