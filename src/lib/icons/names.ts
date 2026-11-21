import { isometricIconNames } from "./isometric";

/**
 * Every name backed by a 3D-rendered icon in /static/icons/resources.
 * The vector set in isometric.ts is kept only as a fallback for unknown names.
 */
const additionalIconNames = [
	// Armoured vehicles
	"armor",
	"mechanized",
	"artillery_vehicle",
	"air_defence",
	// Launchers and air-delivered weapons
	"cruise_missile_launcher",
	"ballistic_missile_launcher",
	"guided_bomb",
	"gps_bomb",
	"unguided_bombs",
	// Drones and reconnaissance satellites
	"attack_drone",
	"drone_eo",
	"drone_ir",
	"sat_eo",
	"sat_ir",
	"sat_sar",
	// Laws, proposals and state business
	"law",
	"exploitation",
	"tax",
	"budget",
	"border_control",
	"declare_war",
	"radar",
	"fortifications"
] as const;

export const resourceIconNames: Set<string> = new Set(
	isometricIconNames.filter((name) => name !== "package").concat(additionalIconNames)
);
