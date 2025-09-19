import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getEmailTemplate(
  templateName: string,
  variables: Record<string, unknown> = {}
): Promise<string> {
  try {
    const templatePath = path.resolve(__dirname, '../templates/emails', `${templateName}.html`);
    let template = await fs.readFile(templatePath, 'utf-8');

    for (const [key, rawValue] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      // Use a safe global replacement that respects literal braces
      const pattern = new RegExp(escapeRegExp(placeholder), 'g');
      const value = String(rawValue ?? '');
      template = template.replace(pattern, value);
    }

    return template;
  } catch (_error) {
    throw new Error(`Failed to load email template: ${templateName}`);
  }
}
