import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Req } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MissionLoader } from "./loader";

@Controller("api/modules")
export class ModuleUploadController {
  constructor(private loader: MissionLoader) {}

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async uploadModule(@UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) {
      throw new BadRequestException("No ZIP file uploaded");
    }
    if (!file.originalname?.endsWith(".zip")) {
      throw new BadRequestException("File must be a ZIP archive");
    }
    // Placeholder: ZIP validation, ts-node compilation, registration
    // Implementation to follow per roadmap
    return { success: true, metadata: null };
  }
}