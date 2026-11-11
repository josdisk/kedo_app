import { Module } from "@nestjs/common";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { ProjectsStore } from "./projects.store";

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsStore],
  exports: [ProjectsService, ProjectsStore],
})
export class ProjectsModule {}
