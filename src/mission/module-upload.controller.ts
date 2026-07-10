import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("api/modules")
export class ModuleUploadController {
  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async uploadModule(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No ZIP file uploaded");
    }
    return { success: true, metadata: null };
  }
}