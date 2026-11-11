import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";
import { SyncStore } from "./sync.store";

@Module({
  imports: [ProjectsModule],
  controllers: [SyncController],
  providers: [SyncService, SyncStore],
  exports: [SyncService],
})
export class SyncModule {}
