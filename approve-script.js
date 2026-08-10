const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: '7kf72dsd',
  dataset: 'production',
  apiVersion: '2021-10-21',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

async function approve() {
  const ids = [
    'ek4pKd5NOgHrvnAUS4hi75',
    'ek4pKd5NOgHrvnAUS4hix5'
  ];
  
  for (const id of ids) {
    await client.patch(id).set({pipelineStatus: 'approved'}).commit();
    console.log('Approved:', id);
  }
}

approve().catch(console.error);
