import { adminDb } from './firebaseAdmin';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// Type definitions for our data models
export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
  isAdmin?: boolean;
  isWhitelisted?: boolean;
  isBetaTester?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Feedback {
  id: string;
  userId: string;
  userEmail: string;
  type: 'bug' | 'feature' | 'improvement' | 'other';
  title: string;
  description: string;
  status: 'new' | 'in_progress' | 'resolved' | 'wont_fix';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

export interface Whitelist {
  id: string;
  email: string;
  addedBy: string;
  addedAt: Date;
  notes?: string;
}

export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
}

export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
}

export interface VerificationToken {
  identifier: string;
  token: string;
  expires: Date;
}

export interface Conversion {
  id: string;
  userId: string;
  originalImageUrl: string;
  convertedImageUrl: string;
  style: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  processingTime?: number;
}

// Helper function to convert Firestore timestamp to Date
export const timestampToDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

// Helper function to convert Date to Firestore timestamp
export const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// User operations
export class FirestoreUsers {
  static collection = 'users';

  static async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const userRef = doc(collection(db, this.collection));
    const now = new Date();
    
    const user: User = {
      id: userRef.id,
      ...userData,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(userRef, {
      ...user,
      createdAt: dateToTimestamp(user.createdAt),
      updatedAt: dateToTimestamp(user.updatedAt),
    });

    return user;
  }

  static async findById(id: string): Promise<User | null> {
    const userRef = doc(db, this.collection, id);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        id: userSnap.id,
        ...data,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      } as User;
    }
    return null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const q = query(collection(db, this.collection), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      } as User;
    }
    return null;
  }

  static async update(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<void> {
    const userRef = doc(db, this.collection, id);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: dateToTimestamp(new Date()),
    });
  }

  static async delete(id: string): Promise<void> {
    const userRef = doc(db, this.collection, id);
    await deleteDoc(userRef);
  }
}

// Session operations
export class FirestoreSessions {
  static collection = 'sessions';

  static async create(sessionData: Omit<Session, 'id'>): Promise<Session> {
    const sessionRef = doc(collection(db, this.collection));
    
    const session: Session = {
      id: sessionRef.id,
      ...sessionData,
    };

    await setDoc(sessionRef, {
      ...session,
      expires: dateToTimestamp(session.expires),
    });

    return session;
  }

  static async findByToken(sessionToken: string): Promise<Session | null> {
    const q = query(collection(db, this.collection), where("sessionToken", "==", sessionToken));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        expires: timestampToDate(data.expires),
      } as Session;
    }
    return null;
  }

  static async update(sessionToken: string, updates: Partial<Omit<Session, 'id' | 'sessionToken'>>): Promise<void> {
    const q = query(collection(db, this.collection), where("sessionToken", "==", sessionToken));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const sessionRef = querySnapshot.docs[0].ref;
      await updateDoc(sessionRef, {
        ...updates,
        expires: updates.expires ? dateToTimestamp(updates.expires) : undefined,
      });
    }
  }

  static async delete(sessionToken: string): Promise<void> {
    const q = query(collection(db, this.collection), where("sessionToken", "==", sessionToken));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      await deleteDoc(querySnapshot.docs[0].ref);
    }
  }

  static async deleteExpired(): Promise<void> {
    const now = new Date();
    const q = query(collection(db, this.collection), where("expires", "<", dateToTimestamp(now)));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  }
}

// Account operations
export class FirestoreAccounts {
  static collection = 'accounts';

  static async create(accountData: Omit<Account, 'id'>): Promise<Account> {
    const accountRef = doc(collection(db, this.collection));
    
    const account: Account = {
      id: accountRef.id,
      ...accountData,
    };

    await setDoc(accountRef, account);
    return account;
  }

  static async findByProviderAccount(provider: string, providerAccountId: string): Promise<Account | null> {
    const q = query(
      collection(db, this.collection), 
      where("provider", "==", provider),
      where("providerAccountId", "==", providerAccountId)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as Account;
    }
    return null;
  }

  static async deleteByUserId(userId: string): Promise<void> {
    const q = query(collection(db, this.collection), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  }
}

// Conversion operations
export class FirestoreConversions {
  static collection = 'conversions';

  static async create(conversionData: Omit<Conversion, 'id' | 'createdAt' | 'updatedAt'>): Promise<Conversion> {
    const conversionRef = doc(collection(db, this.collection));
    const now = new Date();
    
    const conversion: Conversion = {
      id: conversionRef.id,
      ...conversionData,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(conversionRef, {
      ...conversion,
      createdAt: dateToTimestamp(conversion.createdAt),
      updatedAt: dateToTimestamp(conversion.updatedAt),
    });

    return conversion;
  }

  static async findById(id: string): Promise<Conversion | null> {
    const conversionRef = doc(db, this.collection, id);
    const conversionSnap = await getDoc(conversionRef);
    
    if (conversionSnap.exists()) {
      const data = conversionSnap.data();
      return {
        id: conversionSnap.id,
        ...data,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      } as Conversion;
    }
    return null;
  }

  static async findByUserId(userId: string): Promise<Conversion[]> {
    const q = query(collection(db, this.collection), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      } as Conversion;
    });
  }

  static async update(id: string, updates: Partial<Omit<Conversion, 'id' | 'createdAt'>>): Promise<void> {
    const conversionRef = doc(db, this.collection, id);
    await updateDoc(conversionRef, {
      ...updates,
      updatedAt: dateToTimestamp(new Date()),
    });
  }

  static async delete(id: string): Promise<void> {
    const conversionRef = doc(db, this.collection, id);
    await deleteDoc(conversionRef);
  }
}

// Feedback operations
export class FirestoreFeedback {
  static collection = 'feedback';

  static async create(feedbackData: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt'>): Promise<Feedback> {
    const feedbackRef = doc(collection(db, this.collection));
    const now = new Date();
    
    const feedback: Feedback = {
      id: feedbackRef.id,
      ...feedbackData,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(feedbackRef, {
      ...feedback,
      createdAt: dateToTimestamp(feedback.createdAt),
      updatedAt: dateToTimestamp(feedback.updatedAt),
    });

    return feedback;
  }

  static async getAll(): Promise<Feedback[]> {
    const querySnapshot = await getDocs(collection(db, this.collection));
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      } as Feedback;
    });
  }

  static async update(id: string, updates: Partial<Omit<Feedback, 'id' | 'createdAt'>>): Promise<void> {
    const feedbackRef = doc(db, this.collection, id);
    await updateDoc(feedbackRef, {
      ...updates,
      updatedAt: dateToTimestamp(new Date()),
    });
  }
}

// Whitelist operations
export class FirestoreWhitelist {
  static collection = 'whitelist';

  static async add(email: string, addedBy: string, notes?: string): Promise<Whitelist> {
    const whitelistRef = doc(collection(db, this.collection));
    const now = new Date();
    
    const entry: Whitelist = {
      id: whitelistRef.id,
      email: email.toLowerCase(),
      addedBy,
      addedAt: now,
      notes,
    };

    await setDoc(whitelistRef, {
      ...entry,
      addedAt: dateToTimestamp(entry.addedAt),
    });

    // Also update the user if they exist
    const user = await FirestoreUsers.findByEmail(email);
    if (user) {
      await FirestoreUsers.update(user.id, { isWhitelisted: true });
    }

    return entry;
  }

  static async remove(email: string): Promise<void> {
    const q = query(collection(db, this.collection), where("email", "==", email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Also update the user if they exist
    const user = await FirestoreUsers.findByEmail(email);
    if (user) {
      await FirestoreUsers.update(user.id, { isWhitelisted: false });
    }
  }

  static async isWhitelisted(email: string): Promise<boolean> {
    const q = query(collection(db, this.collection), where("email", "==", email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  }

  static async getAll(): Promise<Whitelist[]> {
    const querySnapshot = await getDocs(collection(db, this.collection));
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        addedAt: timestampToDate(data.addedAt),
      } as Whitelist;
    });
  }
}