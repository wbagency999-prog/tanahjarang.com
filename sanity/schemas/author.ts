import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'author',
  title: 'Penulis',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Nama',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Foto',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'role',
      title: 'Jabatan',
      type: 'string',
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
      name: 'verified',
      title: 'Terverifikasi',
      type: 'boolean',
      initialValue: false,
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
