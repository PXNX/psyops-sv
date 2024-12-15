import { RecordId } from "surrealdb";

export type Journalist = {
	id: RecordId<"journalist">;
	in: RecordId<"user">;
	out: RecordId<"newspaper">;
	rank: "owner" | "editor";
};
