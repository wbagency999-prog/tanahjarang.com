import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'seoFields',
  title: 'SEO Fields',
  type: 'object',
  options: { collapsible: true, collapsed: false },
  fields: [
    defineField({
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      description: 'Judul untuk search engine. Maks 60 karakter.',
      validation: (Rule) => Rule.max(60).error('SEO Title maksimal 60 karakter'),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Description',
      type: 'text',
      rows: 3,
      description: 'Deskripsi untuk search engine. Maks 160 karakter.',
      validation: (Rule) => Rule.max(160).error('SEO Description maksimal 160 karakter'),
    }),
    defineField({
      name: 'ogDescription',
      title: 'OG Description',
      type: 'text',
      rows: 2,
      description: 'Deskripsi untuk Open Graph/social media. Maks 200 karakter.',
      validation: (Rule) => Rule.max(200).error('OG Description maksimal 200 karakter'),
    }),
    defineField({
      name: 'ogImage',
      title: 'Gambar Open Graph',
      type: 'image',
      description: 'Gambar untuk social media sharing. Ideal: 1200x630px.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      description: 'Isi jika artikel ini sindikasi/dari sumber lain.',
    }),
    defineField({
      name: 'noIndex',
      title: 'No Index',
      type: 'boolean',
      description: 'Centang untuk mencegah indeks oleh search engine.',
      initialValue: false,
    }),
  ],
  preview: {
    prepare() {
      return { title: 'SEO & Metadata' }
    },
  },
})
