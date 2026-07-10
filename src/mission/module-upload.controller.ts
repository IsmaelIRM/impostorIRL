import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MissionLoader } from "./loader";
import { diskStorage } from "multer";
import { join } from "path";

@Controller("api/modules")
export class ModuleUploadController {
  constructor(private loader: MissionLoader) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: join(process.cwd(), "uploads"),
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
      }),
      fileFilter: (_req, file, cb) => cb(null, file.mimetype === "application/zip" || file.originalname?.endsWith(".zip")),
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  )
  async uploadModule(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No ZIP file uploaded");
    }
    // Placeholder: ZIP validation, ts-node compilation, registration
    return { success: true, metadata: null };
  }
}