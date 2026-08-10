import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './sanity/schemas'
import { DeleteAllPostsTool } from './sanity/tools/delete-all-posts'

const structure = (S: any) => {
  const listItem = S.listItem.bind(S)

  return S.list()
    .title('Warta Nusantara')
    .items([
      // ─── POSTS BY STATUS ───
      S.listItem()
        .title('Artikel')
        .child(
          S.list()
            .title('Artikel')
            .items([
              S.listItem()
                .title('Siap Direview')
                .child(
                  S.documentList()
                    .title('Siap Direview')
                    .filter('_type == "post" && pipelineStatus == "ready-for-review"')
                    .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
                ),
              S.listItem()
                .title('Published')
                .child(
                  S.documentList()
                    .title('Published')
                    .filter('_type == "post" && pipelineStatus == "published"')
                    .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
                ),
              S.listItem()
                .title('Draft')
                .child(
                  S.documentList()
                    .title('Draft')
                    .filter('_type == "post" && pipelineStatus == "pending-review"')
                    .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
                ),
              S.listItem()
                .title('Rejected')
                .child(
                  S.documentList()
                    .title('Rejected')
                    .filter('_type == "post" && pipelineStatus == "rejected"')
                    .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
                ),
              S.listItem()
                .title('Semua Post')
                .child(
                  S.documentList()
                    .title('Semua Post')
                    .filter('_type == "post"')
                    .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
                ),
            ])
        ),

      // ─── CATEGORIES ───
      S.listItem()
        .title('Kategori')
        .child(
          S.documentTypeList('category')
            .title('Kategori')
        ),

      // ─── AUTHORS ───
      S.listItem()
        .title('Author')
        .child(
          S.documentTypeList('author')
            .title('Author')
        ),

      // ─── PAGES ───
      S.listItem()
        .title('Halaman')
        .child(
          S.documentTypeList('page')
            .title('Halaman')
        ),

      // ─── TOOLS ───
      S.divider(),
      S.listItem()
        .title('Tools')
        .child(
          S.list()
            .title('Tools')
            .items([
              S.listItem()
                .title('Hapus Semua Artikel')
                .child(S.component(DeleteAllPostsTool).title('Hapus Semua Artikel')),
            ])
        ),
    ])
}

export default defineConfig({
  name: 'tanahjarang',
  title: 'Warta Nusantara',
  projectId: '7kf72dsd',
  dataset: 'production',
  plugins: [
    structureTool({ structure }),
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
