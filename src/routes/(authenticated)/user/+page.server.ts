import { fail, redirect } from "@sveltejs/kit";
import { deleteSessionTokenCookie, invalidateSession } from "$lib/server/session";

import type { Actions, RequestEvent } from "./$types";
import { db } from "$lib/server/db";
import { jsonify, RecordId, u } from "surrealdb";
import type { User } from "$lib/server/user";
