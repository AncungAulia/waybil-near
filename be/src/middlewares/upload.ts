import multer from "multer";
import type { RequestHandler } from "express";
import { ApiException } from "../lib/errors";
export function uploadFiles(field: string, count: number): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2097152, files: count, fields: 8, fieldSize: 16384, parts: count + 8 },
  }).array(field, count);
  return (req, res, next) => {
    upload(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError)
        next(
          new ApiException(
            error.code === "LIMIT_FILE_SIZE" ? 413 : 400,
            error.code === "LIMIT_FILE_SIZE" ? "E_TOO_LARGE" : "E_VALIDATION",
          ),
        );
      else next(error ? new ApiException(400, "E_VALIDATION") : undefined);
    });
  };
}
export function uploaded(req: Express.Request): Express.Multer.File[] {
  return Array.isArray(req.files) ? req.files : [];
}
