import { db } from '../db';
import { appSettings } from '../db/schema/pos';
import { eq } from 'drizzle-orm';

async function main() {
  await db.insert(appSettings).values({
    key: 'ai_provider',
    value: 'groq',
    description: 'Current AI Provider for Chatbot'
  }).onConflictDoUpdate({
    target: appSettings.key,
    set: { value: 'groq' }
  });
  console.log('AI Provider set to Groq');
}

main().catch(console.error);
