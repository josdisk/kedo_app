import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { TenantGuard } from "../common/tenant.guard";
import { ColorService } from "./color.service";

@ApiTags("color")
@ApiHeader({ name: "x-kedov-user-id", required: true })
@ApiHeader({ name: "x-kedov-org-id", required: true })
@UseGuards(TenantGuard)
@Controller()
export class ColorController {
  constructor(@Inject(ColorService) private readonly color: ColorService) {}

  @Get("v1/color/ocio-config")
  getPackagedConfig() {
    return this.color.getPackagedConfig();
  }
}
