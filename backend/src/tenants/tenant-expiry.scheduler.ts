import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TenantsService } from './tenants.service';

/**
 * Prueft periodisch, ob bei einem Mandanten die Lizenz-Gueltigkeit ("Gueltig bis")
 * abgelaufen ist, und deaktiviert ihn in diesem Fall automatisch.
 */
@Injectable()
export class TenantExpiryScheduler implements OnModuleInit {
  private readonly logger = new Logger(TenantExpiryScheduler.name);

  constructor(private tenantsService: TenantsService) {}

  // Auch direkt beim Start pruefen, falls die Lizenz waehrend einer Downtime ablief.
  async onModuleInit() {
    await this.checkExpiredTenants();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkExpiredTenants() {
    const { deactivatedCount } = await this.tenantsService.deactivateExpiredTenants();
    if (deactivatedCount > 0) {
      this.logger.log(`${deactivatedCount} Mandant(en) wegen abgelaufener Lizenz automatisch deaktiviert`);
    }
  }
}
