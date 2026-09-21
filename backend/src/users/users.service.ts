import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private tenantsService: TenantsService,
  ) {}

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Ein Benutzer mit dieser E-Mail existiert bereits');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isSystemAdmin: dto.isSystemAdmin ?? false,
      },
    });
    const { passwordHash: _hash, ...safe } = user;
    return safe;
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      include: { memberships: { include: { tenant: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map(({ passwordHash: _hash, ...safe }) => safe);
  }

  async listMembers(tenantId: string) {
    return this.prisma.tenantMembership.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, active: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(tenantId: string, dto: AddMemberDto) {
    await this.tenantsService.assertCanAddUser(tenantId);

    let user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      if (!dto.password || !dto.firstName || !dto.lastName) {
        throw new ConflictException(
          'Fuer neue Benutzer sind Passwort, Vorname und Nachname erforderlich',
        );
      }
      const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });
    }

    const existingMembership = await this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
    });
    if (existingMembership) {
      throw new ConflictException('Benutzer ist bereits Mitglied dieses Mandanten');
    }

    return this.prisma.tenantMembership.create({
      data: {
        userId: user.id,
        tenantId,
        role: dto.role,
        permissions: dto.permissions ?? [],
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async updateMember(tenantId: string, membershipId: string, dto: UpdateMemberDto) {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: { id: membershipId, tenantId },
    });
    if (!membership) {
      throw new NotFoundException('Mitgliedschaft nicht gefunden');
    }
    return this.prisma.tenantMembership.update({
      where: { id: membershipId },
      data: {
        role: dto.role,
        permissions: dto.permissions,
      },
    });
  }

  async removeMember(tenantId: string, membershipId: string) {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: { id: membershipId, tenantId },
    });
    if (!membership) {
      throw new NotFoundException('Mitgliedschaft nicht gefunden');
    }
    await this.prisma.tenantMembership.delete({ where: { id: membershipId } });
    return { success: true };
  }
}
