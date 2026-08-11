import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'category',
  title: 'Kategori',
  type: 'document',
  groups: [
    { name: 'info', title: 'Informasi', default: true },
    { name: 'seo', title: 'SEO & Metadata' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Judul',
      type: 'string',
      group: 'info',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'info',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Deskripsi',
      type: 'text',
      group: 'info',
      rows: 3,
      description: 'Deskripsi singkat kategori untuk ditampilkan di halaman.',
    }),
    // ─── SEO & METADATA ───
    defineField({
      name: 'seo',
      title: 'SEO & Metadata',
      type: 'seoFields',
      group: 'seo',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'description',
    },
  },
})
