import React, { createContext, useContext, useEffect, useState } from 'react';
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
import { 
  sanitizeInput, 
  isValidUrl, 
  validateUserProfile, 
  isValidProfileImage, 
  isValidName, 
  isValidEmail,
  isValidPassword,
  validateAndSanitizeProfile
} from '@/lib/utils';
import { 
  dataCache, 
  fetchUserData, 
  invalidateUserCache, 
  clearUserCache 
} from '@/lib/data-cache';

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

  const fetchProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const profileData = await fetchUserData(uid);
      if (profileData) {
        // Validate the fetched profile data
        if (validateUserProfile(profileData).isValid) {
          setProfile(profileData);
          return profileData;
        } else {
          console.error('Invalid profile data received:', validateUserProfile(profileData).errors);
          return null;
        }
      }
      return null;
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      // Optionally set an error state here
      return null;
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          await fetchProfile(user.uid);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, fullName: string): Promise<void> => {
    // Validate inputs before creating user
    if (!isValidEmail(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    if (!isValidPassword(password)) {
      throw new Error('Password must be at least 8 characters and contain at least one uppercase, one lowercase, one number and one special character');
    }
    
    if (!isValidName(fullName)) {
      throw new Error('Full name must contain only letters, spaces, hyphens, and apostrophes, and be between 2-50 characters');
    }

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(user);
      
      const newProfile: UserProfile = {
        uid: user.uid,
        email: email,
        fullName: sanitizeInput(fullName),
        bio: '',
        socialLinks: {},
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
    } catch (error: any) {
      console.error('Error during sign up:', error);
      // Clean up in case of error
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email already in use. Please use a different email address.');
      } else {
        throw new Error('Failed to create account. Please try again later.');
      }
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    // Validate inputs before signing in
    if (!isValidEmail(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    if (!password || password.length < 1) {
      throw new Error('Password cannot be empty');
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Error during sign in:', error);
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email. Please check your email or sign up for a new account.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed login attempts. Please try again later.');
      } else {
        throw new Error('Failed to sign in. Please check your credentials and try again.');
      }
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setUser(null);
      setProfile(null);
      
      // Clear user cache
      if (user) {
        clearUserCache(user.uid);
      }
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    if (!isValidEmail(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Error during password reset:', error);
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      } else {
        throw new Error('Failed to send password reset email. Please try again later.');
      }
    }
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Validate and sanitize the profile data
    const validation = validateAndSanitizeProfile(data);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    
    const sanitizedData = validation.sanitizedData;
    
    try {
      await update(ref(database, `users/${user.uid}`), sanitizedData);
      
      // Invalidate and update cache
      invalidateUserCache(user.uid);
      await fetchProfile(user.uid);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update profile. Please try again later.');
    }
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};