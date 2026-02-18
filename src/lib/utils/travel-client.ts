// Client-side travel utilities
// These functions are used in Svelte components and don't require database access

/**
 * Calculate current travel progress (0-1)
 */
export function calculateTravelProgress(departureTime: Date, arrivalTime: Date): number {
    const now = Date.now();
    const departure = departureTime.getTime();
    const arrival = arrivalTime.getTime();

    if (now >= arrival) return 1;
    if (now <= departure) return 0;

    const progress = (now - departure) / (arrival - departure);
    return Math.max(0, Math.min(1, progress));
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${mins}m`;
}

/**
 * Get time remaining in minutes
 */
export function getTimeRemaining(arrivalTime: Date): number {
    const now = Date.now();
    const arrival = arrivalTime.getTime();
    const remaining = arrival - now;

    if (remaining <= 0) return 0;
    return Math.ceil(remaining / 60000); // Convert to minutes
}
