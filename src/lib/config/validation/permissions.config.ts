// Permission and role configuration
export const PERMISSIONS_CONFIG = {
    // Ministry permissions for auto-execution
    MINISTRY_PERMISSIONS: {
        economy: ["tax"],
        foreign_affairs: ["border_control"],
        defense: ["fortifications"],
        infrastructure: ["infrastructure"],
        education: ["school"],
        health: ["hospital"]
    },

    // Presidential auto-execute permissions
    PRESIDENTIAL_PERMISSIONS: ["tax", "border_control", "fortifications"],

    // Moderator actions
    MODERATOR_ACTIONS: [
        "delete_message",
        "warn_user",
        "restrict_user",
        "review_report",
        "flag_content"
    ],

    // Admin actions
    ADMIN_ACTIONS: [
        "ban_user",
        "delete_account",
        "edit_state",
        "create_gift_code",
        "broadcast_message",
        "reset_name",
        "reset_logo"
    ]
} as const;

export type MinistryType = keyof typeof PERMISSIONS_CONFIG.MINISTRY_PERMISSIONS;
export type ModeratorAction = (typeof PERMISSIONS_CONFIG.MODERATOR_ACTIONS)[number];
export type AdminAction = (typeof PERMISSIONS_CONFIG.ADMIN_ACTIONS)[number];

// Helper function to check if a user can auto-execute a proposal type
export function canAutoExecuteProposal(
    proposalType: string,
    userMinistry: string | null,
    isPresident: boolean
): boolean {
    if (isPresident && PERMISSIONS_CONFIG.PRESIDENTIAL_PERMISSIONS.includes(proposalType)) {
        return true;
    }

    if (
        userMinistry &&
        PERMISSIONS_CONFIG.MINISTRY_PERMISSIONS[userMinistry as MinistryType]?.includes(proposalType)
    ) {
        return true;
    }

    return false;
}
