import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDatabaseConfigured } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { CATALOG } from '@/engine/catalog';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = await enforceRateLimit(req, { limit: 60, windowSec: 60, prefix: 'prices_get' });
    if (rateLimitResponse) return rateLimitResponse;

    const userId = await getCurrentUserId();

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        source: 'local_fallback',
        prices: null
      });
    }

    const record = await prisma.globalPrices.findUnique({
      where: { userId }
    });

    return NextResponse.json({
      success: true,
      prices: record?.prices || null
    });
  } catch (error) {
    console.error('[API /api/prices GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener precios globales' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const rateLimitResponse = await enforceRateLimit(req, { limit: 60, windowSec: 60, prefix: 'prices_put' });
    if (rateLimitResponse) return rateLimitResponse;

    const userId = await getCurrentUserId();
    const body = await req.json();
    const prices = body.prices || body;

    if (!prices || typeof prices !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Objeto de precios inválido' },
        { status: 400 }
      );
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        source: 'local_fallback',
        prices
      });
    }

    // Ensure User exists before upserting global prices
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@gatc.local`,
        name: 'Usuario GATC'
      }
    });

    const updated = await prisma.globalPrices.upsert({
      where: { userId },
      update: {
        prices
      },
      create: {
        userId,
        prices
      }
    });

    return NextResponse.json({
      success: true,
      prices: updated.prices,
      updatedAt: updated.updatedAt
    });
  } catch (error) {
    console.error('[API /api/prices PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al guardar precios globales' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
