import { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters";
import { FirestoreUsers, FirestoreSessions, FirestoreAccounts } from "./firestore";

export function FirestoreAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">) {
      const newUser = await FirestoreUsers.create({
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
      });
      
      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        image: newUser.image,
        emailVerified: newUser.emailVerified,
      } as AdapterUser;
    },

    async getUser(id: string) {
      const user = await FirestoreUsers.findById(id);
      if (!user) return null;
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
      } as AdapterUser;
    },

    async getUserByEmail(email: string) {
      const user = await FirestoreUsers.findByEmail(email);
      if (!user) return null;
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
      } as AdapterUser;
    },

    async getUserByAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      const account = await FirestoreAccounts.findByProviderAccount(provider, providerAccountId);
      if (!account) return null;
      
      const user = await FirestoreUsers.findById(account.userId);
      if (!user) return null;
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
      } as AdapterUser;
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
      await FirestoreUsers.update(user.id, {
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
      });
      
      const updatedUser = await FirestoreUsers.findById(user.id);
      if (!updatedUser) throw new Error("User not found after update");
      
      return {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        image: updatedUser.image,
        emailVerified: updatedUser.emailVerified,
      } as AdapterUser;
    },

    async deleteUser(userId: string) {
      await FirestoreUsers.delete(userId);
      await FirestoreAccounts.deleteByUserId(userId);
    },

    async linkAccount(account: AdapterAccount) {
      await FirestoreAccounts.create({
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
      });
      
      return account as AdapterAccount;
    },

    async unlinkAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      const account = await FirestoreAccounts.findByProviderAccount(provider, providerAccountId);
      if (account) {
        await FirestoreAccounts.deleteByUserId(account.userId);
      }
    },

    async createSession({ sessionToken, userId, expires }: { sessionToken: string; userId: string; expires: Date }) {
      const session = await FirestoreSessions.create({
        sessionToken,
        userId,
        expires,
      });
      
      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires,
      } as AdapterSession;
    },

    async getSessionAndUser(sessionToken: string) {
      const session = await FirestoreSessions.findByToken(sessionToken);
      if (!session) return null;
      
      const user = await FirestoreUsers.findById(session.userId);
      if (!user) return null;
      
      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
        } as AdapterSession,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
        } as AdapterUser,
      };
    },

    async updateSession({ sessionToken, expires }: { sessionToken: string; expires?: Date }) {
      await FirestoreSessions.update(sessionToken, { expires });
      const session = await FirestoreSessions.findByToken(sessionToken);
      
      if (!session) return null;
      
      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires,
      } as AdapterSession;
    },

    async deleteSession(sessionToken: string) {
      await FirestoreSessions.delete(sessionToken);
    },

    async createVerificationToken({ identifier, expires, token }: { identifier: string; expires: Date; token: string }) {
      // For verification tokens, we can use a simple document approach
      // This is a placeholder implementation - you might want to store these in Firestore too
      return { identifier, expires, token } as VerificationToken;
    },

    async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
      // Placeholder implementation for verification tokens
      // In a real implementation, you'd want to store and validate these in Firestore
      return { identifier, expires: new Date(), token } as VerificationToken;
    },
  };
}