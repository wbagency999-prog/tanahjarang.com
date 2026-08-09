import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './sanity/schemas'
import { DeleteAllPostsTool } from './sanity/tools/delete-all-posts'

export default defineConfig({
  name: 'tanahjarang',
  title: 'Warta Nusantara',
  projectId: '7kf72dsd',
  dataset: 'production',
  plugins: [
    structureTool(),
    {
      name: 'delete-all-posts',
      title: 'Hapus Semua Artikel',
      icon: () => null,
      component: DeleteAllPostsTool,
    },
  ],
  schema: {
    types: schemaTypes,
  },
})
