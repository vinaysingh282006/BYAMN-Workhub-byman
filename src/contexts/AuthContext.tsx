import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged
} from 'firebase/auth';
import { ref, set, get, child, update } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { sanitizeInput, isValidUrl, isValidEmail, isValidPassword, isValidName } from '@/lib/utils';
import { dataCache } from '@/lib/data-cache';

interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  bio: string;
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    other?: string;
  };
  profileImage?: string;
  role: 'user' | 'admin';
  isBlocked: boolean;
  createdAt: number;
  earnedMoney: number;
  addedMoney: number;
  approvedWorks: number;
  totalWithdrawn: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  // Session management
  setSessionTimeout: (timeoutMs: number) => void;
  forceLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Session timeout configuration
  const [sessionTimeout, setSessionTimeout] = useState<number>(30 * 60 * 1000); // 30 minutes default
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to reset session timeout
  const resetSessionTimeout = () => {
    setLastActivity(Date.now());
    
    // Clear existing timeout if any
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    
    // Set new timeout
    sessionTimeoutRef.current = setTimeout(() => {
      // Auto logout when session expires
      handleSessionTimeout();
    }, sessionTimeout);
  };
  
  // Function to handle session timeout
  const handleSessionTimeout = async () => {
    console.log('Session timed out due to inactivity');
    await forceLogout();
  };
  
  // Function to force logout (used for session timeout)
  const forceLogout = async () => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    
    // Clear Firebase auth state
    await signOut(auth);
    
    // Clear local state
    setUser(null);
    setProfile(null);
    
    // Clear all cached data
    dataCache.clearAll();
    
    // Clear any stored session data
    localStorage.clear();
    sessionStorage.clear();
  };

  const fetchProfile = async (uid: string) => {
    const snapshot = await get(child(ref(database), `users/${uid}`));
    if (snapshot.exists()) {
      setProfile(snapshot.val());
    }
    return snapshot.val();
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  useEffect(() => {
    // Set up event listeners for user activity
    const handleUserActivity = () => {
      resetSessionTimeout();
    };
    
    // Add event listeners for user activity
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchProfile(user.uid);
        // Start session timeout tracking
        resetSessionTimeout();
      } else {
        setProfile(null);
        // Clear timeout when user logs out
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
        }
      }
      setLoading(false);
    });

    // Clean up event listeners and timeout
    return () => {
      unsubscribe();
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    // Validate inputs before creating user
    if (!isValidEmail(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    if (!isValidPassword(password)) {
      throw new Error('Password must be at least 6 characters and contain at least one letter and one number');
    }
    
    if (!isValidName(fullName)) {
      throw new Error('Full name must contain only letters, spaces, hyphens, and apostrophes, and be between 2-50 characters');
    }

    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(user);
    
    const newProfile: UserProfile = {
      uid: user.uid,
      email: email,
      fullName: sanitizeInput(fullName),
      bio: '',
      socialLinks: {},
      profileImage: undefined,
      role: 'user',
      isBlocked: false,
      createdAt: Date.now(),
      earnedMoney: 0,
      addedMoney: 0,
      approvedWorks: 0,
      totalWithdrawn: 0,
    };
    
    await set(ref(database, `users/${user.uid}`), newProfile);
    
    // Initialize wallet
    await set(ref(database, `wallets/${user.uid}`), {
      earnedBalance: 0,
      addedBalance: 0,
      pendingAddMoney: 0,
      totalWithdrawn: 0,
    });
    
    // Set profile in cache
    dataCache.set(`user:${user.uid}`, newProfile);
    
    setProfile(newProfile);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    
    // Sign out from Firebase
    await signOut(auth);
    
    // Clear local state
    setUser(null);
    setProfile(null);
    
    // Clear all cached data
    dataCache.clearAll();
    
    // Clear any stored session data
    localStorage.clear();
    sessionStorage.clear();
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    
    // Sanitize profile data to prevent XSS and injection attacks
    const sanitizedData: Partial<UserProfile> = {};
    
    if (data.fullName) {
      sanitizedData.fullName = sanitizeInput(data.fullName);
    }
    
    if (data.bio) {
      sanitizedData.bio = sanitizeInput(data.bio);
    }
    
    if (data.profileImage) {
      // Validate URL before saving
      if (isValidUrl(data.profileImage)) {
        sanitizedData.profileImage = data.profileImage;
      }
    }
    
    if (data.socialLinks) {
      sanitizedData.socialLinks = {};
      
      if (data.socialLinks.linkedin && isValidUrl(data.socialLinks.linkedin)) {
        sanitizedData.socialLinks.linkedin = data.socialLinks.linkedin;
      }
      if (data.socialLinks.twitter && isValidUrl(data.socialLinks.twitter)) {
        sanitizedData.socialLinks.twitter = data.socialLinks.twitter;
      }
      if (data.socialLinks.instagram && isValidUrl(data.socialLinks.instagram)) {
        sanitizedData.socialLinks.instagram = data.socialLinks.instagram;
      }
      if (data.socialLinks.youtube && isValidUrl(data.socialLinks.youtube)) {
        sanitizedData.socialLinks.youtube = data.socialLinks.youtube;
      }
      if (data.socialLinks.other && isValidUrl(data.socialLinks.other)) {
        sanitizedData.socialLinks.other = data.socialLinks.other;
      }
    }
    
    await update(ref(database, `users/${user.uid}`), sanitizedData);
    await fetchProfile(user.uid);
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    logout,
    resetPassword,
    updateProfile,
    refreshProfile,
    // Session management functions
    setSessionTimeout,
    forceLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
