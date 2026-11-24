// src/routes/(authenticated)/(dock)/ops/opIcons.ts
// One Fluent icon per covert operation kind, shared by the planner list, the
// detail pane and the ledger.
import type { Component } from "svelte";
import type { CovertOpKind } from "#lib/config/index.js";
import IconFlash from "~icons/fluent/flash-20-regular";
import IconPlugOff from "~icons/fluent/plug-disconnected-20-regular";
import IconWallet from "~icons/fluent/wallet-20-regular";
import IconHeadphones from "~icons/fluent/headphones-20-regular";
import IconRadar from "~icons/fluent/radar-20-regular";
import IconTruck from "~icons/fluent/vehicle-truck-20-regular";
import IconMegaphone from "~icons/fluent/megaphone-20-regular";
import IconEyeOff from "~icons/fluent/eye-off-20-regular";
import IconShieldCheck from "~icons/fluent/shield-checkmark-20-regular";
import IconMail from "~icons/fluent/mail-20-regular";

export const OP_ICON: Record<CovertOpKind, Component> = {
	grid_attack: IconFlash,
	c2_disruption: IconPlugOff,
	financial_theft: IconWallet,
	comms_intercept: IconHeadphones,
	air_defence_spoof: IconRadar,
	supply_chain: IconTruck,
	morale_campaign: IconMegaphone,
	disinformation: IconEyeOff,
	counter_propaganda: IconShieldCheck,
	leaflet_drop: IconMail
};
