import { RecordId } from "surrealdb";

export interface Journalist {
	in: RecordId<string>;
	out: RecordId<string>;
	rank: "owner" | "editor";
}
