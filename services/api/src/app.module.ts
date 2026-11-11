import { Module } from "@nestjs/common";
import { AssetsModule } from "./modules/assets/assets.module";
import { ColorModule } from "./modules/color/color.module";
import { AuthModule } from "./modules/common/auth.module";
import { DbModule } from "./modules/db/db.module";
import { EditorialModule } from "./modules/editorial/editorial.module";
import { HealthModule } from "./modules/health/health.module";
import { PreviewModule } from "./modules/preview/preview.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { SyncModule } from "./modules/sync/sync.module";

@Module({
  imports: [
    AuthModule,
    DbModule,
    HealthModule,
    ProjectsModule,
    AssetsModule,
    SyncModule,
    EditorialModule,
    PreviewModule,
    ColorModule,
  ],
})
export class AppModule {}

