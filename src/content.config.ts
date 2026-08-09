import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalDate = z.preprocess(emptyToUndefined, z.coerce.date().optional());
const optionalYoutubeId = z.preprocess(
  emptyToUndefined,
  z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'יש להזין מזהה YouTube תקין בן 11 תווים').optional(),
);

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string().min(1),
    excerpt: z.string().min(1),
    publishedAt: z.coerce.date(),
    updatedAt: optionalDate,
    author: z.string().min(1),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    cover: optionalString,
    youtubeId: optionalYoutubeId,
  }),
});

export const collections = { articles };
