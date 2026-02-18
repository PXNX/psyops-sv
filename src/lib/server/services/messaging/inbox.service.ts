// Inbox service
import type { Database } from '../../db';
import { inboxMessages } from '../../schema';
import { eq, and, desc } from 'drizzle-orm';

export class InboxService {
    constructor(private db: typeof import('../../db').db) { }

    async getUserMessages(userId: string, limit: number = 50) {
        return await this.db
            .select()
            .from(inboxMessages)
            .where(eq(inboxMessages.recipientId, userId))
            .orderBy(desc(inboxMessages.sentAt))
            .limit(limit);
    }

    async sendMessage(data: typeof inboxMessages.$inferInsert) {
        const [message] = await this.db.insert(inboxMessages).values(data).returning();
        return message;
    }

    async markAsRead(messageId: number) {
        await this.db
            .update(inboxMessages)
            .set({ isRead: true })
            .where(eq(inboxMessages.id, messageId));
    }

    async broadcastToState(stateId: number, senderId: string, subject: string, content: string) {
        // This would need to get all users in a state and send to each
        // Simplified version here
        const data: typeof inboxMessages.$inferInsert = {
            recipientId: '', // Would be populated per user
            senderId,
            messageType: 'state_broadcast',
            stateId,
            subject,
            content
        };
        // Implementation would loop through state residents
    }
}
