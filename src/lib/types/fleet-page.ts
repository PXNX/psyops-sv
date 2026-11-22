/** The data shape of the fleet console, shared by its old and new hosts.
 *  Type-only: importing this module never pulls server code into the client. */
import type { fleetLoad } from "#lib/server/services/military/fleet-page.js";

export type FleetPageData = Awaited<ReturnType<typeof fleetLoad>>;
