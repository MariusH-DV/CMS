import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });
    if (!user || !user.active) {
      throw new UnauthorizedException('E-Mail oder Passwort ist falsch');
    }
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('E-Mail oder Passwort ist falsch');
    }
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isSystemAdmin: user.isSystemAdmin,
      memberships: user.memberships.map((m) => ({
        tenantId: m.tenantId,
        role: m.role,
        permissions: m.permissions,
      })),
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSystemAdmin: user.isSystemAdmin,
        memberships: payload.memberships,
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { tenant: true } } },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
