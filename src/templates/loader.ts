import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Template } from "./models";

export function loadTemplates(): Template[] {
  const templatesDir = join(process.cwd(), "src", "templates");
  try {
    const files = readdirSync(templatesDir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const content = readFileSync(join(templatesDir, f), "utf-8");
        return JSON.parse(content) as Template;
      });
  } catch {
    return [];
  }
}

export function loadTemplate(id: string): Template | undefined {
  const templates = loadTemplates();
  return templates.find((t) => t.id === id);
}