import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  groups: [
    { name: 'konten', title: 'Konten', default: true },
    { name: 'media', title: 'Media' },
    { name: 'seo', title: 'SEO & Metadata' },
    { name: 'publish', title: 'Publish' },
    { name: 'lanjutan', title: 'Lanjutan' },
  ],
  fields: [
    // ─── KONTEN ───
    defineField({
      name: 'title',
      title: 'Judul',
      type: 'string',
      group: 'konten',
      validation: (Rule) => Rule.required().error('Judul wajib diisi'),
    }),
    defineField({
      name: 'subtitle',
      title: 'Sub Judul',
      type: 'string',
      description: 'Maksimal 120 karakter. Tampil di bawah judul utama.',
      group: 'konten',
      validation: (Rule) => Rule.max(120).error('Sub judul maksimal 120 karakter'),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'konten',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required().error('Slug wajib diisi'),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: 'Ringkasan singkat artikel untuk preview',
      group: 'konten',
      validation: (Rule) => Rule.required().error('Excerpt wajib diisi'),
    }),
    defineField({
      name: 'body',
      title: 'Konten',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' },
            { title: 'Heading 4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numbered', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
              { title: 'Underline', value: 'underline' },
              { title: 'Code', value: 'code' },
            ],
            annotations: [
              {
                title: 'URL',
                name: 'link',
                type: 'object',
                fields: [
                  {
                    title: 'URL',
                    name: 'href',
                    type: 'url',
                    validation: (Rule) => Rule.required(),
                  },
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'alt', type: 'string', title: 'Alt Text' },
            { name: 'caption', type: 'string', title: 'Caption' },
          ],
        },
      ],
      group: 'konten',
      validation: (Rule) => Rule.required().error('Konten wajib diisi'),
    }),
    defineField({
      name: 'tags',
      title: 'Tag',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      group: 'konten',
      description: 'Kata kunci terkait artikel',
    }),

    // ─── MEDIA ───
    defineField({
      name: 'mainImage',
      title: 'Gambar Utama',
      type: 'image',
      group: 'media',
      options: { hotspot: true },
      validation: (Rule) => Rule.required().error('Gambar utama wajib diisi'),
    }),
    defineField({
      name: 'imageCaption',
      title: 'Caption Gambar',
      type: 'string',
      group: 'media',
      description: 'Caption/credit gambar utama. Format: "Deskripsi | Foto: [Sumber]"',
    }),

    // ─── SEO & METADATA ───
    defineField({
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      group: 'seo',
      description: 'Judul untuk search engine. Maks 60 karakter.',
      validation: (Rule) => Rule.max(60).error('SEO Title maksimal 60 karakter'),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'Deskripsi untuk search engine. Maks 160 karakter.',
      validation: (Rule) => Rule.max(160).error('SEO Description maksimal 160 karakter'),
    }),
    defineField({
      name: 'metaTitle',
      title: 'Meta Title',
      type: 'string',
      group: 'seo',
      hidden: true,
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      group: 'seo',
      hidden: true,
    }),

    // ─── PUBLISH ───
    defineField({
      name: 'publishedAt',
      title: 'Tanggal Publish',
      type: 'datetime',
      group: 'publish',
      validation: (Rule) => Rule.required().error('Tanggal publish wajib diisi'),
    }),
    defineField({
      name: 'author',
      title: 'Penulis',
      type: 'reference',
      to: [{ type: 'author' }],
      group: 'publish',
      validation: (Rule) => Rule.required().error('Penulis wajib diisi'),
    }),
    defineField({
      name: 'categories',
      title: 'Kategori',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'category' }] }],
      group: 'publish',
      validation: (Rule) => Rule.min(1).error('Minimal 1 kategori wajib dipilih'),
    }),
    defineField({
      name: 'pipelineStatus',
      title: 'Status Pipeline',
      type: 'string',
      group: 'publish',
      options: {
        list: [
          { title: 'Pending Review', value: 'pending-review' },
          { title: 'Ready for Review', value: 'ready-for-review' },
          { title: 'Approved', value: 'approved' },
          { title: 'Published', value: 'published' },
          { title: 'Rejected', value: 'rejected' },
        ],
      },
      initialValue: 'pending-review',
    }),

    // ─── LANJUTAN ───
    defineField({
      name: 'amp',
      title: 'AMP',
      type: 'boolean',
      group: 'lanjutan',
      initialValue: false,
    }),
    defineField({
      name: 'komentarPembaca',
      title: 'Komentar Pembaca',
      type: 'boolean',
      group: 'lanjutan',
      initialValue: true,
    }),
    defineField({
      name: 'tableOfContent',
      title: 'Daftar Isi',
      type: 'boolean',
      group: 'lanjutan',
      initialValue: false,
    }),
    defineField({
      name: 'factCheck',
      title: 'Fact Check',
      type: 'string',
      group: 'lanjutan',
      options: {
        list: [
          { title: 'Fakta', value: 'fakta' },
          { title: 'Hoaks', value: 'hoaks' },
          { title: 'Belum Diverifikasi', value: 'unverified' },
        ],
      },
      initialValue: 'unverified',
    }),

    // ─── HIDDEN FIELDS (pipeline internals) ───
    defineField({
      name: 'views',
      title: 'Views',
      type: 'number',
      initialValue: 0,
      hidden: true,
    }),
    defineField({
      name: 'originalUrl',
      title: 'URL Asli',
      type: 'url',
      hidden: true,
    }),
    defineField({
      name: 'sourceName',
      title: 'Sumber',
      type: 'string',
      hidden: true,
    }),
    defineField({
      name: 'aiDisclosure',
      title: 'AI Disclosure',
      type: 'boolean',
      initialValue: false,
      hidden: true,
    }),
    defineField({
      name: 'aiRewritten',
      title: 'AI Rewritten',
      type: 'boolean',
      initialValue: false,
      hidden: true,
    }),
    defineField({
      name: 'aiMetadata',
      title: 'AI Metadata',
      type: 'object',
      hidden: true,
      fields: [
        { name: 'model', type: 'string', title: 'Model' },
        { name: 'rewrittenAt', type: 'datetime', title: 'Rewritten At' },
        { name: 'originalTitle', type: 'string', title: 'Original Title' },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'slug.current',
      media: 'mainImage',
      pipelineStatus: 'pipelineStatus',
    },
    prepare(selection) {
      const { title, subtitle, media, pipelineStatus } = selection
      return {
        title,
        subtitle: `${pipelineStatus || 'draft'} — /${subtitle || ''}`,
        media,
      }
    },
  },
})
