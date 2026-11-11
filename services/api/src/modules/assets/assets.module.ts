import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { AssetsController } from "./assets.controller";
import { AssetsService } from "./assets.service";
import { AssetsStore } from "./assets.store";

@Module({
  imports: [ProjectsModule],
  controllers: [AssetsController],
  providers: [AssetsService, AssetsStore],
  exports: [AssetsService, AssetsStore],
})
export class AssetsModule {}
