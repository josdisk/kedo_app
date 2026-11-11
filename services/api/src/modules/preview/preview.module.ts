import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { PreviewController } from "./preview.controller";
import { PreviewService } from "./preview.service";
import { PreviewStore } from "./preview.store";

@Module({
  imports: [ProjectsModule],
  controllers: [PreviewController],
  providers: [PreviewService, PreviewStore],
})
export class PreviewModule {}
