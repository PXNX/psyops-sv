// Chat service
import type { Database } from '../../db';
import { chatMessages } from '../../schema';
import { eq, and, desc } from 'drizzle-orm';

export class ChatService {
    constructor(private db: typeof import('../../db').db) { }

    async getGlobalMessages(limit: number = 50) {
        return await this.db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.messageType, 'global'))
            .orderBy(desc(chatMessages.sentAt))
            .limit(limit);
    }

    async sendMessage(data: typeof chatMessages.$inferInsert) {
        const [message] = await this.db.insert(chatMessages).values(data).returning();
        return message;
    }

    async deleteMessage(messageId: number, deletedBy: string, reason?: string, note?: string) {
        await this.db
            .update(chatMessages)
            .set({
                isDeleted: true,
                deletedBy,
                deletedAt: new Date(),
                deletionReason: reason as any,
                deletionNote: note
            })
            .where(eq(chatMessages.id, messageId));
    }
}
