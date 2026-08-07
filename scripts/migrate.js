// Migration script: Create missing categories & reassign articles
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

(async () => {
  // 1. Create missing categories
  const catsToCreate = [
    { title: 'Nasional', slug: 'nasional', description: 'Berita dalam negeri Indonesia' },
    { title: 'Internasional', slug: 'internasional', description: 'Berita dunia internasional' },
    { title: 'Hiburan', slug: 'hiburan', description: 'Berita hiburan dan selebriti' },
    { title: 'Pendidikan', slug: 'pendidikan', description: 'Berita pendidikan' },
  ];

  for (const cat of catsToCreate) {
    const existing = await client.fetch('*[_type == "category" && slug.current == $slug][0]._id', { slug: cat.slug });
    if (!existing) {
      const doc = await client.create({ _type: 'category', ...cat, slug: { _type: 'slug', current: cat.slug } });
      console.log('Created:', cat.title, doc._id);
    } else {
      console.log(cat.title, 'already exists:', existing);
    }
  }

  // 2. Get kesehatan ID
  const kesehatan = await client.fetch('*[_type == "category" && slug.current == "kesehatan"][0]{ _id }');
  if (!kesehatan) {
    console.log('Kesehatan not found, nothing to delete');
    return;
  }
  console.log('\nKesehatan ID:', kesehatan._id);

  // 3. Get nasional ID
  const nasional = await client.fetch('*[_type == "category" && slug.current == "nasional"][0]{ _id }');
  if (!nasional) {
    console.log('Nasional not found, cannot reassign');
    return;
  }
  console.log('Nasional ID:', nasional._id);

  // 4. Fetch all articles referencing kesehatan
  const articles = await client.fetch(
    '*[_type == "post" && references($id)]{ _id, categories[] { _ref } }',
    { id: kesehatan._id }
  );
  console.log('\nArticles to update:', articles.length);

  // 5. Update each article: remove kesehatan, add nasional
  for (const article of articles) {
    const newCategories = (article.categories || [])
      .filter(c => c._ref !== kesehatan._id)
      .map(c => ({ _type: 'reference', _ref: c._ref }));
    
    const hasNasional = newCategories.some(c => c._ref === nasional._id);
    if (!hasNasional) {
      newCategories.push({ _type: 'reference', _ref: nasional._id });
    }

    try {
      await client.patch(article._id).set({ categories: newCategories }).commit();
      console.log('Updated:', article._id);
    } catch (err) {
      console.log('Failed:', article._id, err.message);
    }
  }

  // 6. Also update drafts
  for (const article of articles) {
    const draftId = 'drafts.' + article._id;
    const newCategories = (article.categories || [])
      .filter(c => c._ref !== kesehatan._id)
      .map(c => ({ _type: 'reference', _ref: c._ref }));
    
    const hasNasional = newCategories.some(c => c._ref === nasional._id);
    if (!hasNasional) {
      newCategories.push({ _type: 'reference', _ref: nasional._id });
    }

    try {
      await client.patch(draftId).set({ categories: newCategories }).commit();
      console.log('Updated draft:', draftId);
    } catch {
      // Draft might not exist, skip
    }
  }

  // 7. Delete kesehatan category
  try {
    await client.delete(kesehatan._id);
    console.log('\nKesehatan category DELETED');
  } catch (err) {
    console.log('\nFailed to delete kesehatan:', err.message);
  }

  // 8. Delete "market" category (junk)
  const market = await client.fetch('*[_type == "category" && slug.current == "market"][0]{ _id }');
  if (market) {
    // Find articles using market
    const marketArticles = await client.fetch(
      '*[_type == "post" && references($id)]{ _id, categories[] { _ref } }',
      { id: market._id }
    );
    for (const article of marketArticles) {
      const newCategories = (article.categories || [])
        .filter(c => c._ref !== market._id)
        .map(c => ({ _type: 'reference', _ref: c._ref }));
      if (newCategories.length === 0) {
        newCategories.push({ _type: 'reference', _ref: nasional._id });
      }
      try {
        await client.patch(article._id).set({ categories: newCategories }).commit();
      } catch {}
      try {
        await client.patch('drafts.' + article._id).set({ categories: newCategories }).commit();
      } catch {}
    }
    try {
      await client.delete(market._id);
      console.log('Market category DELETED');
    } catch (err) {
      console.log('Failed to delete market:', err.message);
    }
  }

  // 9. Verify final state
  const finalCats = await client.fetch('*[_type == "category"]{ title, slug }');
  console.log('\nFinal categories:', finalCats.map(c => c.title).join(', '));
})();
