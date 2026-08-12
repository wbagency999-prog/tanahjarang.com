import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'pipelineRun',
  title: 'Pipeline Run',
  type: 'document',
  fields: [
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Running', value: 'running' },
          { title: 'Completed', value: 'completed' },
          { title: 'Failed', value: 'failed' },
        ],
      },
      initialValue: 'running',
    }),
    defineField({
      name: 'startedAt',
      title: 'Started At',
      type: 'datetime',
    }),
  ],
  preview: {
    select: { title: 'status', subtitle: 'startedAt' },
  },
})
