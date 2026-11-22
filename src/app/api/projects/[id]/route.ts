import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDatabaseConfigured } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { sanitizeProjectName } from '@/utils/sanitize';
import { validateGatcFile } from '@/lib/validators';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const userId = await getCurrentUserId();

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Database not connected, use local storage', source: 'offline' },
        { status: 404 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: sanitizeProjectName(project.name),
        state: project.state,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    });
  } catch (error) {
    console.error(`[API /api/projects/${params.id} GET] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener el proyecto' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const userId = await getCurrentUserId();
    const body = await req.json();

    const { name, state } = body;

    const dataToUpdate: any = {};
    if (name) {
      dataToUpdate.name = sanitizeProjectName(name);
    }
    if (state) {
      const validation = validateGatcFile(state);
      if (!validation.isValid && validation.errors.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Estado de proyecto inválido', details: validation.errors },
          { status: 400 }
        );
      }
      dataToUpdate.state = state;
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        source: 'local_fallback',
        project: {
          id,
          ...dataToUpdate,
          updatedAt: new Date().toISOString()
        }
      });
    }

    // Upsert project so that projects created offline can be synced directly via PUT
    const project = await prisma.project.upsert({
      where: { id },
      update: dataToUpdate,
      create: {
        id,
        userId,
        name: dataToUpdate.name || 'Proyecto Sin Nombre',
        state: dataToUpdate.state || {}
      }
    });

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        state: project.state,
        updatedAt: project.updatedAt
      }
    });
  } catch (error) {
    console.error(`[API /api/projects/${params.id} PUT] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar el proyecto' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const userId = await getCurrentUserId();

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        source: 'local_fallback',
        deletedId: id
      });
    }

    await prisma.project.deleteMany({
      where: {
        id,
        userId
      }
    });

    return NextResponse.json({
      success: true,
      deletedId: id
    });
  } catch (error) {
    console.error(`[API /api/projects/${params.id} DELETE] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar el proyecto' },
      { status: 500 }
    );
  }
}
