import { Global, Module } from '@nestjs/common';
import { HistoryService } from './history.service';

/** Cross-cutting services every feature module needs without importing anything. */
@Global()
@Module({
  providers: [HistoryService],
  exports: [HistoryService],
})
export class CommonModule {}
