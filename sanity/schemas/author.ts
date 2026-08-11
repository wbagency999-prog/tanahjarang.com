import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'author',
  title: 'Penulis',
  type: 'document',
  groups: [
    { name: 'info', title: 'Informasi', default: true },
    { name: 'social', title: 'Media Sosial' },
    { name: 'seo', title: 'SEO & Metadata' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Nama',
      type: 'string',
      group: 'info',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'info',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Foto',
      type: 'image',
      group: 'info',
      options: { hotspot: true },
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      group: 'info',
      rows: 4,
    }),
    defineField({
      name: 'role',
      title: 'Jabatan',
      type: 'string',
      group: 'info',
      options: {
        list: [
          { title: 'Kepala Redaksi', value: 'Kepala Redaksi' },
          { title: 'Redaktur', value: 'Redaktur' },
          { title: 'Reporter', value: 'Reporter' },
          { title: 'Kontributor', value: 'Kontributor' },
        ],
      },
    }),
    defineField({
      name: 'jobTitle',
      title: 'Job Title',
      type: 'string',
      group: 'info',
      description: 'Jabatan resmi untuk structured data (Person schema).',
    }),
    defineField({
      name: 'verified',
      title: 'Terverifikasi',
      type: 'boolean',
      group: 'info',
      initialValue: false,
    }),
    // ─── MEDIA SOSIAL ───
    defineField({
      name: 'socialLinks',
      title: 'Link Media Sosial',
      type: 'object',
      group: 'social',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({ name: 'twitter', title: 'Twitter/X', type: 'url', description: 'URL profil Twitter/X' }),
        defineField({ name: 'instagram', title: 'Instagram', type: 'url', description: 'URL profil Instagram' }),
        defineField({ name: 'facebook', title: 'Facebook', type: 'url', description: 'URL profil Facebook' }),
        defineField({ name: 'linkedin', title: 'LinkedIn', type: 'url', description: 'URL profil LinkedIn' }),
        defineField({ name: 'youtube', title: 'YouTube', type: 'url', description: 'URL profil/channel YouTube' }),
      ],
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
      title: 'name',
      subtitle: 'role',
      media: 'image',
    },
  },
})
