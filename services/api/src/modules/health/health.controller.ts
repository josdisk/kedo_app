import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOkResponse({ description: "Liveness" })
  getHealth() {
    return {
      status: "ok",
      service: "kedov-api",
      revision: "r0",
    };
  }
}
