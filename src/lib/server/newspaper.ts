import { z } from "zod";

export const newspaperSchema = z.object({
	name: z.string().min(1).max(40),
	avatar: z.string() //.url()
});

export type Newspaper = z.infer<typeof newspaperSchema & { createdAt: Date }>;
