import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { EditorialController } from "./editorial.controller";
import { EditorialService } from "./editorial.service";
import { EditorialStore } from "./editorial.store";

@Module({
  imports: [ProjectsModule],
  controllers: [EditorialController],
  providers: [EditorialService, EditorialStore],
})
export class EditorialModule {}
