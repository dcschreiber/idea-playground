import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import { generateJSON } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'idea-playground';
  initializeApp({ projectId });
  const db = getFirestore();

  console.log(`Starting migration to content_json (dryRun=${dryRun}) for project=${projectId}`);

  const backupDir = path.resolve(__dirname, '..', 'data', 'backups');
  try { fs.mkdirSync(backupDir, { recursive: true }); } catch {}
  const backupFile = path.join(backupDir, `content-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);

  const snapshot = await db.collection('ideas').get();
  const backup = [];
  let migrated = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    backup.push({ id: doc.id, data });
    if (data.content_json) continue;

    const markdown = data.content || '';
    const html = (marked.parse(markdown || '') || '').toString();
    const jsonDoc = generateJSON(html, [StarterKit]);

    if (!dryRun) {
      await db.collection('ideas').doc(doc.id).update({ content_json: jsonDoc, updatedAt: new Date() });
    }
    migrated += 1;
  }

  fs.writeFileSync(backupFile, JSON.stringify({ when: new Date().toISOString(), count: snapshot.size, migrated, backup }, null, 2));
  console.log(`Backup written to ${backupFile}. Migrated ${migrated}/${snapshot.size} docs${dryRun ? ' (dry run)' : ''}.`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});


