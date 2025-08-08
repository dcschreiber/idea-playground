import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import TurndownService from 'turndown';

// Minimal migration: copy markdown -> generate simple JSON envelope and store in content_json
// Backup entire collection locally first. Reversible and safe.

async function main() {
  const useEmulator = process.env.FIRESTORE_EMULATOR_HOST || process.env.USE_EMULATOR === '1';
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'idea-playground';
  initializeApp({ projectId });
  const db = getFirestore();

  console.log(`Starting migration (emulator=${!!useEmulator}) for project=${projectId}`);

  const backupDir = path.resolve(__dirname, '..', 'data', 'backups');
  try { fs.mkdirSync(backupDir, { recursive: true }); } catch {}
  const backupFile = path.join(backupDir, `content-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);

  const snapshot = await db.collection('ideas').get();
  const backup: any[] = [];
  const turndown = new TurndownService();
  let migrated = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() as any;
    backup.push({ id: doc.id, data });

    if (data.content_json) continue;

    const markdown = data.content || '';
    const html = (marked.parse(markdown || '') as string) || '';

    const jsonDoc = {
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: {}, content: [{ type: 'text', text: turndown.turndown(html) }] }
      ],
      _rawHtml: html,
      _source: 'migration-md-to-json-v1'
    };

    await db.collection('ideas').doc(doc.id).update({ content_json: jsonDoc, updatedAt: new Date() });
    migrated += 1;
  }

  fs.writeFileSync(backupFile, JSON.stringify({ when: new Date().toISOString(), count: snapshot.size, migrated, backup }, null, 2));
  console.log(`Backup written to ${backupFile}. Migrated ${migrated}/${snapshot.size} docs.`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});


