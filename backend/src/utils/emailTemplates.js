import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getEmailTemplate(templateName, variables = {}) {
  try {
    const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
    let template = await fs.readFile(templatePath, 'utf-8');

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      template = template.replace(new RegExp(placeholder, 'g'), value);
    }

    return template;
  } catch (_error) {
    throw new Error(`Failed to load email template: ${templateName}`);
  }
}