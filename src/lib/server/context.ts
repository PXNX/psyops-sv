// Application context with dependency injection
import type { Database } from './db';
import { db } from './db';

// Services
import { AuthService } from './services/auth/auth.service';
import { BattleService } from './services/military/battle.service';
import { CompanyService } from './services/economy/company.service';
import { FactoryService } from './services/economy/factory.service';
import { MarketService } from './services/economy/market.service';
import { WalletService } from './services/economy/wallet.service';
import { PartyService } from './services/politics/party.service';
import { ProposalService } from './services/politics/proposal.service';
import { ElectionService } from './services/politics/election.service';
import { RegionService } from './services/geography/region.service';
import { TravelService } from './services/geography/travel.service';
import { ChatService } from './services/messaging/chat.service';
import { InboxService } from './services/messaging/inbox.service';
import { ModerationService } from './services/moderation/moderation.service';

export interface AppContext {
    db: typeof db;
    services: {
        auth: AuthService;
        battle: BattleService;
        company: CompanyService;
        factory: FactoryService;
        market: MarketService;
        wallet: WalletService;
        party: PartyService;
        proposal: ProposalService;
        election: ElectionService;
        region: RegionService;
        travel: TravelService;
        chat: ChatService;
        inbox: InboxService;
        moderation: ModerationService;
    };
}

// Global context instance
let _context: AppContext | null = null;

export function createContext(): AppContext {
    if (_context) {
        return _context;
    }

    // Initialize services
    const authService = new AuthService(db);
    const battleService = new BattleService(db);
    const companyService = new CompanyService(db);
    const factoryService = new FactoryService(db);
    const marketService = new MarketService(db);
    const walletService = new WalletService(db);
    const partyService = new PartyService(db);
    const proposalService = new ProposalService(db);
    const electionService = new ElectionService(db);
    const regionService = new RegionService(db);
    const travelService = new TravelService(db);
    const chatService = new ChatService(db);
    const inboxService = new InboxService(db);
    const moderationService = new ModerationService(db);

    _context = {
        db,
        services: {
            auth: authService,
            battle: battleService,
            company: companyService,
            factory: factoryService,
            market: marketService,
            wallet: walletService,
            party: partyService,
            proposal: proposalService,
            election: electionService,
            region: regionService,
            travel: travelService,
            chat: chatService,
            inbox: inboxService,
            moderation: moderationService
        }
    };

    return _context;
}

// Get context (creates if doesn't exist)
export function getContext(): AppContext {
    if (!_context) {
        return createContext();
    }
    return _context;
}

// Helper to get context in route handlers
export function getContextFromLocals(locals: App.Locals): AppContext {
    // You can attach context to locals in hooks.server.ts if needed
    // For now, just return the global context
    return getContext();
}
