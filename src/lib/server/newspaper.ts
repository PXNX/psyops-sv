import type { RecordId } from "surrealdb";
import { z } from "zod";

export const newspaperSchema = z.object({
	name: z.string().min(1).max(40),
	avatar: z.string(), //.url()
	background: z.string().optional() //.url()
});

export type NewspaperInput = z.infer<typeof newspaperSchema>;

export type Newspaper = NewspaperInput & { createdAt: Date; id: RecordId<"newspaper"> };
