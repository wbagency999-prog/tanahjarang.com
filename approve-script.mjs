import { writeClient } from './sanity/writeClient.ts';

const ids = [
  'ek4pKd5NOgHrvnAUS4hi75',
  'ek4pKd5NOgHrvnAUS4hix5'
];

for (const id of ids) {
  await writeClient.patch(id).set({pipelineStatus: 'approved'}).commit();
  console.log('Approved:', id);
}
