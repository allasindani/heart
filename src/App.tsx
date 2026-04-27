import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageCircle, 
  CircleDashed, 
  LayoutGrid, 
  Heart, 
  Search, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Mic, 
  Send,
  Check,
  CheckCheck,
  ShieldAlert,
  Trash2,
  User as UserIcon,
  LogOut,
  Plus,
  Image as ImageIcon,
  Video as VideoIcon,
  CreditCard,
  ThumbsUp,
  MessageSquare,
  Share2,
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  Trophy,
  Crown,
  Phone,
  Video,
  ShieldCheck,
  Bell,
  Shield,
  UserPlus,
  UserCheck,
  BarChart3,
  Settings as SettingsIcon,
  ArrowRight,
  Megaphone,
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  ClipboardList,
  GraduationCap,
  Filter,
  Edit2,
  Sparkles,
  Download,
  RefreshCw,
  Users,
  Star,
  Copy,
  Clock,
  Gift,
  Sun,
  Moon,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdMob, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, AdMobBannerSize } from '@capacitor-community/admob';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import OneSignal from 'onesignal-cordova-plugin';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  arrayUnion, 
  arrayRemove,
  limit,
  getDocs,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { cn, formatWhatsAppTime, formatLastSeen } from './lib/utils';
import { COUNTRIES } from './constants';
import imageCompression from 'browser-image-compression';
import { getAI } from './lib/gemini';
import { User, Chat, Message, Post, Status, Notification as AppNotification, PostComment, AppSettings, PaymentProof, Job, JobApplication } from './types';

// --- Error Handling ---
enum OperationType { CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write' }
let firestoreErrorHandler: ((error: string) => void) | null = null;

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  // User-friendly mapping
  let userFriendly = errorMessage;
  if (errorMessage.includes('permission-denied')) userFriendly = 'Permission denied. You might need to sign in or upgrade your tier.';
  if (errorMessage.includes('quota-exceeded')) userFriendly = 'Database quota exceeded. The app will reset soon.';
  if (errorMessage.includes('offline')) userFriendly = 'Connection lost. Please check your internet.';
  
  const msg = `Action failed: ${userFriendly}`;
  console.error('Firestore Error:', { error: errorMessage, operationType, path });
  if (firestoreErrorHandler) firestoreErrorHandler(msg);
}

// --- Helpers ---
const notifyUser = async (notification: Partial<AppNotification>) => {
  try {
    const { userId, title, text, fromId, fromName, type, relatedId } = notification;
    if (!userId) return;

    const docData = {
      userId,
      fromId: fromId || 'system',
      fromName: fromName || 'Heart Connect',
      type: type || 'broadcast',
      text: text || '',
      title: title || (type === 'message' ? `New message from ${fromName}` : 'New Notification'),
      read: false,
      timestamp: serverTimestamp(),
      relatedId: relatedId || null
    };

    await addDoc(collection(db, 'notifications'), docData);

    // Send Push Notification via Server
    fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title: docData.title,
        message: docData.text,
        data: { type: docData.type, relatedId: docData.relatedId }
      })
    }).catch(e => console.warn("Push sync failed:", e));

  } catch (e) {
    console.error("Error creating notification:", e);
  }
};

const censorText = (text: string, words: string[]) => {
  if (!text || !words || words.length === 0) return text;
  let censored = text;
  words.forEach(word => {
    if (!word) return;
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    censored = censored.replace(regex, '***');
  });
  return censored;
};

const generateAffiliateCode = (uid: string) => {
  return uid.substring(0, 8).toUpperCase();
};

const capitalizeName = (name: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const VerifiedBadge = ({ size = 14 }: { size?: number }) => (
  <ShieldCheck className="text-blue-500 fill-blue-500/10" style={{ width: size, height: size }} />
);

const TierBadge = ({ tier, size = 14 }: { tier?: string, size?: number }) => {
  if (!tier || tier === 'General') return null;
  
  const config: Record<string, { icon: any, color: string }> = {
    'Bronze': { icon: Trophy, color: 'text-orange-500 fill-orange-500/10' },
    'Silver': { icon: Crown, color: 'text-blue-500 fill-blue-500/10' },
    'Gold': { icon: ShieldCheck, color: 'text-yellow-500 fill-yellow-500/10' },
    'Platinum': { icon: Crown, color: 'text-purple-500 fill-purple-500/10' }
  };

  const badge = config[tier];
  if (!badge) return null;

  const Icon = badge.icon;
  return <Icon className={badge.color} style={{ width: size, height: size }} />;
};

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  const fallback = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`;
  if (target.src !== fallback) {
    target.src = fallback;
  }
};

const Logo = ({ size = 40, className = "", url }: { size?: number, className?: string, url?: string }) => (
  <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
    <div className="absolute inset-0 bg-[#00a884] rounded-2xl rotate-12 opacity-20 animate-pulse" />
    <div className="absolute inset-0 bg-[#00a884] rounded-2xl -rotate-6 opacity-10" />
    <div className="relative bg-gradient-to-br from-[#00a884] to-[#008069] rounded-2xl flex items-center justify-center shadow-lg overflow-hidden" style={{ width: size, height: size }}>
      {url ? (
        <img src={url} className="w-full h-full object-cover" alt="Logo" referrerPolicy="no-referrer" onError={handleImageError} />
      ) : (
        <Heart className="text-white fill-white" style={{ width: size * 0.5, height: size * 0.5 }} />
      )}
    </div>
  </div>
);

const Avatar = ({ src, name, size = 40, className = "", isOnline, children }: { src?: string | null, name?: string, size?: number, className?: string, isOnline?: boolean, children?: React.ReactNode }) => {
  const getInitials = (n?: string) => {
    if (!n) return '?';
    const parts = n.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    return n.charAt(0).toUpperCase();
  };

  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 
    'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500'
  ];
  const colorIndex = name ? name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length : 0;
  const bgColor = colors[colorIndex];

  return (
    <div className={cn("relative flex-shrink-0", className)} style={{ width: size, height: size }}>
      {src ? (
        <img 
          src={src} 
          className="w-full h-full rounded-full object-cover" 
          alt={name} 
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            const next = target.nextElementSibling as HTMLElement;
            if (next) next.classList.remove('hidden');
          }}
        />
      ) : null}
      <div 
        className={cn("w-full h-full rounded-full items-center justify-center text-white font-bold", bgColor, src ? "hidden" : "flex")}
        style={{ fontSize: size * 0.4 }}
      >
        {getInitials(name)}
      </div>
      {isOnline && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#111b21] shadow-md z-10 animate-pulse" />
      )}
      {children}
    </div>
  );
};

const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => (
  <motion.div 
    initial={{ y: 50, opacity: 0 }} 
    animate={{ y: 0, opacity: 1 }} 
    exit={{ y: 50, opacity: 0 }}
    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 bg-red-500 text-white rounded-2xl shadow-2xl border border-red-400 backdrop-blur-md flex items-center gap-3 min-w-[280px] max-w-[90vw]"
  >
    <ShieldAlert className="w-5 h-5 shrink-0" />
    <p className="text-sm font-bold leading-tight flex-1">{message}</p>
    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4" /></button>
  </motion.div>
);

const ProfileReminder = ({ user, onClick }: { user: User, onClick: () => void }) => {
  const isIncomplete = !user.photoURL || !user.datingProfile?.bio || !user.datingProfile?.age;
  if (!isIncomplete) return null;

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      className="bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-100 dark:border-yellow-900/20 p-3 flex items-center justify-between gap-3 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600">
          <UserIcon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-[11px] font-bold text-yellow-800 dark:text-yellow-500 uppercase tracking-tight">Profile Incomplete</h4>
          <p className="text-[10px] text-yellow-700/80 dark:text-yellow-600">Add a photo and bio to get 2x more matches!</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-yellow-600" />
    </motion.div>
  );
};

const SplashScreen = ({ siteName, logoUrl, onForceLoad }: { siteName?: string, logoUrl?: string, onForceLoad?: () => void }) => {
  const [showBypass, setShowBypass] = useState(false);
  
  useEffect(() => {
    // Show bypass button after 4 seconds instead of 6
    const timer = setTimeout(() => {
      console.log("SplashScreen: showing bypass button");
      setShowBypass(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[1000] bg-white dark:bg-[#111b21] flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        <Logo size={80} url={logoUrl} />
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black text-[#111b21] dark:text-[#e9edef] tracking-tighter">{siteName || "Heart Connect"}</h1>
          <p className="text-sm text-[#667781] dark:text-[#8696a0] font-medium">Connecting Hearts, One Chat at a Time</p>
        </div>
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="w-48 h-1 bg-gray-100 dark:bg-[#2a3942] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="h-full bg-[#00a884]"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase font-bold tracking-widest">
            <ShieldCheck className="w-3 h-3 text-[#00a884]" />
            End-to-End Encrypted
          </div>
        </div>
        
            {showBypass && onForceLoad && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onForceLoad}
            className="mt-8 px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-full hover:bg-gray-200 transition-colors"
          >
            Entering App...
          </motion.button>
        )}
      </motion.div>
      <div className="absolute bottom-12 flex flex-col items-center gap-1">
        <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">Powered by</p>
        <p className="text-sm font-bold text-[#00a884]">{siteName || "Heart Connect"}</p>
      </div>
    </div>
  );
};

const compressImage = async (file: File) => {
  if (file.size > 0.5 * 1024 * 1024 && file.type.startsWith('image/')) {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true
    };
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error("Compression error:", error);
      return file;
    }
  }
  return file;
};

const uploadFileToServer = (file: File, onProgress?: (progress: number) => void) => {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.url);
      } else {
        reject(new Error('Failed to upload file to server'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
};

// --- Auth Screen ---
const AuthScreen = ({ settings }: { settings: AppSettings | null }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [featuredSingles, setFeaturedSingles] = useState<any[]>([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const q = query(collection(db, 'users'), where('isFeaturedSingle', '==', true), limit(5));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setFeaturedSingles(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
        }
      } catch (e) {
        console.error("Error fetching featured singles:", e);
      }
    };
    fetchFeatured();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setReferredBy(ref);
  }, []);

  const handleGoogleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
  
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin && (!firstName.trim() || !lastName.trim())) {
      setError('Please provide Name and Surname');
      return;
    }

    if (!isLogin && !acceptedTerms) {
      setError('You must accept the terms and conditions to sign up.');
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user document immediately with capitalized names
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const capFirst = capitalizeName(firstName);
        const capLast = capitalizeName(lastName);
        const userData = {
          uid: userCredential.user.uid,
          displayName: `${capFirst} ${capLast}`,
          firstName: capFirst,
          lastName: capLast,
          photoURL: null,
          gender: gender,
          createdAt: serverTimestamp(),
          role: userCredential.user.email === 'alasindani2020@gmail.com' ? 'admin' : 'user',
          category: 'General',
          points: 0,
          isOnline: true,
          notificationsEnabled: true,
          lastSeen: serverTimestamp(),
          status: "Hey there! I am using Heart Connect.",
          affiliateCode: generateAffiliateCode(userCredential.user.uid),
          referredBy: referredBy || null,
          referralCount: 0,
        };
        await setDoc(userDocRef, userData);

        if (referredBy) {
          // Increment referral count for the referrer
          const q = query(collection(db, 'users'), where('affiliateCode', '==', referredBy));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const referrer = snap.docs[0];
            const bonusPoints = settings?.pointsPerInvitation || 50;
            const { increment } = await import('firebase/firestore');
            await updateDoc(referrer.ref, { 
              referralCount: increment(1),
              points: increment(bonusPoints)
            });
            // Notify referrer
            await notifyUser({
              userId: referrer.id,
              fromId: 'system',
              fromName: 'Affiliate Program',
              type: 'broadcast',
              text: `Congratulations! ${userData.displayName} joined using your link. You earned ${bonusPoints} points!`,
              title: 'Referral Bonus!'
            });
          }
        }
        
        // Request notification permission on browser if available
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#0b141a] flex items-center justify-center p-4">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-[#111b21] p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100 dark:border-gray-800">
        <Logo size={48} className="mx-auto mb-4" url={settings?.logoUrl} />
        <h1 className="text-2xl font-black mb-1 text-[#00a884] tracking-tighter uppercase">Heart Connect Zimbabwe</h1>
        <p className="text-sm text-gray-600 dark:text-[#8696a0] mb-6 font-medium leading-relaxed px-4">
          Zimbabwe's #1 community for real connections. Connect with friends and family across the country and diaspora.
        </p>
        
        <div className="mb-8 mt-2 overflow-hidden">
          <div className="flex items-center justify-between px-1 mb-4">
            <h3 className="text-[11px] font-black text-gray-400 dark:text-[#8696a0] uppercase tracking-[0.2em]">Featured Singles</h3>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-pulse"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]/40"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]/20"></span>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 snap-x">
            {(featuredSingles.length > 0 ? featuredSingles : [
              { displayName: 'Sarah', datingProfile: { city: 'Bulawayo', age: 25 }, photoURL: 'https://picsum.photos/seed/sarah1/400' },
              { displayName: 'Grace', datingProfile: { city: 'Harare', age: 24 }, photoURL: 'https://picsum.photos/seed/grace2/400' },
              { displayName: 'Zoe', datingProfile: { city: 'Victoria Falls', age: 27 }, photoURL: 'https://picsum.photos/seed/zoe3/400' },
              { displayName: 'Tari', datingProfile: { city: 'Mutare', age: 26 }, photoURL: 'https://picsum.photos/seed/tari4/400' }
            ]).map((s, idx) => (
              <motion.div 
                key={s.uid || idx} 
                whileHover={{ y: -5 }}
                className="relative flex-shrink-0 w-32 snap-center group cursor-pointer" 
                onClick={() => alert("Sign up to chat with local singles!")}
              >
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-all border border-black/5 dark:border-white/5">
                  <img 
                    src={s.photoURL} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    alt={s.displayName} 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                  <div className="absolute bottom-2 left-2 right-2 text-left">
                    <p className="text-[10px] font-black text-white truncate">{s.displayName.split(' ')[0]}, {s.datingProfile?.age || '20+'}</p>
                    <p className="text-[7px] font-bold text-white/70 truncate flex items-center gap-0.5">
                      <MapPin className="w-2 h-2" /> {s.datingProfile?.city || 'Nearby'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Name" 
                  value={firstName}
                  onChange={(e) => setFirstName(capitalizeName(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-[#00a884]/20 bg-transparent dark:text-[#e9edef]"
                  required
                />
                <input 
                  type="text" 
                  placeholder="Surname" 
                  value={lastName}
                  onChange={(e) => setLastName(capitalizeName(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-[#00a884]/20 bg-transparent dark:text-[#e9edef]"
                  required
                />
            </div>
          )}

          {!isLogin && (
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-gray-400 dark:text-[#8696a0] uppercase tracking-widest ml-1">Select Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {(['male', 'female', 'other'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={cn(
                      "py-2.5 rounded-xl text-xs font-bold transition-all border uppercase tracking-wider",
                      gender === g 
                        ? "bg-[#00a884] border-[#00a884] text-white shadow-md shadow-[#00a884]/20" 
                        : "bg-white dark:bg-[#111b21] border-gray-200 dark:border-gray-800 text-gray-500 dark:text-[#8696a0] hover:border-gray-300"
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-[#00a884]/20 bg-transparent dark:text-[#e9edef]"
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-[#00a884]/20 bg-transparent dark:text-[#e9edef]"
            required
          />

          {!isLogin && (
            <div className="flex items-start gap-3 text-left px-1">
              <input 
                type="checkbox" 
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-[#00a884] focus:ring-[#00a884]"
              />
              <label htmlFor="terms" className="text-[11px] text-gray-500 leading-tight">
                I accept the <span className="text-[#00a884] font-bold cursor-pointer">Terms & Conditions</span> and 
                <span className="text-[#00a884] font-bold cursor-pointer ml-1">Privacy Policy</span>. 
                I also agree to receive site notifications.
              </label>
            </div>
          )}

          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
          <button type="submit" className="w-full bg-[#00a884] text-white font-black py-4 rounded-xl shadow-xl shadow-[#00a884]/30 active:scale-[0.98] transition-all text-lg uppercase tracking-wider">
            {isLogin ? 'Explore Hearts' : 'Join Heart Connect'}
          </button>
        </form>

        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-800"></div>
          <span className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold">OR</span>
          <div className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-800"></div>
        </div>

        <button onClick={handleGoogleLogin} className="w-full bg-white dark:bg-[#202c33] border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 mb-4 hover:bg-gray-50 dark:hover:bg-gray-800">
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" referrerPolicy="no-referrer" />
          Continue with Google
        </button>

        <button 
          onClick={() => setIsLogin(!isLogin)} 
          className="text-[#00a884] text-sm font-bold hover:underline"
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
        </button>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-3">Download Mobile App</p>
          <a 
            href="/download/apk" 
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#202c33] dark:bg-[#2a3942] text-white rounded-xl text-xs font-bold hover:bg-[#111b21] transition-all shadow-lg shadow-black/10"
          >
            <Smartphone className="w-4 h-4" />
            Download APK for Android
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  console.log("App component rendering...");
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'dating' | 'jobs'>('chats');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [seekerApps, setSeekerApps] = useState<JobApplication[]>([]);
  const [employerApps, setEmployerApps] = useState<JobApplication[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCreateAd, setShowCreateAd] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [adContent, setAdContent] = useState('');
  const [adMediaUrl, setAdMediaUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [backPressCount, setBackPressCount] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showAffiliate, setShowAffiliate] = useState(false);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  useEffect(() => {
    // Notify CapacitorUpdater that app is ready (Prevents rollback)
    if (Capacitor.isNativePlatform()) {
      CapacitorUpdater.notifyAppReady().catch(e => console.warn("notifyAppReady failed:", e));
    }

    // AdMob Initialization
    const initAdMob = async () => {
      try {
        await AdMob.initialize();
      } catch (e) {
        console.warn("AdMob already initialized or failed:", e);
      }
    };
    initAdMob();

    // OneSignal Initialization
    const initOneSignal = async () => {
      const appId = "32479931-809b-4497-a8d1-61b84bc8eb77";
      if (Capacitor.isNativePlatform()) {
        try {
          OneSignal.initialize(appId);
          OneSignal.Notifications.requestPermission(true).then((success) => {
            console.log("Notification permission status:", success);
          });

          OneSignal.Notifications.addEventListener('click', (event) => {
            console.log('OneSignal notification clicked:', event);
            const data = (event.notification as any).additionalData;
            if (data) {
              if (data.type === 'message' && data.relatedId) {
                // Find chat by ID and select it
                setActiveTab('chats');
                // Trigger a fetch or just set ID if we have it
                // For simplicity, we just navigate to tab
              } else if (data.type === 'broadcast') {
                setActiveTab('status');
              }
            }
          });
        } catch (e) {
          console.error("OneSignal Native Init Error:", e);
        }
      } else {
        // Web initialization is in index.html, but we can ensure it's logged in later
      }
    };
    initOneSignal();

    // Auto-update check for Capacitor
    const checkUpdates = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const baseUrl = 'https://chat.opramixes.com';
          const response = await fetch(`${baseUrl}/api/update`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          
          console.log('Checking for updates...', data.version);
          
          // Simple check to avoid redundant downloads
          const lastUpdateId = localStorage.getItem('last_update_id');
          if (lastUpdateId === data.version) {
             console.log('Already downloaded/set update for version:', data.version);
             return;
          }

          // Download and install update in background
          const update = await CapacitorUpdater.download({
            url: data.url,
            version: data.version
          });
          
          if (update && update.id) {
            // Set the update to be applied on next restart
            await CapacitorUpdater.set({ id: update.id });
            localStorage.setItem('last_update_id', data.version);
            console.log('Update successful, will apply on next restart.');
          }
        } catch (e) {
          console.warn("Auto-update check failed:", e);
        }
      }
    };
    checkUpdates();
  }, []); // Run once on mount

  useEffect(() => {
    // Back Button Logic
    const handleBackButton = () => {
      // Priority 1: Close main overlays/sub-views first (matches big ternary in App.tsx)
      if (selectedChat) {
        setSelectedChat(null);
        return;
      }
      if (showProfile) {
        setShowProfile(false);
        return;
      }
      if (showAdmin) {
        setShowAdmin(false);
        return;
      }
      if (viewingUser) {
        setViewingUser(null);
        return;
      }
      if (showNotifications) {
        setShowNotifications(false);
        return;
      }
      if (showUpgrade) {
        setShowUpgrade(false);
        return;
      }
      if (showCreateAd) {
        setShowCreateAd(false);
        setAdContent('');
        setAdMediaUrl('');
        return;
      }
      if (showCreateJob) {
        setShowCreateJob(false);
        setEditingJob(null);
        return;
      }
      if (selectedJob) {
        setSelectedJob(null);
        return;
      }
      if (showLeaderboard) {
        setShowLeaderboard(false);
        return;
      }
      if (showAffiliate) {
        setShowAffiliate(false);
        return;
      }
      if (applyingJob) {
        setApplyingJob(null);
        return;
      }

      // Priority 2: Floating/Local Overlays
      if (showMenu) {
        setShowMenu(false);
        return;
      }
      if (showSearch) {
        setShowSearch(false);
        return;
      }
      if (showStatusModal) {
        setShowStatusModal(false);
        return;
      }
      if (showPostModal) {
        setShowPostModal(false);
        return;
      }

      // Priority 3: If exit confirm is already showing, a second press exits
      if (showExitConfirm) {
        CapacitorApp.exitApp();
        return;
      }

      // Priority 4: Tab Navigation (return to home tab if on another)
      if (activeTab !== 'chats') {
        setActiveTab('chats');
        return;
      }

      // Priority 5: Show exit confirmation if on main screen
      setShowExitConfirm(true);
      setBackPressCount(1);
      
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      exitTimerRef.current = setTimeout(() => {
        setBackPressCount(0);
        setShowExitConfirm(false);
      }, 3000); // 3 seconds as requested
    };

    const backListener = CapacitorApp.addListener('backButton', handleBackButton);

    return () => {
      backListener.then(l => l.remove());
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [
    selectedChat, showProfile, showAdmin, viewingUser, showNotifications,
    showUpgrade, showCreateAd, showCreateJob, selectedJob, showLeaderboard,
    showAffiliate, applyingJob, showMenu, showSearch, activeTab,
    showStatusModal, showPostModal, showExitConfirm
  ]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    firestoreErrorHandler = (msg: string) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Update App Badge
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        (navigator as any).setAppBadge(unreadCount).catch((e: any) => console.log('Badging error:', e));
      } else {
        (navigator as any).clearAppBadge().catch((e: any) => console.log('Badging error:', e));
      }
    }
  }, [notifications]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  const usersMap = useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach(u => { map[u.uid] = u; });
    return map;
  }, [users]);

  const [appSettings, setAppSettings] = useState<AppSettings>({
    pointsPerPost: 10,
    pointsPerComment: 5,
    pointsPerLike: 2,
    moneyPerPoint: 0.01,
    tierPrices: { Bronze: 5, Silver: 10, Gold: 20, Platinum: 50 },
    tierDurations: { Bronze: '1 month', Silver: '1 month', Gold: '1 month', Platinum: '1 month' },
    adPricePerDay: 2,
    minAdDuration: 3,
    paymentMethods: [
      { type: 'Eco Cash', details: '0771234567' },
      { type: 'Inbucks', details: '0771234567' }
    ]
  });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].pageY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY !== null && scrollRef.current?.scrollTop === 0) {
      const distance = e.touches[0].pageY - startY;
      if (distance > 0) {
        setPullDistance(Math.min(distance * 0.4, 100));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 1500);
    }
    setPullDistance(0);
    setStartY(null);
  };

  useEffect(() => {
    console.log("App: Component mounted accurately");
    const debugEl = document.getElementById('debug-boot');
    if (debugEl) debugEl.innerText = 'App Rendered';
    
    const initTimer = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn("App: 4s safety timeout reached - forcing load");
          return false;
        }
        return false;
      });
    }, 4000);
    return () => clearTimeout(initTimer);
  }, []);

  const lastNotifRef = useRef<string | null>(null);

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (!latest.read && latest.id !== lastNotifRef.current) {
        lastNotifRef.current = latest.id;
        if ('Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(latest.title || 'Heart Connect', { 
            body: latest.text || (latest as any).content || 'You have a new message',
            icon: appSettings.faviconUrl || '/favicon.ico'
          });
          n.onclick = () => {
            window.focus();
            setShowNotifications(true);
            // We can't easily trigger the specific click here without passing data, 
            // but opening the center is a good first step.
          };
        }
      }
    }
  }, [notifications]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const awardPoints = async (amount: number) => {
    if (!user || !user.isVerified) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const { increment } = await import('firebase/firestore');
      await updateDoc(userRef, { points: increment(amount) });
      setUser({ ...user, points: (user.points || 0) + amount });
    } catch (e) {
      console.error("Error awarding points:", e);
    }
  };

  const [datingFilters, setDatingFilters] = useState({
    minAge: 18,
    maxAge: 50,
    gender: 'all',
    maxDistance: 50 // km
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users'), limit(500));
    const unsubscribe = onSnapshot(q, (snap) => {
      const allUsers = snap.docs.map(d => {
        const data = d.data();
        return { 
          uid: d.id, 
          ...data,
          displayName: capitalizeName(data.displayName || '')
        } as User;
      });
      
      // Sort users by signup date (createdAt) descending
      const sortedUsers = allUsers.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      setUsers(sortedUsers);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Ensure loading is shown during state change
      try {
        if (firebaseUser) {
          let userData: User | null = null;
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const { getDoc } = await import('firebase/firestore');

          try {
            // Try to get from server first, but allow falling back to local cache or continuing
            const userSnap = await getDoc(userDocRef).catch(err => {
              console.warn("Firestore fetch failed, checking cache...", err);
              return null; 
            });
            
            if (userSnap && userSnap.exists()) {
              const data = userSnap.data();
              userData = { 
                uid: firebaseUser.uid, 
                ...data,
                displayName: capitalizeName(data.displayName || '')
              } as User;
              // Update online status (don't await strictly)
              updateDoc(userDocRef, { isOnline: true, lastSeen: serverTimestamp() }).catch(e => console.warn("Status update failed:", e));
              userData.isOnline = true;
            } else {
              const rawName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous';
              userData = {
                uid: firebaseUser.uid,
                displayName: capitalizeName(rawName),
                photoURL: firebaseUser.photoURL || null,
                role: firebaseUser.email === 'alasindani2020@gmail.com' ? 'admin' : 'user',
                category: 'General',
                points: 0,
                isOnline: true,
                lastSeen: serverTimestamp(),
                status: "Hey there! I am using Heart Connect.",
              };
              try { 
                await setDoc(userDocRef, userData, { merge: true }); 
              } catch (e) { 
                handleFirestoreError(e, OperationType.WRITE, `users/${firebaseUser.uid}`); 
              }
            }

            // Sync with OneSignal
            try {
              if (Capacitor.isNativePlatform()) {
                OneSignal.login(firebaseUser.uid);
              } else {
                (window as any).OneSignalDeferred?.push(async (OS: any) => {
                  await OS.login(firebaseUser.uid);
                });
              }
            } catch (e) {
              console.warn("OneSignal login sync failed:", e);
            }

            // Force generate affiliate code if missing
            if (!userData.affiliateCode) {
              const code = generateAffiliateCode(userData.uid);
              await updateDoc(userDocRef, { affiliateCode: code }).catch(e => console.warn("Failed to set affiliate code:", e));
              userData.affiliateCode = code;
            }

            setUser(userData);
          } catch (innerErr) {
            console.error("Error in auth data fetching:", innerErr);
            // Fallback: use basic auth info if firestore is totally dead
            setUser({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'User',
              photoURL: firebaseUser.photoURL,
              role: firebaseUser.email === 'alasindani2020@gmail.com' ? 'admin' : 'user'
            } as User);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Critical error in onAuthStateChanged:", err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("Auth state error:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const handleVisibilityChange = () => {
      const isOnline = document.visibilityState === 'visible';
      updateDoc(userDocRef, { isOnline, lastSeen: serverTimestamp() });
    };
    const handleUnload = () => {
      updateDoc(userDocRef, { isOnline: false, lastSeen: serverTimestamp() });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user?.uid]);

  // Seed Data for Zimbabwe Profiles
  useEffect(() => {
    if (appSettings?.googleAnalyticsCode) {
      const script = document.createElement('script');
      script.innerHTML = appSettings.googleAnalyticsCode;
      document.head.appendChild(script);
    }
    if (appSettings?.adSenseCode) {
      const script = document.createElement('script');
      script.innerHTML = appSettings.adSenseCode;
      document.head.appendChild(script);
    }
  }, [appSettings]);

  useEffect(() => {
    const seedZimProfiles = async () => {
      if (!user || user.role !== 'admin') return;
      
      const zimProfiles = [
        {
          uid: 'zim_harare_25',
          displayName: 'Chipo',
          photoURL: 'https://picsum.photos/seed/zim4/200',
          role: 'user',
          category: 'General',
          points: 100,
          isOnline: true,
          lastSeen: serverTimestamp(),
          status: "Single and searching in Harare.",
          datingProfile: {
            bio: "Beautiful black female from Harare, 25. Love exploring the city.",
            age: 25,
            gender: 'female',
            country: 'Zimbabwe',
            city: 'Harare',
            interests: ['Music', 'City Life', 'Dancing']
          }
        },
        {
          uid: 'zim_harare_30',
          displayName: 'Nyasha',
          photoURL: 'https://picsum.photos/seed/zim5/200',
          role: 'user',
          category: 'General',
          points: 150,
          isOnline: true,
          lastSeen: serverTimestamp(),
          status: "Harare vibes. Let's connect!",
          datingProfile: {
            bio: "Professional black female in Harare, 30. Enjoying life and looking for a partner.",
            age: 30,
            gender: 'female',
            country: 'Zimbabwe',
            city: 'Harare',
            interests: ['Dining', 'Business', 'Art']
          }
        },
        {
          uid: 'zim_harare_35',
          displayName: 'Ruvimbo',
          photoURL: 'https://picsum.photos/seed/zim6/200',
          role: 'user',
          category: 'General',
          points: 200,
          isOnline: true,
          lastSeen: serverTimestamp(),
          status: "Peaceful life in Harare.",
          datingProfile: {
            bio: "Mature black female from Harare, 35. Family oriented and kind hearted.",
            age: 35,
            gender: 'female',
            country: 'Zimbabwe',
            city: 'Harare',
            interests: ['Family', 'Cooking', 'Nature']
          }
        }
      ];

      for (const profile of zimProfiles) {
        try {
          const profileDoc = doc(db, 'users', profile.uid);
          await setDoc(profileDoc, profile, { merge: true });
        } catch (e) {
          console.error("Error seeding profile:", e);
        }
      }
    };

    seedZimProfiles();
  }, []);

  useEffect(() => {
    const handleBack = (e: PopStateEvent) => {
      if (selectedChat) {
        setSelectedChat(null);
        window.history.pushState(null, '', window.location.pathname);
      } else if (showProfile || showAdmin || viewingUser || showNotifications || showUpgrade || showLeaderboard || showCreateAd || showCreateJob || selectedJob) {
        setShowProfile(false);
        setShowAdmin(false);
        setViewingUser(null);
        setShowAffiliate(false);
        setShowNotifications(false);
        setShowUpgrade(false);
        setShowLeaderboard(false);
        setShowCreateAd(false);
        setShowCreateJob(false);
        setSelectedJob(null);
        window.history.pushState(null, '', window.location.pathname);
      } else {
        setBackPressCount(prev => {
          const next = prev + 1;
          if (next >= 3) {
            setShowExitConfirm(true);
            return 0;
          }
          return next;
        });
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [selectedChat, showProfile, showAdmin, viewingUser, showAffiliate, showNotifications, showUpgrade, showLeaderboard, showCreateAd, showCreateJob, selectedJob]);

  const handleFollowEmployer = async (employerId: string) => {
    if (!user) return;
    const isFollowing = user.followingEmployers?.includes(employerId);
    const userRef = doc(db, 'users', user.uid);
    try {
      if (isFollowing) {
        await updateDoc(userRef, { followingEmployers: arrayRemove(employerId) });
      } else {
        await updateDoc(userRef, { followingEmployers: arrayUnion(employerId) });
      }
      setUser((prev: any) => ({
        ...prev,
        followingEmployers: isFollowing 
          ? prev.followingEmployers?.filter((id: string) => id !== employerId)
          : [...(prev.followingEmployers || []), employerId]
      }));
    } catch (e) {
      console.error("Follow error:", e);
    }
  };

  const handleApplyJob = (job: Job) => {
    if (!user) return;
    const existing = applications.find(a => a.jobId === job.id && a.seekerId === user.uid);
    if (existing) return alert("You already applied!");
    setApplyingJob(job);
  };

  const finalizeJobApplication = async (job: Job, qualifications: JobApplication['qualifications']) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'applications'), {
        jobId: job.id,
        employerId: job.employerId,
        seekerId: user.uid,
        seekerName: user.displayName,
        seekerPhoto: user.photoURL || '',
        status: 'applied',
        qualifications,
        timestamp: serverTimestamp()
      });

      // Notify Employer
      await notifyUser({
        userId: job.employerId,
        fromId: user.uid,
        fromName: user.displayName,
        type: 'job_update',
        text: `New application for "${job.title}"`,
        relatedId: job.id
      });

      const participants = [user.uid, job.employerId].sort();
      const q = query(collection(db, 'chats'), where('participants', '==', participants), limit(1));
      const snap = await getDocs(q);
      
      let chat: Chat;
      if (snap.empty) {
        const ref = await addDoc(collection(db, 'chats'), { participants, updatedAt: serverTimestamp(), lastMessage: { text: `Job App: ${job.title}`, senderId: user.uid, timestamp: serverTimestamp(), type: 'text', status: 'sent' } });
        await addDoc(collection(db, `chats/${ref.id}/messages`), { senderId: user.uid, text: `I applied for: ${job.title}`, timestamp: serverTimestamp(), type: 'text', status: 'sent' });
        chat = { id: ref.id, participants } as any;
      } else {
        chat = { id: snap.docs[0].id, ...snap.docs[0].data() } as Chat;
      }
      setSelectedChat(chat);
      setActiveTab('chats');
      alert("Applied!");
    } catch (e) { alert("Apply failed"); }
  };

  const handleUpdateApplicationStatus = async (app: JobApplication, status: JobApplication['status']) => {
    try {
      await updateDoc(doc(db, 'applications', app.id), { status });
      
      const job = jobs.find(j => j.id === app.jobId);
      
      await notifyUser({
        userId: app.seekerId,
        fromId: user?.uid || 'system',
        fromName: user?.displayName || 'Employer',
        type: 'job_update',
        text: `Application for "${job?.title || 'Job'}" updated to: ${status}`,
        relatedId: app.jobId
      });
      alert(`Status updated to ${status}`);
    } catch (e) { 
      console.error(e);
      alert("Update failed"); 
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm("Are you sure you want to delete this job posting? This will also affect existing applications.")) return;
    try {
      await deleteDoc(doc(db, 'jobs', jobId));
      alert("Job deleted");
    } catch (e) { alert("Delete failed"); }
  };

  useEffect(() => {
    if (backPressCount > 0) {
      const timer = setTimeout(() => setBackPressCount(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [backPressCount]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDocs(collection(db, 'settings'));
        if (!docSnap.empty) {
          setAppSettings(docSnap.docs[0].data() as AppSettings);
        } else {
          // Initialize settings if they don't exist
          await addDoc(collection(db, 'settings'), appSettings);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'settings');
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (user && user.uid && !user.hasSeenAffiliateWelcome) {
      const sendAffiliateWelcome = async () => {
        const promoMsg = `Welcome to Heart Connect! 💖 Share the love and earn points. Your affiliate code is: ${user.affiliateCode || 'N/A'}. Go to Profile > Affiliate Program to see your referral link and points!`;
        
        await notifyUser({
          userId: user.uid,
          fromId: 'system',
          fromName: 'Heart Connect',
          type: 'broadcast',
          text: promoMsg
        });

        await updateDoc(doc(db, 'users', user.uid), { hasSeenAffiliateWelcome: true });
        setUser((prev: any) => prev ? { ...prev, hasSeenAffiliateWelcome: true } : null);
      };
      sendAffiliateWelcome();
    }
  }, [user?.uid, user?.hasSeenAffiliateWelcome]);

  const [targetPostId, setTargetPostId] = useState<string | null>(null);

  useEffect(() => {
    if (appSettings.siteName) {
      document.title = appSettings.siteName;
    }
    const updateBranding = () => {
      // Favicon logic
      if (appSettings.faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = appSettings.faviconUrl;
      }
      
      // Dynamic Manifest for PWA Icon
      if (appSettings.logoUrl) {
        const manifest = {
          short_name: appSettings.siteName || "HeartConnect",
          name: appSettings.siteName || "Heart Connect - Dating & Social",
          icons: [
            {
              src: appSettings.logoUrl,
              sizes: "192x192 512x512",
              type: "image/png"
            }
          ],
          start_url: ".",
          display: "standalone",
          theme_color: "#00a884",
          background_color: "#ffffff"
        };
        const stringManifest = JSON.stringify(manifest);
        const blob = new Blob([stringManifest], {type: 'application/json'});
        const manifestURL = URL.createObjectURL(blob);
        let manifestLink: HTMLLinkElement | null = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
          manifestLink.href = manifestURL;
        }
      }

      // Title logic
      if (appSettings.siteName) {
        document.title = appSettings.siteName;
      }
    };
    updateBranding();
    // Fast update interval for logo/favicon in case of dynamic changes
    const timer = setInterval(updateBranding, 2000);
    return () => clearInterval(timer);
  }, [appSettings]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat))), (e) => handleFirestoreError(e, OperationType.LIST, 'chats'));
  }, [user?.uid]);

  useEffect(() => {
    if (!selectedChat || !user) return;
    
    const resetUnread = async () => {
      try {
        const chatDoc = doc(db, 'chats', selectedChat.id);
        const unreadKey = `unreadCount.${user.uid}`;
        
        const updates: any = {
          [unreadKey]: 0,
        };

        // If the last message was NOT sent by us and is not seen, mark it seen
        if (selectedChat.lastMessage?.senderId !== user.uid && selectedChat.lastMessage?.status !== 'seen') {
          updates['lastMessage.status'] = 'seen';
        }

        await updateDoc(chatDoc, updates);
        
        // Mark all recent messages as seen in background
        const q = query(
          collection(db, `chats/${selectedChat.id}/messages`), 
          where('status', '!=', 'seen'),
          limit(50)
        );
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        let hasUpdates = false;
        snap.forEach(d => {
          if (d.data().senderId !== user.uid) {
            batch.update(d.ref, { status: 'seen' });
            hasUpdates = true;
          }
        });
        if (hasUpdates) await batch.commit();
      } catch (e) {
        console.error("Error resetting unread count:", e);
      }
    };
    
    resetUnread();
  }, [selectedChat?.id, user?.uid, messages.length]); // Added messages.length to trigger when new messages arrive while chat is open

  useEffect(() => {
    if (!selectedChat) return;
    const q = query(collection(db, `chats/${selectedChat.id}/messages`), orderBy('timestamp', 'asc'), limit(100));
    return onSnapshot(q, (snapshot) => setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message))), (e) => handleFirestoreError(e, OperationType.LIST, 'messages'));
  }, [selectedChat]);

  useEffect(() => {
    if (!user || activeTab !== 'status') return;
    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    const qStatus = query(collection(db, 'statuses'), orderBy('createdAt', 'desc'));
    const unsubPosts = onSnapshot(qPosts, (snap) => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post))), (e) => handleFirestoreError(e, OperationType.LIST, 'posts'));
    const unsubStatus = onSnapshot(qStatus, (snap) => setStatuses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Status))), (e) => handleFirestoreError(e, OperationType.LIST, 'statuses'));
    
    // Notifications listener
    const qNotif = query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'), limit(20));
    const unsubNotif = onSnapshot(qNotif, (snap) => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification))), (e) => handleFirestoreError(e, OperationType.LIST, 'notifications'));

    return () => { unsubPosts(); unsubStatus(); unsubNotif(); };
  }, [user, activeTab]);

  // Browser Push Notifications
  useEffect(() => {
    if (!user || notifications.length === 0) return;
    
    // Get the most recent unread notification
    const latest = notifications[0];
    if (!latest.read) {
      // Check if we've already notified for this ID to avoid duplication
      const lastNotifiedId = sessionStorage.getItem('lastNotifiedId');
      if (lastNotifiedId !== latest.id) {
        if ('Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(latest.title || `New from ${latest.fromName}`, {
            body: latest.text,
            icon: appSettings.logoUrl || '/favicon.ico'
          });
          n.onclick = () => {
            window.focus();
            setShowNotifications(true);
          };
          sessionStorage.setItem('lastNotifiedId', latest.id);
        }
      }
    }
  }, [notifications, user?.uid, appSettings.logoUrl]);

  useEffect(() => {
    if (!user) return;
    const qJobs = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(50));
    const unsubJobs = onSnapshot(qJobs, (snap) => setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Job))), (e) => handleFirestoreError(e, OperationType.LIST, 'jobs'));
    
    // Fetch as Seeker
    const qSeeker = query(collection(db, 'applications'), where('seekerId', '==', user.uid), orderBy('timestamp', 'desc'));
    const unsubSeeker = onSnapshot(qSeeker, (snap) => setSeekerApps(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication))), (e) => handleFirestoreError(e, OperationType.LIST, 'applications/seeker'));

    // Fetch as Employer
    const qEmployer = query(collection(db, 'applications'), where('employerId', '==', user.uid), orderBy('timestamp', 'desc'));
    const unsubEmployer = onSnapshot(qEmployer, (snap) => setEmployerApps(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication))), (e) => handleFirestoreError(e, OperationType.LIST, 'applications/employer'));

    return () => { unsubJobs(); unsubSeeker(); unsubEmployer(); };
  }, [user?.uid, activeTab]);

  useEffect(() => {
    const combined = [...seekerApps, ...employerApps];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values())
      .sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    setApplications(unique);
  }, [seekerApps, employerApps]);

  // Optimized Delivered status logic
  useEffect(() => {
    if (!user || chats.length === 0) return;
    
    const processDelivered = async () => {
      const pendingChats = chats.filter(chat => 
        chat.lastMessage && 
        chat.lastMessage.senderId !== user.uid && 
        chat.lastMessage.status === 'sent'
      );

      if (pendingChats.length === 0) return;

      for (const chat of pendingChats) {
        try {
          // Update chat lastMessage status
          await updateDoc(doc(db, 'chats', chat.id), { 'lastMessage.status': 'delivered' });
          
          // Update individual messages that are still 'sent'
          const q = query(
            collection(db, `chats/${chat.id}/messages`), 
            where('status', '==', 'sent'),
            limit(10)
          );
          const snap = await getDocs(q);
          
          const batch = writeBatch(db);
          let hasUpdates = false;
          
          snap.forEach((d) => {
            if (d.data().senderId !== user.uid) {
              batch.update(doc(db, `chats/${chat.id}/messages`, d.id), { status: 'delivered' });
              hasUpdates = true;
            }
          });
          
          if (hasUpdates) await batch.commit();
        } catch (e) {
          console.error("Error updating delivered status:", e);
        }
      }
    };

    processDelivered();
  }, [chats, user?.uid]);

  if (loading) return (
    <SplashScreen 
      siteName={appSettings?.siteName} 
      logoUrl={appSettings?.logoUrl} 
      onForceLoad={() => {
        console.warn("Emergency bypass triggered.");
        setLoading(false);
      }}
    />
  );
  if (!user) return <AuthScreen settings={appSettings} />;

  if (user.suspended) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0b141a] p-8 text-center">
      <ShieldAlert className="w-16 h-16 text-red-500 mb-6" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e9edef] mb-2">Account Suspended</h1>
      <p className="text-gray-500 dark:text-[#8696a0] mb-8">Your account has been suspended for violating our terms of service. If you believe this is a mistake, please contact support.</p>
      <button onClick={() => auth.signOut()} className="bg-[#00a884] text-white px-8 py-3 rounded-full font-bold shadow-lg">Sign Out</button>
    </div>
  );

  const sendMessage = async (text: string, type: string = 'text') => {
    if (!selectedChat || !text.trim()) return;
    
    // Constraint: Users without profile photos allowed 3 messages only
    if (!user.photoURL && (user.messageCount || 0) >= 3) {
      alert("⚠️ Profile Photo Required! To ensure community safety, users without profile photos are limited to 3 messages. Please upload a profile photo to continue messaging.");
      setShowProfile(true);
      
      // Send them a formal notification as well
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        fromId: 'system',
        fromName: appSettings.siteName || 'Heart Connect',
        type: 'broadcast',
        text: 'Action Required: Please upload a profile photo to unlock unlimited messaging. Your safety is our priority!',
        title: 'Messaging Limit Reached',
        read: false,
        timestamp: serverTimestamp()
      });
      return;
    }
    
    // Scramble phone numbers and censor words
    let processedText = text.replace(/\d{8,}/g, (match) => {
      return match.split('').sort(() => Math.random() - 0.5).join('');
    });
    
    if (appSettings.sensoredWords?.length) {
      processedText = censorText(processedText, appSettings.sensoredWords);
    }

    const msgData = { 
      chatId: selectedChat.id, 
      senderId: user.uid, 
      text: processedText, 
      type, 
      timestamp: serverTimestamp(), 
      status: 'sent' 
    };

    // Parallelize writes for better performance and reduced latency
    const messagePromise = addDoc(collection(db, `chats/${selectedChat.id}/messages`), msgData);
    
    const chatUpdatePromise = updateDoc(doc(db, 'chats', selectedChat.id), { 
      lastMessage: { 
        text: type === 'text' ? processedText : `Sent an ${type}`, 
        senderId: user.uid, 
        timestamp: serverTimestamp(),
        status: 'sent'
      }, 
      updatedAt: serverTimestamp() 
    });

    // Update user message count
    const { increment } = await import('firebase/firestore');
    const userUpdatePromise = updateDoc(doc(db, 'users', user.uid), {
      messageCount: increment(1)
    });

    const otherId = selectedChat.participants.find(p => p !== user.uid);
    let notificationPromise: Promise<any> = Promise.resolve();
    if (otherId) {
      // Increment unread count for recipient
      const { increment } = await import('firebase/firestore');
      const unreadKey = `unreadCount.${otherId}`;
      
      const unreadUpdatePromise = updateDoc(doc(db, 'chats', selectedChat.id), {
        [unreadKey]: increment(1)
      });
      
      notificationPromise = notifyUser({
        userId: otherId,
        fromId: user.uid,
        fromName: user.displayName,
        type: 'message',
        text: `${processedText.substring(0, 30)}${processedText.length > 30 ? '...' : ''}`,
        relatedId: selectedChat.id
      });
      
      // If phone number or sensitive word was detected, send warning notification
      if (text !== processedText) {
        notifyUser({
          userId: user.uid,
          fromId: 'system',
          fromName: 'Heart Connect',
          type: 'message',
          title: 'Direct Contact Warning',
          text: 'Please Use Heart Connect for chats. Phone numbers are scrambled for your safety.'
        });
      }
    }

    try {
      await Promise.all([messagePromise, chatUpdatePromise, notificationPromise]);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `chats/${selectedChat.id}/messages`);
    }
  };

  return (
    <div className="h-screen bg-white dark:bg-[#111b21] flex flex-col overflow-hidden max-w-md mx-auto shadow-2xl border-x border-gray-200 dark:border-gray-800 relative transition-colors duration-300">
      {user && <AdMobBanner />}
      {uploading && (
        <div className="fixed top-0 left-0 right-0 z-[1000] h-1 bg-gray-100 dark:bg-gray-800">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${uploadProgress}%` }}
            className="h-full bg-[#00a884] shadow-[0_0_10px_#00a884]"
          />
        </div>
      )}
      {selectedChat ? (
        <div className="absolute inset-0 z-50 bg-[#efeae2] dark:bg-[#0b141a] flex flex-col">
          <ChatView user={user} chat={selectedChat} messages={messages} onBack={() => setSelectedChat(null)} onSendMessage={sendMessage} onUserClick={(u: any) => { setViewingUser(u); setSelectedChat(null); }} />
        </div>
      ) : showProfile ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] dark:bg-[#111b21] flex flex-col">
          <ProfileSettings 
            user={user} 
            onBack={() => setShowProfile(false)} 
            onUpdate={(updatedUser: User) => setUser(updatedUser)} 
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        </div>
      ) : showAdmin ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] dark:bg-[#111b21] flex flex-col h-screen overflow-hidden">
          <AdminDashboard user={user} onBack={() => setShowAdmin(false)} />
        </div>
      ) : viewingUser ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] dark:bg-[#111b21] flex flex-col">
          <UserProfileView 
            user={user} 
            targetUser={viewingUser} 
            onBack={() => setViewingUser(null)} 
            onStartChat={(chat: any) => { setViewingUser(null); setSelectedChat(chat); }}
            onOpenAffiliate={() => { setViewingUser(null); setShowAffiliate(true); }}
            onEditProfile={() => { setViewingUser(null); setShowProfile(true); }}
          />
        </div>
      ) : showNotifications ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] dark:bg-[#111b21] flex flex-col">
          <NotificationCenter 
            user={user} 
            notifications={notifications} 
            usersMap={usersMap}
            onBack={() => setShowNotifications(false)} 
            onNavigate={(tab: string, id: string | null) => {
              setShowNotifications(false);
              if (tab === 'chat' && id) {
                const chat = chats.find(c => c.id === id);
                if (chat) setSelectedChat(chat);
              } else if (tab === 'dating') {
                setActiveTab('dating');
              } else if (tab === 'status') {
                setActiveTab('status');
                if (id) {
                  setTargetPostId(id);
                  // Reset target after some time
                  setTimeout(() => setTargetPostId(null), 3000);
                }
              }
            }}
          />
        </div>
      ) : showUpgrade ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] dark:bg-[#111b21] flex flex-col overflow-hidden">
          <UpgradeTiers user={user} onBack={() => setShowUpgrade(false)} settings={appSettings} />
        </div>
      ) : showCreateAd ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] dark:bg-[#111b21] flex flex-col">
          <CreateAd 
            user={user} 
            onBack={() => { setShowCreateAd(false); setAdContent(''); setAdMediaUrl(''); }} 
            settings={appSettings} 
            initialContent={adContent}
            initialMediaUrl={adMediaUrl}
          />
        </div>
      ) : showCreateJob ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] dark:bg-[#111b21] flex flex-col">
          <CreateJob user={user} jobToEdit={editingJob} onBack={() => { setShowCreateJob(false); setEditingJob(null); }} />
        </div>
      ) : selectedJob ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] dark:bg-[#111b21] flex flex-col">
          <JobDetails job={selectedJob} user={user} applications={applications} onBack={() => setSelectedJob(null)} onApply={handleApplyJob} onFollow={handleFollowEmployer} />
        </div>
      ) : showLeaderboard ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] dark:bg-[#111b21] flex flex-col">
          <PointsLeaderboard onBack={() => setShowLeaderboard(false)} />
        </div>
      ) : showAffiliate ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] dark:bg-[#111b21] flex flex-col">
          <AffiliateDashboard user={user} onBack={() => setShowAffiliate(false)} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <ProfileReminder user={user} onClick={() => setShowProfile(true)} />
          {/* App Header */}
          <div className="bg-[#008069] dark:bg-[#202c33] text-white p-4 pb-2 shadow-md relative z-30 transition-colors duration-300">
            <div className="flex justify-between items-center mb-4">
              <div 
                className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-transform"
                onClick={() => window.location.reload()}
              >
                <Logo size={32} className="shadow-none group-hover:scale-110 transition-transform" url={appSettings?.logoUrl} />
                <h1 className="text-xl font-black tracking-tighter group-hover:opacity-80 transition-opacity flex items-center gap-2">
                  {appSettings?.siteName || "Heart Connect"}
                </h1>
              </div>
              <div className="flex gap-4 items-center">
                <button 
                  onClick={() => {
                    const newMode = !darkMode;
                    setDarkMode(newMode);
                    localStorage.setItem('darkMode', JSON.stringify(newMode));
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                  title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <Camera className="w-6 h-6 cursor-pointer" onClick={() => setActiveTab('status')} />
                <Search className="w-6 h-6 cursor-pointer" onClick={() => setShowSearch(!showSearch)} />
                <div className="relative cursor-pointer" onClick={() => setShowNotifications(true)}>
                  <Bell className="w-6 h-6" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <button onClick={() => setShowMenu(!showMenu)} className="p-1"><MoreVertical className="w-6 h-6" /></button>
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#202c33] rounded-lg shadow-xl py-2 z-50 border border-gray-100 dark:border-gray-800">
                      <button onClick={() => { setShowProfile(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3">
                        <UserIcon className="w-4 h-4" /> Profile
                      </button>
                      <button onClick={() => { setShowAffiliate(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3">
                        <Users className="w-4 h-4 text-[#00a884]" /> Affiliate Program
                      </button>
                      <button onClick={() => { setShowLeaderboard(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3">
                        <Trophy className="w-4 h-4 text-yellow-600" /> Leaderboard
                      </button>
                      <button onClick={() => { setShowCreateAd(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3">
                        <Megaphone className="w-4 h-4 text-blue-600" /> Create Ad
                      </button>
                      {user.category === 'General' && (
                        <button onClick={() => { setShowUpgrade(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3">
                          <Crown className="w-4 h-4 text-purple-600" /> Upgrade
                        </button>
                      )}
                      {user.role === 'admin' && (
                        <button onClick={() => { setShowAdmin(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-[#00a884] hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3">
                          <Shield className="w-4 h-4" /> Admin Panel
                        </button>
                      )}
                      <button onClick={() => { signOut(auth); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3">
                        <LogOut className="w-4 h-4" /> Log out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {showSearch && (
              <div className="mb-3 animate-in slide-in-from-top duration-200">
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats or users..." 
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm placeholder:text-white/50 outline-none focus:bg-white/20 transition-all"
                />
              </div>
            )}
            {/* Tabs */}
            <div className="flex text-center font-medium text-sm uppercase tracking-wider">
              <button onClick={() => setActiveTab('chats')} className={cn("flex-1 pb-3 border-b-4 transition-colors", activeTab === 'chats' ? "border-white" : "border-transparent opacity-70")}>Chats</button>
              <button onClick={() => setActiveTab('status')} className={cn("flex-1 pb-3 border-b-4 transition-colors", activeTab === 'status' ? "border-white" : "border-transparent opacity-70")}>Status & Updates</button>
              <button onClick={() => setActiveTab('dating')} className={cn("flex-1 pb-3 border-b-4 transition-colors", activeTab === 'dating' ? "border-white" : "border-transparent opacity-70")}>Dating</button>
              <button onClick={() => setActiveTab('jobs')} className={cn("flex-1 pb-3 border-b-4 transition-colors", activeTab === 'jobs' ? "border-white" : "border-transparent opacity-70")}>Jobs</button>
            </div>
          </div>

          {/* Tab Content */}
          <div 
            ref={scrollRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-1 overflow-y-auto bg-white dark:bg-[#111b21] overscroll-contain scroll-smooth custom-scrollbar relative pb-[60px]"
          >
            {/* Pull to Refresh Indicator */}
            <motion.div 
              style={{ height: pullDistance, opacity: pullDistance / 60 }}
              className="flex items-center justify-center overflow-hidden bg-gray-50/50 dark:bg-black/10"
            >
              <div className={cn("p-2 rounded-full bg-white dark:bg-[#2a3942] shadow-md", pullDistance > 60 && "text-[#00a884]")}>
                <RefreshCw className={cn("w-5 h-5", pullDistance > 60 && "animate-rotate")} />
              </div>
            </motion.div>

            {/* Refreshing Overlay */}
            <AnimatePresence>
              {isRefreshing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[60] bg-white/40 dark:bg-black/20 backdrop-blur-[2px] flex items-center justify-center"
                >
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="p-4 bg-white dark:bg-[#2a3942] rounded-full shadow-xl"
                  >
                    <RefreshCw className="w-8 h-8 text-[#00a884]" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {errorMessage && (
                <Toast message={errorMessage} onClose={() => setErrorMessage(null)} />
              )}
            </AnimatePresence>

            {deferredPrompt && !isInstalled && (
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mx-4 mb-4 p-4 glass-card rounded-2xl flex items-center justify-between border-[#00a884]/30"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#00a884] rounded-lg">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold dark:text-white">Install Web App</h4>
                    <p className="text-[10px] text-gray-500 dark:text-[#8696a0]">Install for faster access and better notifications!</p>
                  </div>
                </div>
                <button 
                  onClick={handleInstallClick}
                  className="bg-[#00a884] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-[#008069] transition-colors"
                >
                  Install Now
                </button>
              </motion.div>
            )}

            {activeTab === 'chats' && (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {isRefreshing ? (
                  <div className="p-0">
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonChat key={i} />)}
                  </div>
                ) : chats.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-[#111b21] rounded-full flex items-center justify-center">
                      <MessageCircle className="w-10 h-10 text-gray-200 dark:text-gray-800" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-[#e9edef]">No chats yet</h3>
                      <p className="text-sm text-gray-500 dark:text-[#8696a0] max-w-[200px] mx-auto">Start a conversation with someone from the dating or status tab!</p>
                    </div>
                  </div>
                ) : chats.filter(c => {
                  if (!searchQuery) return true;
                  const name = c.groupName || '';
                  return name.toLowerCase().includes(searchQuery.toLowerCase());
                }).length === 0 ? (
                  <div className="p-12 text-center">
                    <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500">No results for "{searchQuery}"</p>
                  </div>
                ) : (
                  chats.filter(c => {
                    if (!searchQuery) return true;
                    const name = c.groupName || '';
                    return name.toLowerCase().includes(searchQuery.toLowerCase());
                  }).map(chat => {
                    const otherId = chat.participants.find((p: string) => p !== user.uid);
                    const otherUser = users.find(u => u.uid === otherId);
                    const isTyping = chat.typing && Object.entries(chat.typing).some(([uid, typing]) => uid === otherId && typing);
                    const chatName = chat.groupName || otherUser?.displayName || "Chat";
                    const chatPhoto = otherUser?.photoURL;
                    
                    return (
                      <div key={chat.id} onClick={() => setSelectedChat(chat)} className="flex items-center gap-4 p-4 active:bg-gray-100 dark:active:bg-[#202c33] transition-colors cursor-pointer group">
          <Avatar 
            src={chatPhoto} 
            name={chatName} 
            size={56} 
            isOnline={otherUser?.isOnline} 
            className="group-hover:scale-105 transition-transform"
          />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <h3 className="font-bold text-[#111b21] dark:text-[#e9edef] truncate flex items-center gap-1">
                              {chatName}
                              {otherUser?.isOnline && <div className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />}
                              <TierBadge tier={otherUser?.category} size={14} />
                              {otherUser?.isVerified && <VerifiedBadge size={14} />}
                            </h3>
                            <div className="text-right flex flex-col items-end gap-1">
                              <span className={cn("text-[10px] font-bold", (chat.unreadCount?.[user.uid] || 0) > 0 ? "text-[#00a884]" : "text-[#667781] dark:text-[#8696a0]")}>
                                {chat.updatedAt?.toDate ? formatWhatsAppTime(chat.updatedAt.toDate()) : ''}
                              </span>
                              {(chat.unreadCount?.[user.uid] || 0) > 0 && (
                                <div className="bg-[#00a884] text-white text-[10px] h-4 min-w-[20px] rounded-full px-1 flex items-center justify-center font-bold">
                                  {chat.unreadCount![user.uid]}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={cn("text-[14px] truncate flex items-center gap-1", (chat.unreadCount?.[user.uid] || 0) > 0 ? "text-[#111b21] dark:text-[#e9edef] font-bold" : "text-[#667781] dark:text-[#8696a0]")}>
                            {isTyping ? (
                              <span className="text-[#00a884] font-bold animate-pulse text-[13px] tracking-tight flex items-center gap-1">
                                <CircleDashed className="w-3 h-3 animate-spin" /> Typing...
                              </span>
                            ) : (
                              <>
                                {chat.lastMessage?.senderId === user.uid && (
                                  <div className="shrink-0">
                                    {chat.lastMessage.status === 'sent' && <Check className="w-4 h-4 text-[#8696a0]" />}
                                    {chat.lastMessage.status === 'delivered' && <CheckCheck className="w-4 h-4 text-[#8696a0]" />}
                                    {chat.lastMessage.status === 'seen' && <CheckCheck className="w-4 h-4 text-[#53bdeb]" />}
                                  </div>
                                )}
                                <span className="truncate">{chat.lastMessage?.text || "Start a conversation"}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              }
            </div>
          )}
            {activeTab === 'status' && <StatusAndWallView 
              user={user} 
              statuses={statuses} 
              posts={posts} 
              jobs={jobs} 
              onUserClick={(u: User) => setViewingUser(u)} 
              awardPoints={awardPoints} 
              appSettings={appSettings} 
              showStatusModal={showStatusModal} 
              setShowStatusModal={setShowStatusModal} 
              showPostModal={showPostModal}
              setShowPostModal={setShowPostModal}
              setShowCreateAd={setShowCreateAd} 
              setAdContent={setAdContent} 
              setAdMediaUrl={setAdMediaUrl} 
              setUploading={setUploading} 
              setUploadProgress={setUploadProgress} 
              setUser={setUser} 
              uploading={uploading} 
              usersMap={usersMap} 
              onSelectJob={setSelectedJob} 
              onFollowEmployer={handleFollowEmployer} 
              targetPostId={targetPostId}
              isRefreshing={isRefreshing}
            />}
          {activeTab === 'dating' && <DatingView user={user} filters={datingFilters} onUpdateFilters={setDatingFilters} onUserClick={(u: User) => setViewingUser(u)} searchQuery={searchQuery} onOpenProfile={() => setShowProfile(true)} setUser={setUser} />}
          {activeTab === 'jobs' && (
            <JobsView 
              user={user} 
              jobs={jobs} 
              applications={applications} 
              onApply={handleApplyJob} 
              onCreateClick={() => setShowCreateJob(true)} 
              onSelectJob={setSelectedJob} 
              onUpdateStatus={handleUpdateApplicationStatus}
              onDeleteJob={handleDeleteJob}
              onEditJob={(j: Job) => { setEditingJob(j); setShowCreateJob(true); }}
              activeTab={activeTab} 
            />
          )}
        </div>
        
        {/* Floating Action Button */}
          <button 
            onClick={() => {
              if (activeTab === 'chats') {
                setShowSearch(true);
              } else if (activeTab === 'status') {
                setShowStatusModal(true);
              } else if (activeTab === 'jobs' && user.isVerified) {
                setShowCreateJob(true);
              } else if (activeTab === 'dating') {
                window.location.reload();
              }
            }}
            className="absolute bottom-20 right-6 w-14 h-14 bg-[#00a884] rounded-full shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform z-40"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}
      {applyingJob && (
        <JobQualificationModal 
          job={applyingJob} 
          onApply={finalizeJobApplication} 
          onCancel={() => setApplyingJob(null)} 
        />
      )}

      <AnimatePresence>
        {showExitConfirm && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[2000] bg-black/80 text-white px-6 py-3 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl border border-white/10"
          >
            <Smartphone className="w-4 h-4 text-[#00a884]" />
            Press back again to exit
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-Components ---

const ChatView = ({ user, chat, messages, onBack, onSendMessage, onUserClick }: any) => {
  const [input, setInput] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  const emojis = ['❤️', '😂', '😮', '😢', '🙏', '👍'];

  useEffect(() => {
    const otherId = chat.participants.find((p: string) => p !== user.uid);
    if (!otherId) return;
    
    const unsubUser = onSnapshot(doc(db, 'users', otherId), (snap) => {
      if (snap.exists()) setOtherUser({ uid: snap.id, ...snap.data() });
    });

    const unsubChat = onSnapshot(doc(db, 'chats', chat.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setOtherUserTyping(!!data.typing?.[otherId]);
      }
    });

    return () => {
      unsubUser();
      unsubChat();
      // Clear typing status on unmount
      updateDoc(doc(db, 'chats', chat.id), { [`typing.${user.uid}`]: false }).catch(() => {});
    };
  }, [chat, user.uid]);

  const handleTyping = (val: string) => {
    setInput(val);
    
    if (!isTyping) {
      setIsTyping(true);
      updateDoc(doc(db, 'chats', chat.id), { [`typing.${user.uid}`]: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateDoc(doc(db, 'chats', chat.id), { [`typing.${user.uid}`]: false });
    }, 3000);
  };

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  // Optimized Seen status logic
  useEffect(() => {
    if (!user || !chat || messages.length === 0) return;
    
    const unseenMessages = messages.filter(m => m.senderId !== user.uid && m.status !== 'seen');
    if (unseenMessages.length > 0) {
      const batch = writeBatch(db);
      unseenMessages.forEach((m) => {
        batch.update(doc(db, `chats/${chat.id}/messages`, m.id), { status: 'seen' });
      });
      
      // Update lastMessage status if it was one of these
      if (chat.lastMessage && chat.lastMessage.senderId !== user.uid && chat.lastMessage.status !== 'seen') {
        batch.update(doc(db, 'chats', chat.id), { 'lastMessage.status': 'seen' });
      }
      
      batch.commit().catch(e => console.error("Error updating seen status:", e));
    }
  }, [messages, chat?.id, user?.uid]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      file = await compressImage(file);
      const url = await uploadFileToServer(file);
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      onSendMessage(url, type);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const msg = messages.find((m: any) => m.id === messageId);
      const currentReaction = msg?.reactions?.[user.uid];
      
      await updateDoc(doc(db, `chats/${chat.id}/messages`, messageId), {
        [`reactions.${user.uid}`]: currentReaction === emoji ? deleteField() : emoji
      });
      setReactingTo(null);
    } catch (e) {
      console.error("Error adding reaction:", e);
    }
  };

  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
      setReactingTo(id);
    }, 500);
  };

  const endLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <div className="bg-[#008069] dark:bg-[#202c33] text-white p-3 flex items-center gap-2 shadow-md cursor-pointer transition-colors duration-300" onClick={() => otherUser && onUserClick(otherUser)}>
        <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <Avatar 
          src={otherUser?.photoURL} 
          name={otherUser?.displayName || chat.groupName || "Chat"} 
          size={40} 
          isOnline={otherUser?.isOnline} 
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold truncate flex items-center gap-1">
            {otherUser?.displayName || chat.groupName || "Chat"}
            {otherUser?.isOnline && <div className="w-2 h-2 bg-white rounded-full shrink-0 animate-pulse" />}
            <TierBadge tier={otherUser?.category} size={14} />
            {otherUser?.isVerified && <VerifiedBadge size={14} />}
          </h3>
          <p className="text-[10px] opacity-80 flex items-center gap-1">
            {otherUserTyping ? (
              <span className="text-white font-bold animate-pulse">typing...</span>
            ) : otherUser?.isOnline ? (
              <>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                online
              </>
            ) : (
              otherUser?.lastSeen?.toDate ? `last seen ${formatLastSeen(otherUser.lastSeen.toDate())}` : 'offline'
            )}
          </p>
        </div>
        <div className="flex gap-5 mr-2">
          <Video className="w-6 h-6" />
          <Phone className="w-6 h-6" />
          <MoreVertical className="w-6 h-6" />
        </div>
      </div>
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] dark:bg-[#0b141a] dark:bg-none bg-repeat custom-scrollbar"
        onClick={() => setReactingTo(null)}
      >
        {messages.map((msg: any) => (
          <div key={msg.id} className={cn("flex w-full mb-1", msg.senderId === user.uid ? "justify-end" : "justify-start")}>
            <div 
              onMouseDown={() => startLongPress(msg.id)}
              onMouseUp={endLongPress}
              onMouseLeave={endLongPress}
              onTouchStart={() => startLongPress(msg.id)}
              onTouchEnd={endLongPress}
              onContextMenu={(e) => e.preventDefault()}
              className={cn(
                "max-w-[85%] p-2 px-3 rounded-2xl shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] relative min-w-[80px] transition-all",
                msg.senderId === user.uid 
                  ? "bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-none" 
                  : "bg-white dark:bg-[#202c33] rounded-tl-none",
                reactingTo === msg.id && "scale-[1.02] ring-2 ring-[#00a884]/30"
              )}
            >
              {/* Bubble Beak */}
              <div 
                className={cn(
                  "absolute top-0 w-4 h-4",
                  msg.senderId === user.uid 
                    ? "-right-[7px] bg-[#d9fdd3] dark:bg-[#005c4b] [clip-path:polygon(0_0,0_100%,100%_0)]" 
                    : "-left-[7px] bg-white dark:bg-[#202c33] [clip-path:polygon(100%_0,100%_100%,0_0)]"
                )}
              />
              {reactingTo === msg.id && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: -45 }}
                  className="absolute left-0 right-0 mx-auto w-fit bg-white rounded-full shadow-xl p-1 flex gap-1 z-50 border border-gray-100"
                >
                  {emojis.map(emoji => (
                    <button 
                      key={emoji} 
                      onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                      className="hover:scale-125 transition-transform p-1 text-xl"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}

              {msg.type === 'image' ? (
                <img 
                  src={msg.text} 
                  className="rounded-lg max-w-full h-auto mb-5" 
                  alt="Sent" 
                  referrerPolicy="no-referrer" 
                  onError={handleImageError}
                />
              ) : msg.type === 'video' ? (
                <video src={msg.text} controls className="rounded-lg max-w-full h-auto mb-5" />
              ) : (
                <p className="text-[16px] font-medium text-[#111b21] dark:text-[#e9edef] pr-12 leading-relaxed break-words">{msg.text}</p>
              )}
              
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="absolute -bottom-2 right-2 flex -space-x-1 bg-white dark:bg-[#202c33] rounded-full shadow-sm border border-gray-100 dark:border-gray-800 px-1.5 py-0.5 z-10 animate-in zoom-in-50">
                  {Object.entries(msg.reactions).map(([uid, emoji]: any) => (
                    <span key={uid} className="text-[11px] drop-shadow-sm">{emoji}</span>
                  ))}
                </div>
              )}

              <div className="absolute bottom-1 right-1.5 flex items-center gap-1 select-none">
                <span className="text-[11px] text-[#667781] dark:text-[#8696a0] opacity-90">{msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</span>
                {msg.senderId === user.uid && (
                  <div className="flex items-center">
                    {msg.status === 'sent' && <Check className="w-3.5 h-3.5 text-[#8696a0]" strokeWidth={2.5} />}
                    {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 text-[#8696a0]" strokeWidth={2.5} />}
                    {msg.status === 'seen' && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" strokeWidth={2.5} />}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {uploading && <div className="flex justify-center"><CircleDashed className="w-6 h-6 animate-spin text-[#00a884]" /></div>}
      </div>
      <div className="bg-[#f0f2f5] dark:bg-[#111b21] p-2 pb-[65px] flex items-center gap-2">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*" />
        <div className="bg-white dark:bg-[#111b21] flex-1 flex items-center px-3 py-2 rounded-full shadow-sm max-w-[calc(100%-60px)]">
          <Smile className="w-6 h-6 text-gray-500 dark:text-[#8696a0] mr-2 shrink-0" />
          <input 
            type="text" 
            value={input} 
            onChange={(e) => handleTyping(e.target.value)} 
            placeholder="Message" 
            className="flex-1 bg-transparent border-none outline-none text-[16px] text-[#111b21] dark:text-[#e9edef] w-full" 
            onKeyDown={(e) => { 
              if (e.key === 'Enter' && input.trim()) { 
                onSendMessage(input); 
                setInput(''); 
                setIsTyping(false);
                updateDoc(doc(db, 'chats', chat.id), { [`typing.${user.uid}`]: false });
              } 
            }} 
          />
          <Paperclip className="w-6 h-6 text-gray-500 dark:text-[#8696a0] ml-2 cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()} />
          <Camera className="w-6 h-6 text-gray-500 dark:text-[#8696a0] ml-2 cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()} />
        </div>
        <button 
          onClick={() => { 
            if (input.trim()) { 
              onSendMessage(input); 
              setInput(''); 
              setIsTyping(false);
              updateDoc(doc(db, 'chats', chat.id), { [`typing.${user.uid}`]: false });
            } 
          }} 
          className="w-12 h-12 bg-[#00a884] rounded-full flex items-center justify-center text-white shadow-md shrink-0 active:scale-90 transition-transform"
        >
          {input.trim() ? <Send className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};

const SkeletonPost = () => (
  <div className="bg-white dark:bg-[#111b21] p-4 rounded-3xl shadow-sm border border-gray-50 dark:border-gray-800 space-y-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 skeleton rounded-full" />
      <div className="space-y-2">
        <div className="w-24 h-3 skeleton" />
        <div className="w-16 h-2 skeleton" />
      </div>
    </div>
    <div className="w-full h-4 skeleton" />
    <div className="w-3/4 h-4 skeleton" />
    <div className="w-full h-48 skeleton rounded-2xl" />
  </div>
);

const SkeletonChat = () => (
  <div className="flex items-center gap-4 p-4 border-b border-gray-50 dark:border-gray-800">
    <div className="w-14 h-14 skeleton rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="flex justify-between">
        <div className="w-24 h-3 skeleton" />
        <div className="w-12 h-2 skeleton" />
      </div>
      <div className="w-3/4 h-3 skeleton" />
    </div>
  </div>
);

const StatusAndWallView = ({ user, statuses, posts, jobs, onUserClick, awardPoints, appSettings, showStatusModal, setShowStatusModal, showPostModal, setShowPostModal, setShowCreateAd, setAdContent, setAdMediaUrl, setUploading, setUploadProgress, setUser, uploading, usersMap, onSelectJob, onFollowEmployer, targetPostId, isRefreshing }: any) => {
  const [newPost, setNewPost] = useState('');
  const [postMedia, setPostMedia] = useState<string | null>(null);
  const [postMediaType, setPostMediaType] = useState<'image' | 'video' | null>(null);
  const [viewingStatus, setViewingStatus] = useState<any>(null);
  const [statusText, setStatusText] = useState('');
  const [statusCaption, setStatusCaption] = useState('');
  const [statusDuration, setStatusDuration] = useState('24h');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postMediaInputRef = useRef<HTMLInputElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (targetPostId && wallRef.current) {
      const element = document.getElementById(`post-${targetPostId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-[#00a884]', 'ring-offset-4', 'dark:ring-offset-[#111b21]');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-[#00a884]', 'ring-offset-4', 'dark:ring-offset-[#111b21]');
        }, 3000);
      }
    }
  }, [targetPostId]);

  const handlePostMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      if (file.type.startsWith('image/')) {
        file = await compressImage(file);
      }
      const url = await uploadFileToServer(file, (p: number) => setUploadProgress(p));
      setPostMedia(url);
      setPostMediaType(file.type.startsWith('image/') ? 'image' : 'video' as any);
    } catch (error: any) {
      alert("Media upload failed: " + (error.message || "Unknown error"));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleUpdatePost = async () => {
    if (!editingPost || !editContent.trim()) return;
    try {
      await updateDoc(doc(db, 'posts', editingPost.id), {
        content: editContent,
        updatedAt: serverTimestamp()
      });
      setEditingPost(null);
      setEditContent('');
    } catch (error) {
      console.error("Error updating post:", error);
    }
  };

  const handleLike = async (post: Post) => {
    if (!user) return;
    const postRef = doc(db, 'posts', post.id);
    const isLiked = post.likes.includes(user.uid);
    const { arrayUnion, arrayRemove } = await import('firebase/firestore');
    
    await updateDoc(postRef, {
      likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });

    if (!isLiked) {
      awardPoints(appSettings.pointsPerLike);
      // Notify author
      if (post.userId !== user.uid) {
        await notifyUser({
          userId: post.userId,
          fromId: user.uid,
          fromName: user.displayName,
          type: 'like',
          text: 'liked your post'
        });
      }
    }
  };

  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  useEffect(() => {
    if (!showComments) return;
    const q = query(collection(db, `posts/${showComments}/comments`), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PostComment)));
    });
  }, [showComments]);

  const handleAddComment = async () => {
    if (!commentInput.trim() || !showComments) return;
    const postRef = doc(db, 'posts', showComments);
    const { increment } = await import('firebase/firestore');
    
    await addDoc(collection(db, `posts/${showComments}/comments`), {
      postId: showComments,
      userId: user.uid,
      userName: user.displayName,
      userPhoto: user.photoURL,
      text: commentInput,
      createdAt: serverTimestamp()
    });

    await updateDoc(postRef, { commentCount: increment(1) });
    setCommentInput('');
    awardPoints(appSettings.pointsPerComment);
  };

  const handlePost = async () => {
    if (!newPost.trim() && !postMedia) return;
    
    const hashtags = newPost.match(/#\w+/g) || [];
    const isReel = postMediaType === 'video';
    
    let censoredContent = newPost;
    if (appSettings.sensoredWords?.length) {
      censoredContent = censorText(newPost, appSettings.sensoredWords);
    }

    await addDoc(collection(db, 'posts'), { 
      userId: user.uid, 
      content: censoredContent, 
      media: postMedia ? [postMedia] : [],
      mediaType: postMediaType,
      likes: [], 
      hashtags,
      isReel,
      commentCount: 0,
      createdAt: serverTimestamp(), 
      isAd: false, 
      user: { 
        displayName: user.displayName, 
        photoURL: user.photoURL,
        isVerified: user.isVerified || false
      } 
    });
    setNewPost('');
    setPostMedia(null);
    setPostMediaType(null);
    awardPoints(appSettings.pointsPerPost);
  };

  const handlePostFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    const limits = {
      General: 3,
      Bronze: 5,
      Silver: 10,
      Gold: Infinity,
      Platinum: Infinity
    };
    const currentLimit = limits[user.category as keyof typeof limits] || limits.General;
    if ((user.uploadCount || 0) >= currentLimit) {
      alert(`You have reached your upload limit for ${user.category} tier. Please upgrade to upload more media!`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      file = await compressImage(file);
      const url = await uploadFileToServer(file, (p) => setUploadProgress(p));
      setPostMedia(url);
      setPostMediaType(file.type.startsWith('image/') ? 'image' : 'video');
      
      const userDocRef = doc(db, 'users', user.uid);
      const { increment } = await import('firebase/firestore');
      await updateDoc(userDocRef, { uploadCount: increment(1) });
      setUser(prev => prev ? { ...prev, uploadCount: (prev.uploadCount || 0) + 1 } : null);
    } catch (error: any) {
      alert("Upload failed: " + (error.message || "Unknown error"));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const clearPostModal = () => {
    setShowPostModal(false);
    setNewPost('');
    setPostMedia(null);
    setPostMediaType(null);
  };

  const handleCreatePost = async () => {
    await handlePost();
    clearPostModal();
  };

  const handleCreateStatus = async (mediaUrl?: string, type: string = 'text') => {
    setUploading(true);
    try {
      const durationMs = statusDuration === '24h' ? 24 * 60 * 60 * 1000 : statusDuration === '1w' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + durationMs);
      
      await addDoc(collection(db, 'statuses'), {
        userId: user.uid,
        type,
        content: mediaUrl || statusText,
        caption: type !== 'text' ? statusCaption : '',
        createdAt: serverTimestamp(),
        expiresAt,
        user: { displayName: user.displayName, photoURL: user.photoURL }
      });
      setShowStatusModal(false);
      setStatusText('');
      setStatusCaption('');
    } catch (error) {
      console.error("Status error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleStatusFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      file = await compressImage(file);
      const url = await uploadFileToServer(file, (p) => setUploadProgress(p));
      const type = file.type.startsWith('image/') ? 'image' : 'video';
      await handleCreateStatus(url, type);
      alert("Status uploaded successfully!");
    } catch (error: any) {
      alert("Status upload failed: " + (error.message || "Unknown error"));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleViewStatus = async (status: any) => {
    setViewingStatus(status);
    if (status.userId !== user.uid) {
      const { increment } = await import('firebase/firestore');
      await updateDoc(doc(db, 'statuses', status.id), { views: increment(1) });
    }
  };

  return (
    <div className="bg-[#f0f2f5] dark:bg-[#0b141a] min-h-full">
      {/* Status Section */}
      <div className="bg-white dark:bg-[#111b21] p-4 mb-2 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-bold text-gray-500 dark:text-[#8696a0] uppercase tracking-wider">Status & Updates</h4>
          <button onClick={() => setShowStatusModal(true)} className="text-[#00a884] text-xs font-bold flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Status
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
          <div className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer" onClick={() => setShowStatusModal(true)}>
            <Avatar src={user.photoURL} name={user.displayName} size={64} className="border-2 border-gray-200 dark:border-gray-800">
              <div className="absolute bottom-0 right-0 bg-[#00a884] rounded-full p-1 border-2 border-white dark:border-[#111b21] shadow-sm">
                <Plus className="w-3 h-3 text-white" />
              </div>
            </Avatar>
            <span className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase tracking-tighter mt-1">My Status</span>
          </div>
          {statuses.filter((s: any) => s.expiresAt?.toDate ? s.expiresAt.toDate() > new Date() : true).length === 0 ? (
            <div className="flex flex-col items-center justify-center min-w-[100px] opacity-40">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
                <CircleDashed className="w-6 h-6" />
              </div>
              <span className="text-[10px] mt-1">No Updates</span>
            </div>
          ) : (
            statuses.filter((s: any) => s.expiresAt?.toDate ? s.expiresAt.toDate() > new Date() : true).map((s: any) => {
              const statusUser = usersMap[s.userId];
              return (
                <div key={s.id} className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer" onClick={() => handleViewStatus(s)}>
                  <div className="p-0.5 rounded-full border-2 border-[#00a884] ring-2 ring-white dark:ring-[#111b21]">
                    <Avatar src={statusUser?.photoURL} name={statusUser?.displayName} size={56} />
                  </div>
                  <span className="text-[10px] text-gray-600 dark:text-[#8696a0] truncate w-16 text-center flex items-center justify-center gap-0.5 font-bold">
                    {statusUser?.uid === user.uid ? 'Me' : (statusUser?.displayName?.split(' ')[0] || "User")}
                    <TierBadge tier={statusUser?.category} size={10} />
                    {statusUser?.isVerified && <VerifiedBadge size={10} />}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Status Viewer Modal */}
      <AnimatePresence>
        {viewingStatus && (() => {
          const activeStatuses = statuses.filter((s: any) => s.expiresAt?.toDate ? s.expiresAt.toDate() > new Date() : true);
          const currentIndex = activeStatuses.findIndex((s: any) => s.id === viewingStatus.id);
          const statusUser = usersMap[viewingStatus.userId];

          const navigateStatus = (dir: 'next' | 'prev') => {
            let nextIndex = dir === 'next' ? currentIndex + 1 : currentIndex - 1;
            if (nextIndex >= 0 && nextIndex < activeStatuses.length) {
              handleViewStatus(activeStatuses[nextIndex]);
            } else {
              setViewingStatus(null);
            }
          };

          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black flex flex-col"
            >
              <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex gap-1 mb-4">
                  {activeStatuses.map((_: any, i: number) => (
                    <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: i === currentIndex ? "100%" : i < currentIndex ? "100%" : "0%" }}
                        transition={{ duration: i === currentIndex ? 5 : 0, ease: "linear" }}
                        onAnimationComplete={() => {
                          if (i === currentIndex) navigateStatus('next');
                        }}
                        className="h-full bg-white"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setViewingStatus(null)} className="p-1"><ChevronLeft className="w-6 h-6 text-white" /></button>
                  <img 
                    src={statusUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${viewingStatus.userId}`} 
                    className="w-10 h-10 rounded-full border border-white/20" 
                    alt="User" 
                    referrerPolicy="no-referrer" 
                    onError={handleImageError}
                  />
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-sm flex items-center gap-1">
                      {statusUser?.displayName || "User"}
                      {statusUser?.isVerified && <VerifiedBadge size={14} />}
                    </h4>
                    <p className="text-white/60 text-[10px]">{viewingStatus.createdAt?.toDate ? formatWhatsAppTime(viewingStatus.createdAt.toDate()) : ''}</p>
                  </div>
                </div>
              </div>

              <motion.div 
                key={viewingStatus.id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50) navigateStatus('next');
                  if (info.offset.x > 50) navigateStatus('prev');
                }}
                className="flex-1 flex flex-col items-center justify-center p-4 relative"
              >
                {viewingStatus.type === 'text' ? (
                  <div className="text-white text-2xl font-bold text-center px-6">{viewingStatus.content}</div>
                ) : viewingStatus.type === 'image' ? (
                  <img src={viewingStatus.content} className="max-w-full max-h-full object-contain rounded-xl" alt="Status" referrerPolicy="no-referrer" />
                ) : (
                  <video src={viewingStatus.content} className="max-w-full max-h-full object-contain rounded-xl" autoPlay controls />
                )}

                {viewingStatus.caption && (
                  <div className="absolute bottom-20 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white text-center text-sm font-medium">
                    {viewingStatus.caption}
                  </div>
                )}
              </motion.div>

              <div className="p-6 bg-black flex justify-center items-center text-white/80 text-xs">
                <div className="flex items-center gap-1">
                  <Search className="w-4 h-4" /> {viewingStatus.views || 0} views
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Status Creation Modal */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#202c33] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-[#111b21] dark:text-[#e9edef]">Create Status</h3>
                  <button onClick={() => setShowStatusModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><X className="w-6 h-6 text-gray-400" /></button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Status Text / Caption</label>
                    <textarea 
                      value={statusText || statusCaption}
                      onChange={(e) => {
                        setStatusText(e.target.value);
                        setStatusCaption(e.target.value);
                      }}
                      placeholder="What's on your mind?"
                      className="w-full bg-gray-50 dark:bg-[#2a3942] border-none outline-none p-4 rounded-2xl text-[16px] dark:text-[#e9edef] resize-none h-32 focus:ring-2 focus:ring-[#00a884]/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Duration</label>
                    <div className="flex gap-2">
                      {['24h', '1w', '1m'].map(d => (
                        <button 
                          key={d}
                          onClick={() => setStatusDuration(d)}
                          className={cn(
                            "flex-1 py-1 rounded-full text-[10px] font-bold transition-all border",
                            statusDuration === d ? "bg-[#00a884] border-[#00a884] text-white shadow-md" : "bg-white dark:bg-[#2a3942] border-gray-100 dark:border-gray-700 text-gray-500 dark:text-[#8696a0] hover:border-gray-200 dark:hover:border-gray-600"
                          )}
                        >
                          {d === '24h' ? '24 Hours' : d === '1w' ? '1 Week' : '1 Month'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <input type="file" ref={fileInputRef} onChange={handleStatusFileUpload} className="hidden" accept="image/*,video/*" />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 bg-gray-100 dark:bg-[#2a3942] text-gray-700 dark:text-[#e9edef] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ImageIcon className="w-5 h-5" /> Photo/Video
                    </button>
                    <button 
                      onClick={() => handleCreateStatus()}
                      disabled={!statusText.trim() || uploading}
                      className="flex-[2] bg-[#00a884] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#00a884]/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {uploading ? <CircleDashed className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      Post Status
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Wall Section */}
      <div ref={wallRef} className="p-4 space-y-6 pb-24 h-full overflow-y-auto custom-scrollbar">
        {isRefreshing ? (
          <div className="space-y-6">
            <SkeletonPost />
            <SkeletonPost />
            <SkeletonPost />
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-[#111b21] p-5 rounded-3xl shadow-md border border-gray-100 dark:border-gray-800 transition-all hover:shadow-lg">
            <div className="flex items-center gap-3 mb-4">
            <Avatar src={user.photoURL} name={user.displayName} size={40} />
                <div className="flex-1 bg-gray-50 dark:bg-[#2a3942] rounded-full px-4 py-2 text-gray-400 dark:text-gray-500 text-sm font-medium cursor-pointer border border-gray-100 dark:border-gray-800" onClick={() => setShowPostModal(true)}>
                  What's on your mind?
                </div>
          </div>
          <div className="flex justify-around border-t border-gray-50 dark:border-gray-800 pt-3">
            <button onClick={() => setShowPostModal(true)} className="flex items-center gap-2 text-gray-500 dark:text-[#8696a0] text-xs font-bold hover:text-[#00a884] transition-colors">
              <ImageIcon className="w-4 h-4 text-green-500" /> Photo
            </button>
            <button onClick={() => setShowPostModal(true)} className="flex items-center gap-2 text-gray-500 dark:text-[#8696a0] text-xs font-bold hover:text-[#00a884] transition-colors">
              <VideoIcon className="w-4 h-4 text-red-500" /> Video
            </button>
            <button onClick={() => setShowCreateAd(true)} className="flex items-center gap-2 text-gray-500 dark:text-[#8696a0] text-xs font-bold hover:text-[#00a884] transition-colors">
              <Megaphone className="w-4 h-4 text-blue-500" /> Boost
            </button>
          </div>
        </div>

        {/* Post Creation Modal */}
        <AnimatePresence>
          {showPostModal && (
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-[#202c33] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <h3 className="text-xl font-bold text-[#111b21] dark:text-[#e9edef]">Create Post</h3>
                    <button onClick={clearPostModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><X className="w-6 h-6 text-gray-400" /></button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar src={user.photoURL} name={user.displayName} size={40} />
                      <div>
                        <div className="font-bold text-sm dark:text-white">{user.displayName}</div>
                        <div className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full w-fit">Public</div>
                      </div>
                    </div>

                    <textarea 
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder="Share what's happening..."
                      className="w-full bg-transparent border-none outline-none text-lg font-medium dark:text-[#e9edef] resize-none h-40 focus:ring-0"
                    />

                    {postMedia && (
                      <div className="relative mt-2 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                        {postMediaType === 'image' ? (
                          <img src={postMedia} className="w-full h-48 object-cover" alt="Selected" />
                        ) : (
                          <video src={postMedia} className="w-full h-48 object-cover" />
                        )}
                        <button onClick={() => { setPostMedia(null); setPostMediaType(null); }} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Add to your post</span>
                      <div className="flex gap-2">
                        <input type="file" ref={postMediaInputRef} onChange={handlePostMediaUpload} className="hidden" accept="image/*,video/*" />
                        <button onClick={() => postMediaInputRef.current?.click()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-green-500">
                          <ImageIcon className="w-6 h-6" />
                        </button>
                        <button onClick={() => postMediaInputRef.current?.click()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-red-500">
                          <VideoIcon className="w-6 h-6" />
                        </button>
                        <button onClick={() => setShowCreateAd(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-blue-500">
                          <Megaphone className="w-6 h-6" />
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={handleCreatePost}
                      disabled={(!newPost.trim() && !postMedia) || uploading}
                      className="w-full bg-[#00a884] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-[#00a884]/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {uploading ? <CircleDashed className="w-5 h-5 animate-spin" /> : "Post"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {(() => {
          const elements: React.ReactNode[] = [];
          const feedPosts = posts.filter(p => !p.isAd);
          const userAds = posts.filter(p => p.isAd);
          const jobItems = [...(jobs || [])].sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || 0;
            const timeB = b.createdAt?.toMillis?.() || 0;
            return timeB - timeA;
          });
          let jobIdx = 0;
          let adIndex = 0;

          feedPosts.forEach((post, index) => {
            const postAuthor = usersMap[post.userId];
            elements.push(
              <div 
                key={post.id} 
                id={`post-${post.id}`}
                className="bg-white dark:bg-[#111b21] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-500"
              >
                <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => onUserClick({ uid: post.userId, displayName: postAuthor?.displayName, photoURL: postAuthor?.photoURL })}>
                  <Avatar src={postAuthor?.photoURL} name={postAuthor?.displayName || "User"} size={40} isOnline={postAuthor?.isOnline} />
                  <div>
                    <h4 className="font-bold text-[#111b21] dark:text-[#e9edef] text-[15px] flex items-center gap-1">
                      {postAuthor?.displayName || "User"}
                      <TierBadge tier={postAuthor?.category} size={14} />
                      {postAuthor?.isVerified && <VerifiedBadge />}
                    </h4>
                    <p className="text-[11px] text-[#667781] dark:text-[#8696a0]">{post.createdAt?.toDate ? formatWhatsAppTime(post.createdAt.toDate()) : ''}</p>
                  </div>
                  {post.userId === user.uid && (
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => { setEditingPost(post); setEditContent(post.content); }} className="p-1.5 text-gray-400 hover:text-[#00a884] transition-colors">
                        <SettingsIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeletePost(post.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="px-4 pb-4 text-[16px] font-medium text-[#111b21] dark:text-[#e9edef] leading-relaxed">
                  <div className="whitespace-pre-wrap">
                    {post.content.split(/(\s+)/).map((word: string, i: number) => {
                      if (word.startsWith('#')) {
                        return <span key={i} className="text-[#00a884] font-bold cursor-pointer hover:underline">{word}</span>;
                      }
                      return word;
                    })}
                  </div>
                  {post.media?.[0] && (
                    <div className={cn("mt-3 overflow-hidden rounded-xl bg-black", post.isReel && "aspect-[9/16] max-h-[500px] flex items-center justify-center")}>
                      {post.mediaType === 'video' ? (
                        <video src={post.media[0]} controls className={cn("w-full h-full", post.isReel ? "object-contain" : "object-cover")} autoPlay={post.isReel} muted={post.isReel} loop={post.isReel} />
                      ) : (
                        <img src={post.media[0]} className="w-full h-full object-cover" alt="Post media" referrerPolicy="no-referrer" />
                      )}
                    </div>
                  )}
                </div>
                <div className="p-2 border-t border-gray-50 dark:border-gray-800 flex justify-around text-[#667781] dark:text-[#8696a0] text-xs font-bold uppercase tracking-wider">
                  <button 
                    onClick={() => handleLike(post)}
                    className={cn("flex flex-col items-center gap-1 py-2 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors", post.likes.includes(user.uid) && "text-[#00a884]")}
                  >
                    <ThumbsUp className={cn("w-5 h-5", post.likes.includes(user.uid) && "fill-current")} />
                    <span>{post.likes.length || ''} Like</span>
                  </button>
                  <button 
                    onClick={() => setShowComments(post.id)}
                    className="flex flex-col items-center gap-1 py-2 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>{post.commentCount || ''} Comment</span>
                  </button>
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: 'Heart Connect Post', text: post.content, url: window.location.href });
                      } else {
                        alert("Sharing not supported on this browser.");
                      }
                    }}
                    className="flex flex-col items-center gap-1 py-2 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>Share</span>
                  </button>
                  {post.userId === user.uid && (
                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e: any) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(true);
                          try {
                            const compressedFile = await compressImage(file);
                            const url = await uploadFileToServer(compressedFile);
                            setAdContent(post.content);
                            setAdMediaUrl(url);
                            setShowCreateAd(true);
                          } catch (err) {
                            console.error(err);
                            alert("Failed to pick photo for boost");
                          } finally {
                            setUploading(false);
                          }
                        };
                        input.click();
                      }}
                      className="flex flex-col items-center gap-1 py-2 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-blue-500"
                    >
                      <Megaphone className="w-5 h-5" />
                      <span>Boost</span>
                    </button>
                  )}
                </div>
              </div>
            );

            // Featured Jobs Interleaving: After every 4 posts
            if ((index + 1) % 4 === 0 && jobIdx < jobItems.length) {
              const job = jobItems[jobIdx];
              const isFollowing = user?.followingEmployers?.includes(job.employerId);
              elements.push(
                <motion.div 
                  key={`job-feed-${job.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-[#111b21] p-5 rounded-3xl shadow-sm border border-orange-100 dark:border-orange-900/20 relative overflow-hidden group mb-4"
                >
                  <div className="absolute top-0 right-0 p-3">
                    <div className="bg-orange-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-bl-xl tracking-tighter shadow-sm">Featured Job</div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-[#202c33] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border border-orange-100 dark:border-gray-700">
                      <Briefcase className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div onClick={() => onSelectJob?.(job)} className="cursor-pointer">
                          <h3 className="font-bold text-lg dark:text-[#e9edef] truncate leading-tight hover:underline">{job.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-[#8696a0] font-medium flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-[#00a884]" />
                            <span className="truncate">{job.company}</span>
                          </p>
                        </div>
                        {job.employerId !== user?.uid && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onFollowEmployer(job.employerId);
                            }}
                            className={cn(
                              "text-[10px] font-black uppercase px-3 py-1 rounded-full transition-all flex items-center gap-1",
                              isFollowing 
                                ? "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                : "bg-[#00a884] text-white shadow-sm hover:scale-105"
                            )}
                          >
                            {isFollowing ? "Following" : <UserPlus className="w-3 h-3" />}
                            {!isFollowing && "Follow"}
                          </button>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                         <span className="text-[9px] bg-white/80 dark:bg-gray-800/80 px-2 py-0.5 rounded-full font-bold text-gray-400 uppercase tracking-widest border border-gray-100 dark:border-gray-700">{job.type}</span>
                         <span className="text-[9px] bg-green-50/50 dark:bg-green-900/20 px-2 py-0.5 rounded-full font-bold text-[#00a884] uppercase tracking-widest border border-green-100/50 dark:border-green-900/30">{job.location}</span>
                         <button onClick={() => onSelectJob?.(job)} className="text-[9px] text-[#00a884] font-black uppercase tracking-tighter ml-auto hover:underline">Apply Now →</button>
                      </div>
                      {job.summary && (
                        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 italic line-clamp-2">
                          "{job.summary}"
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
              jobIdx++;
            }

            // Ad Logic: after 3, 10, then multiples of 2 and 3 after 10
            const pos = index + 1;
            let shouldShowAd = false;
            if (pos === 3 || pos === 10) shouldShowAd = true;
            if (pos > 10 && ((pos - 10) % 2 === 0 || (pos - 10) % 3 === 0)) shouldShowAd = true;

            if (shouldShowAd) {
              const currentAd = userAds[adIndex % userAds.length];
              if (currentAd) {
                const adAuthor = usersMap[currentAd.userId];
                elements.push(
                  <div key={`ad-${pos}`} className="bg-white dark:bg-[#111b21] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden border-l-4 border-l-yellow-400">
                    <div className="p-3 flex items-center gap-3">
                      <Avatar src={adAuthor?.photoURL} name={adAuthor?.displayName || "Sponsored"} size={32} />
                      <div className="flex-1">
                        <h4 className="font-bold text-xs dark:text-[#e9edef]">{adAuthor?.displayName || "Sponsored"}</h4>
                        <p className="text-[9px] text-yellow-600 font-bold uppercase tracking-tighter">Sponsored Ad</p>
                      </div>
                      {currentAd.adLink && (
                        <a href={currentAd.adLink} target="_blank" rel="noopener noreferrer" className="bg-[#00a884] text-white px-3 py-1 rounded-full text-[10px] font-bold">Visit</a>
                      )}
                    </div>
                    <div className="px-3 pb-3">
                      <p className="text-xs text-gray-600 dark:text-[#8696a0] line-clamp-2 mb-2">{currentAd.content}</p>
                      {currentAd.media?.[0] && <img src={currentAd.media[0]} className="w-full h-24 object-cover rounded-lg" alt="Ad" referrerPolicy="no-referrer" />}
                    </div>
                  </div>
                );
                adIndex++;
              } else if (appSettings?.adSenseCode) {
                elements.push(
                  <div key={`adsense-${pos}`} className="bg-gray-50 dark:bg-[#111b21] rounded-xl p-2 flex items-center justify-center min-h-[100px] border border-dashed border-gray-200 dark:border-gray-800">
                    <div dangerouslySetInnerHTML={{ __html: appSettings.adSenseCode }} />
                  </div>
                );
              }
            }
          });
          return elements;
        })()}
          </>
      )}
    </div>

      {showComments && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} className="bg-white dark:bg-[#111b21] w-full max-w-lg rounded-t-3xl sm:rounded-3xl h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-lg dark:text-[#e9edef]">Comments</h3>
              <button onClick={() => setShowComments(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X className="w-5 h-5 dark:text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <Avatar src={c.userPhoto} name={c.userName} size={32} />
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl">
                    <h4 className="font-bold text-xs mb-1 dark:text-[#e9edef]">{c.userName}</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white dark:bg-[#111b21] border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <input 
                type="text" 
                value={commentInput} 
                onChange={(e) => setCommentInput(e.target.value)} 
                placeholder="Write a comment..." 
                className="flex-1 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-full outline-none focus:ring-2 focus:ring-[#00a884]/20 dark:text-[#e9edef]"
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button onClick={handleAddComment} className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center text-white"><Send className="w-5 h-5" /></button>
            </div>
          </motion.div>
        </div>
      )}

      {editingPost && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-[#111b21] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-lg dark:text-[#e9edef]">Edit Post</h3>
              <button onClick={() => setEditingPost(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X className="w-5 h-5 dark:text-gray-400" /></button>
            </div>
            <div className="p-4">
              <textarea 
                value={editContent} 
                onChange={(e) => setEditContent(e.target.value)} 
                className="w-full bg-gray-50 dark:bg-gray-800 border-none outline-none p-4 rounded-2xl text-[16px] leading-relaxed resize-none h-40 mb-4 dark:text-[#e9edef]"
                placeholder="What's on your mind?"
              />
              <button 
                onClick={handleUpdatePost}
                className="w-full bg-[#00a884] text-white py-4 rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
const DatingView = ({ user, filters, onUpdateFilters, onUserClick, searchQuery, onOpenProfile, setUser }: any) => {
  const [discoverUsers, setDiscoverUsers] = useState<User[]>([]);
  const [featuredSingles, setFeaturedSingles] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [viewMode, setViewMode] = useState<'swipe' | 'grid'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const datingCategories = ['All', 'Soulmates', 'Friendship', 'Business', 'Casual'];

  const hasGender = user.datingProfile?.gender && user.datingProfile.gender !== '';
  const limits = { General: 1, Bronze: 3, Silver: 10, Gold: Infinity, Platinum: Infinity };
  const currentLimit = limits[user.category as keyof typeof limits] || limits.General;
  const matchCount = user.matchCount || 0;

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'user')
        );
        const snapshot = await getDocs(q);
        const allUsersRaw = snapshot.docs
          .map(doc => ({ uid: doc.id, ...doc.data() } as User));
        
        // Sorting users by createdAt if available, otherwise by uid
        const allUsers = allUsersRaw.sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || 0;
          const tB = b.createdAt?.toMillis?.() || 0;
          return tB - tA;
        })
        .filter(u => u.uid !== user.uid && u.datingProfile && u.photoURL);
        
        setFeaturedSingles(allUsers.filter(u => u.isFeaturedSingle));
        
          const filtered = allUsers.filter(u => {
            const profile = u.datingProfile!;
            const ageMatch = profile.age >= filters.minAge && profile.age <= filters.maxAge;
            const genderMatch = filters.gender === 'all' || profile.gender === filters.gender;
            const categoryMatch = selectedCategory === 'All' || profile.datingCategory === selectedCategory;
            const searchMatch = !searchQuery || u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || profile.bio?.toLowerCase().includes(searchQuery.toLowerCase());
            
            let distanceMatch = true;
            if (user.datingProfile?.location && profile.location) {
              const dist = calculateDistance(
                user.datingProfile.location.lat,
                user.datingProfile.location.lng,
                profile.location.lat,
                profile.location.lng
              );
              distanceMatch = dist <= filters.maxDistance;
            }

            return ageMatch && genderMatch && distanceMatch && searchMatch && categoryMatch;
          });

        // Randomize order for fresh feel
        setDiscoverUsers(filtered.sort(() => Math.random() - 0.5));
      } catch (error) {
        console.error("Error fetching dating users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user.uid, filters, searchQuery, selectedCategory]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleNext = () => {
    setSwipeDirection(null);
    if (currentIndex < discoverUsers.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleLike = async () => {
    if (!user || discoverUsers.length === 0) return;
    const currentDiscoverUser = discoverUsers[currentIndex];
    
    if (matchCount >= currentLimit) {
      alert(`Daily swipe limit reached (${matchCount}/${currentLimit}). Upgrade to unlock more hearts!`);
      return;
    }

    setSwipeDirection('right');
    setTimeout(async () => {
      try {
        const { increment } = await import('firebase/firestore');
        await updateDoc(doc(db, 'users', user.uid), { matchCount: increment(1) });
        setUser((prev: any) => prev ? { ...prev, matchCount: (prev.matchCount || 0) + 1 } : null);
        
        await notifyUser({
          userId: currentDiscoverUser.uid,
          fromId: user.uid,
          fromName: user.displayName,
          type: 'like',
          text: 'liked you in dating!'
        });
      } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'users'); }
      handleNext();
    }, 300);
  };

  const handlePass = () => {
    setSwipeDirection('left');
    setTimeout(() => handleNext(), 300);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center font-bold text-gray-400 dark:text-gray-600 animate-pulse">Finding your match...</div>;

  const currentUser = discoverUsers[currentIndex];

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a] relative overflow-y-auto custom-scrollbar h-full">
      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none fixed">
        <div className="absolute top-10 left-10 w-64 h-64 bg-[#00a884] rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-pink-500 rounded-full blur-[100px]" />
      </div>

      <div className="p-4 space-y-6 z-10 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#00a884] to-[#008069] rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#111b21] dark:text-[#e9edef] tracking-tighter leading-none mb-1">Discover</h2>
              <div className="flex items-center gap-1.5 bg-white dark:bg-black/20 px-2.5 py-0.5 rounded-full border border-black/5 dark:border-white/5">
                <span className="text-[9px] font-black text-[#00a884] uppercase tracking-wider">
                  Swipes: {matchCount} / {currentLimit === Infinity ? 'Unlimited' : currentLimit}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setViewMode(viewMode === 'swipe' ? 'grid' : 'swipe')}
              className="p-3 bg-white dark:bg-[#2a3942] rounded-2xl shadow-sm text-[#00a884] hover:scale-105 active:scale-95 transition-all border border-black/5 dark:border-white/10"
              title={viewMode === 'swipe' ? "Switch to Grid View" : "Switch to Swipe View"}
            >
              {viewMode === 'swipe' ? <LayoutGrid className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
            </button>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="p-3 bg-white dark:bg-[#2a3942] rounded-2xl shadow-sm text-[#00a884] hover:scale-105 active:scale-95 transition-all border border-black/5 dark:border-white/10"
            >
              <Filter className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Gender Separation Toggle */}
        <div className="flex gap-2 mb-2 p-1 bg-gray-100 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5">
          {(['all', 'male', 'female'] as const).map(g => (
            <button
              key={g}
              onClick={() => onUpdateFilters({ ...filters, gender: g })}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filters.gender === g 
                  ? "bg-white dark:bg-[#2a3942] text-[#00a884] shadow-sm" 
                  : "text-gray-400 dark:text-[#8696a0] hover:text-[#00a884]"
              )}
            >
              {g === 'all' ? 'All' : g === 'male' ? 'Men' : 'Women'}
            </button>
          ))}
        </div>

        {/* Category Horizontal Selector */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {datingCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2",
                selectedCategory === cat 
                  ? "bg-[#00a884] border-[#00a884] text-white shadow-lg shadow-[#00a884]/20 scale-105" 
                  : "bg-white dark:bg-[#2a3942] border-transparent text-gray-400 dark:text-[#8696a0] hover:border-gray-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 pt-0">
        {featuredSingles.length > 0 && !showFilters && selectedCategory === 'All' && (
          <div className="mb-8 z-10 shrink-0">
            <div className="flex items-center justify-between px-1 mb-4">
              <h3 className="text-[11px] font-black text-gray-400 dark:text-[#8696a0] uppercase tracking-[0.2em] flex items-center gap-2">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> Featured Hearts
              </h3>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-1 snap-x">
              {featuredSingles.map(single => (
                <motion.div 
                  key={single.uid} 
                  onClick={() => onUserClick(single)} 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0 w-24 space-y-2 cursor-pointer group snap-center"
                >
                  <div className="relative w-24 h-32 rounded-3xl overflow-hidden border-2 border-white dark:border-white/10 shadow-lg group-hover:border-[#00a884] transition-all">
                    <img src={single.photoURL} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={single.displayName} referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                    <div className="absolute bottom-2 left-2 right-2 text-[10px] font-black text-white truncate">
                      {single.displayName.split(' ')[0]}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 relative pb-24">
          {discoverUsers.length > 0 ? (
            viewMode === 'swipe' ? (
              <div className="relative h-[550px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentUser.uid}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(e, info) => {
                      if (info.offset.x > 100) { setSwipeDirection('right'); handleLike(); }
                      else if (info.offset.x < -100) { setSwipeDirection('left'); handlePass(); }
                    }}
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1, 
                      y: 0,
                      x: swipeDirection === 'right' ? 500 : swipeDirection === 'left' ? -500 : 0,
                      rotate: swipeDirection === 'right' ? 20 : swipeDirection === 'left' ? -20 : 0
                    }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="absolute inset-0 max-w-sm mx-auto z-20 group h-full"
                  >
                    <div className="relative h-full w-full rounded-[3.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-[#111b21]">
                      <img src={currentUser.photoURL} className="w-full h-full object-cover" alt={currentUser.displayName} referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent pointer-events-none" />
                      
                      <div className="absolute bottom-0 left-0 right-0 p-8 text-white pointer-events-none">
                        <div className="flex items-center justify-between items-end mb-2">
                           <div>
                             <h3 className="text-3xl font-black tracking-tight">{currentUser.displayName.split(' ')[0]}, {currentUser.datingProfile?.age}</h3>
                             <p className="text-[#00a884] text-[10px] uppercase font-black tracking-[0.2em] mt-1">{currentUser.datingProfile?.datingCategory || 'Soulmates'}</p>
                           </div>
                           {currentUser.isVerified && <VerifiedBadge size={20} />}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                            <MapPin className="w-3 h-3 text-[#00a884]" />
                            <span className="text-[10px] font-bold text-white/90">{currentUser.datingProfile?.city || 'Nearby'}</span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-300 italic line-clamp-2 leading-relaxed mb-6 font-medium">"{currentUser.datingProfile?.bio || "Let's connect!"}"</p>
                        
                        <div className="flex gap-2 flex-wrap">
                          {currentUser.datingProfile?.interests?.slice(0, 3).map((interest: string) => (
                            <span key={interest} className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 bg-[#00a884]/30 border border-[#00a884]/40 rounded-lg">
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
                
                {/* Floating Swiping Buttons */}
                <div className="absolute bottom-[-40px] left-0 right-0 flex justify-center items-center gap-6 z-30">
                  <motion.button onClick={handlePass} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-16 h-16 bg-white dark:bg-[#202c33] rounded-full flex items-center justify-center text-red-500 shadow-xl border border-black/5 dark:border-white/5"><X className="w-8 h-8" /></motion.button>
                  <motion.button onClick={() => onUserClick(currentUser)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-12 h-12 bg-white dark:bg-[#202c33] rounded-full flex items-center justify-center text-blue-500 shadow-xl border border-black/5 dark:border-white/5"><UserIcon className="w-6 h-6" /></motion.button>
                  <motion.button onClick={handleLike} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-20 h-20 bg-gradient-to-br from-[#00a884] to-[#008069] rounded-full flex items-center justify-center text-white shadow-2xl shadow-[#00a884]/30"><Heart className="w-10 h-10 fill-white" /></motion.button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {discoverUsers.map(u => (
                  <motion.div
                    key={u.uid}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => onUserClick(u)}
                    className="relative aspect-[3/4] rounded-[2rem] overflow-hidden shadow-md group cursor-pointer border-2 border-transparent hover:border-[#00a884] transition-all"
                  >
                    <img src={u.photoURL} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={u.displayName} referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-black text-white">{u.displayName.split(' ')[0]}, {u.datingProfile?.age}</span>
                        {u.isVerified && <VerifiedBadge size={12} />}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/70 font-medium truncate flex items-center gap-1">
                          <MapPin size={10} /> {u.datingProfile?.city || 'Nearby'}
                        </span>
                        <div className="p-1.5 bg-[#00a884] rounded-lg text-white shadow-lg">
                          <Heart size={10} className="fill-white" />
                        </div>
                      </div>
                    </div>
                    {u.datingProfile?.datingCategory && (
                       <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/30 backdrop-blur-md rounded-lg text-[9px] font-black text-white border border-white/10 uppercase tracking-tighter">
                         {u.datingProfile.datingCategory}
                       </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center p-8 bg-white dark:bg-[#111b21] rounded-[3rem] shadow-xl border border-black/5 dark:border-white/5 max-w-sm mx-auto">
              <div className="bg-[#f0f2f5] dark:bg-[#202c33] w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <RefreshCw className="w-10 h-10 text-[#00a884] animate-spin-slow" />
              </div>
              <h3 className="text-xl font-black dark:text-white mb-2 tracking-tighter">No hearts in this category</h3>
              <p className="text-sm text-gray-500 dark:text-[#8696a0] mb-8 font-medium">Try another category or expand your search distance.</p>
              <button 
                onClick={() => {
                  onUpdateFilters({ ...filters, maxDistance: 100 });
                  setSelectedCategory('All');
                }}
                className="w-full bg-[#00a884] text-white font-black py-4 rounded-2xl shadow-lg shadow-[#00a884]/20 active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Reset & Expand Radius
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-x-0 bottom-0 bg-white dark:bg-[#111b21] p-8 rounded-t-[40px] shadow-2xl z-50 border-t border-gray-100 dark:border-white/5"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black dark:text-[#e9edef]">Preferences</h3>
              <button onClick={() => setShowFilters(false)} className="p-2 bg-gray-50 dark:bg-[#202c33] rounded-full"><X className="w-5 h-5 dark:text-gray-400" /></button>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <span>Age Range</span>
                  <span className="text-[#00a884]">{filters.minAge} - {filters.maxAge}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={filters.minAge} onChange={(e) => onUpdateFilters({...filters, minAge: Number(e.target.value)})} className="bg-gray-50 dark:bg-[#202c33] p-4 rounded-2xl outline-none dark:text-white font-bold" placeholder="Min" />
                  <input type="number" value={filters.maxAge} onChange={(e) => onUpdateFilters({...filters, maxAge: Number(e.target.value)})} className="bg-gray-50 dark:bg-[#202c33] p-4 rounded-2xl outline-none dark:text-white font-bold" placeholder="Max" />
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">I am interested in</span>
                <div className="flex gap-2">
                  {['all', 'male', 'female'].map(g => (
                    <button 
                      key={g}
                      onClick={() => onUpdateFilters({...filters, gender: g})}
                      className={cn(
                        "flex-1 py-4 rounded-2xl font-bold transition-all capitalize",
                        filters.gender === g ? "bg-[#00a884] text-white shadow-lg shadow-[#00a884]/20" : "bg-gray-50 dark:bg-[#202c33] text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => setShowFilters(false)} className="w-full bg-[#00a884] text-white py-5 rounded-3xl font-black mt-10 shadow-xl shadow-[#00a884]/20 active:scale-95 transition-all">
              FIND MATCHES
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasGender && (
        <div className="bg-gradient-to-r from-[#00a884]/90 to-[#01c398]/90 p-4 rounded-2xl mb-4 flex items-center gap-3 text-white shadow-lg shadow-[#00a884]/20 m-2">
          <Sparkles className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold">Complete Your Profile</p>
            <p className="text-[10px] opacity-80">Set your gender to get better matches.</p>
          </div>
          <button onClick={onOpenProfile} className="text-xs font-bold underline">Update</button>
        </div>
      )}
    </div>
  );
};

const UserProfileView = ({ user, targetUser, onBack, onStartChat, onOpenAffiliate, onEditProfile }: any) => {
  const [fullUser, setFullUser] = useState<User | null>(null);
  const [uploading, setUploading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'accepted'>('none');

  useEffect(() => {
    const fetchUser = async () => {
      const docSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', targetUser.uid)));
      if (!docSnap.empty) {
        const u = { uid: docSnap.docs[0].id, ...docSnap.docs[0].data() } as User;
        setFullUser(u);
        
        if (user.friends?.includes(u.uid)) {
          setRequestStatus('accepted');
        } else {
          const q = query(collection(db, 'friend_requests'), 
            where('fromId', '==', user.uid), 
            where('toId', '==', u.uid),
            where('status', '==', 'pending')
          );
          const reqSnap = await getDocs(q);
          if (!reqSnap.empty) setRequestStatus('pending');
        }
      }
    };
    fetchUser();
  }, [targetUser.uid, user.uid, user.friends]);

  const sendFriendRequest = async () => {
    if (!fullUser || fullUser.uid === user.uid) return;
    try {
      await addDoc(collection(db, 'friend_requests'), {
        fromId: user.uid,
        toId: fullUser.uid,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      await notifyUser({
        userId: fullUser.uid,
        fromId: user.uid,
        fromName: user.displayName,
        type: 'friend_request',
        text: 'sent you a friend request'
      });
      setRequestStatus('pending');
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'friend_requests'); }
  };

  const handleStartChat = async () => {
    if (!fullUser) return;
    try {
      // Check if chat exists
      const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
      const snap = await getDocs(q);
      let existingChat = snap.docs.find(d => (d.data() as Chat).participants.includes(fullUser.uid));
      
      if (existingChat) {
        onStartChat({ id: existingChat.id, ...existingChat.data() });
      } else {
        const newChat = await addDoc(collection(db, 'chats'), {
          participants: [user.uid, fullUser.uid],
          type: 'private',
          updatedAt: serverTimestamp()
        });
        onStartChat({ id: newChat.id, participants: [user.uid, fullUser.uid], type: 'private' });
      }
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'chats'); }
  };

  if (!fullUser) return <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#0b141a]"><CircleDashed className="w-8 h-8 animate-spin text-[#00a884]" /></div>;

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a] overflow-y-auto custom-scrollbar">
      {/* Cover & Profile Section (WhatsApp Business Style) */}
      <div className="relative bg-white dark:bg-[#111b21] pb-4 shadow-sm">
        <div className="relative h-48 md:h-56 bg-gray-200 dark:bg-gray-800 overflow-hidden">
          <img 
            src={fullUser.coverURL || `https://picsum.photos/seed/${fullUser.uid}_cover/800/400?blur=1`} 
            className="w-full h-full object-cover" 
            alt="Cover" 
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = `https://picsum.photos/seed/${fullUser.uid}_backup/800/400?blur=5`;
            }}
          />
          <div className="absolute inset-0 bg-black/10" />
          <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white z-10 hover:bg-black/50 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        <div className="px-5 -mt-12 relative flex items-end justify-between">
          <div className="relative">
            <div className="p-1 bg-white dark:bg-[#111b21] rounded-[2rem] shadow-xl">
              <Avatar 
                src={fullUser.photoURL} 
                name={fullUser.displayName} 
                size={110} 
                className="rounded-[1.8rem] overflow-hidden" 
              />
            </div>
            {fullUser.isOnline && (
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-white dark:border-[#111b21] shadow-lg z-20 animate-pulse"></div>
            )}
          </div>
          
          <div className="flex gap-2 mb-2">
            <button onClick={handleStartChat} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full text-[#667781] dark:text-[#8696a0] hover:bg-gray-200 transition-colors">
              <MessageSquare className="w-6 h-6" />
            </button>
            <button className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full text-[#667781] dark:text-[#8696a0] hover:bg-gray-200 transition-colors">
              <Phone className="w-6 h-6" />
            </button>
            <button className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full text-[#667781] dark:text-[#8696a0] hover:bg-gray-200 transition-colors">
              <Share2 className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="px-5 mt-4 space-y-1">
          <h2 className="text-2xl font-bold text-[#111b21] dark:text-[#e9edef] flex items-center gap-2">
            {fullUser.displayName}
            <TierBadge tier={fullUser.category} size={20} />
            {fullUser.isVerified && <VerifiedBadge size={20} />}
          </h2>
          <p className="text-[#00a884] font-semibold text-sm uppercase tracking-wide">
            {fullUser.jobRole === 'employer' ? 'Premium Business Account' : 'Verified Member'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-5 py-6 flex gap-3">
        {fullUser.uid !== user.uid && requestStatus === 'none' && (
          <button onClick={sendFriendRequest} className="flex-1 bg-[#00a884] text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-[#00a884]/20 active:scale-95 transition-all text-sm uppercase tracking-wider">
            Connect
          </button>
        )}
        {fullUser.uid !== user.uid && requestStatus === 'pending' && (
          <button disabled className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-400 py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider">
            Pending Request
          </button>
        )}
        <button onClick={handleStartChat} className={cn("flex-1 bg-white dark:bg-[#111b21] dark:text-white border border-gray-200 dark:border-white/5 py-3.5 rounded-2xl font-bold shadow-sm active:scale-95 transition-all text-sm uppercase tracking-wider", fullUser.uid === user.uid && "hidden")}>
          Chat Now
        </button>
        {fullUser.uid === user.uid && (
          <button onClick={onEditProfile} className="flex-1 bg-[#00a884] text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-[#00a884]/20 active:scale-95 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2">
            <Edit2 size={16} /> Edit My Profile
          </button>
        )}
      </div>

      {/* Business Details Section */}
      <div className="space-y-4 px-5 pb-8">
        {/* Info Blocks */}
        <div className="bg-white dark:bg-[#111b21] rounded-[2rem] shadow-sm divide-y dark:divide-gray-800 overflow-hidden">
          <div className="p-5 flex items-start gap-4">
            <div className="p-2 bg-gray-50 dark:bg-[#202c33] rounded-xl text-[#667781] dark:text-[#8696a0]">
              <LayoutGrid size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">About</h4>
              <p className="text-sm text-[#111b21] dark:text-[#e9edef] leading-relaxed">
                {fullUser.datingProfile?.bio || fullUser.status || "Hello! I am using Heart Connect."}
              </p>
            </div>
          </div>

          <div className="p-5 flex items-start gap-4">
            <div className="p-2 bg-gray-50 dark:bg-[#202c33] rounded-xl text-[#667781] dark:text-[#8696a0]">
              <MapPin size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Location</h4>
              <p className="text-sm text-[#111b21] dark:text-[#e9edef]">
                {fullUser.datingProfile?.city || 'Not specified'}, {fullUser.datingProfile?.country || 'Zimbabwe'}
              </p>
            </div>
          </div>

          <div className="p-5 flex items-start gap-4">
            <div className="p-2 bg-gray-50 dark:bg-[#202c33] rounded-xl text-[#111b21] dark:text-[#e9edef]">
              <span className="text-lg font-bold">18+</span>
            </div>
            <div className="flex-1">
              <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Age & Status</h4>
              <p className="text-sm text-[#111b21] dark:text-[#e9edef]">
                {fullUser.datingProfile?.age || '20+'} years old • {fullUser.category} Membership
              </p>
            </div>
          </div>
        </div>

        {/* Catalog Section (Featured Photos) */}
        <div className="bg-white dark:bg-[#111b21] rounded-[2rem] shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-[#111b21] dark:text-[#e9edef] flex items-center gap-2">
              <Sparkles size={18} className="text-[#00a884]" /> Member Gallery
            </h3>
            <span className="text-[10px] font-black text-[#00a884] bg-[#00a884]/10 px-2 py-1 rounded-full uppercase">
              {fullUser.featuredPhotos?.length || 0} Photos
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {fullUser.featuredPhotos?.length ? fullUser.featuredPhotos.map((photo, i) => (
              <div key={i} className="relative aspect-square rounded-[1.5rem] overflow-hidden group shadow-md">
                <img src={photo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Gallery" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )) : (
              <div className="col-span-2 py-10 bg-gray-50 dark:bg-[#202c33] rounded-[1.5rem] border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-gray-400 italic text-xs">
                No featured moments yet.
              </div>
            )}
          </div>
        </div>

        {fullUser.uid === user.uid && (
          <button 
            onClick={onOpenAffiliate}
            className="w-full flex items-center justify-between p-5 bg-[#00a884]/5 rounded-[2rem] border border-[#00a884]/20 group transition-all hover:bg-[#00a884]/10 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#00a884] rounded-2xl text-white shadow-lg">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h5 className="text-sm font-bold text-[#111b21] dark:text-[#e9edef]">Loyalty Program</h5>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Earn points for inviting hearts</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#00a884] group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};

const NotificationCenter = ({ user, notifications, usersMap, onBack, onNavigate }: any) => {
  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    if (n.type === 'message' && n.relatedId) {
      onNavigate('chat', n.relatedId);
    } else if (n.type === 'friend_request') {
      onNavigate('dating', null);
    } else if (n.type === 'like' || n.type === 'comment' || n.type === 'broadcast') {
      onNavigate('status', n.relatedId || null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a]">
      <div className="bg-[#008069] dark:bg-[#202c33] text-white p-4 flex items-center gap-6 shadow-md transition-colors duration-300">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium">Notifications</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-[#8696a0]">No notifications yet.</div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <div 
                key={n.id}
                className="relative overflow-hidden rounded-2xl bg-red-500"
              >
                {/* Delete background action */}
                <div className="absolute inset-0 flex items-center justify-end px-6 text-white">
                  <div className="flex flex-col items-center gap-1">
                    <Trash2 className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase">Delete</span>
                  </div>
                </div>
                
                <motion.div 
                  drag="x"
                  dragConstraints={{ left: -100, right: 0 }}
                  dragElastic={0.1}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -70) {
                      deleteNotification(n.id);
                    }
                  }}
                  whileDrag={{ scale: 1.02 }}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "bg-white dark:bg-[#111b21] p-4 flex items-center gap-4 border-l-4 transition-all cursor-pointer relative z-10", 
                    n.read ? "border-transparent opacity-70" : "border-[#00a884]"
                  )}
                >
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-[#00a884] shrink-0">
                    {n.type === 'like' && <ThumbsUp className="w-6 h-6" />}
                    {n.type === 'message' && <MessageSquare className="w-6 h-6" />}
                    {n.type === 'friend_request' && <UserPlus className="w-6 h-6" />}
                    {n.type === 'comment' && <MessageCircle className="w-6 h-6" />}
                    {n.type === 'broadcast' && <Megaphone className="w-6 h-6" />}
                    {n.type === 'job_update' && <Briefcase className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#111b21] dark:text-[#e9edef]">
                      <span className="font-bold flex items-center gap-1">
                        {n.fromName}
                        <TierBadge tier={usersMap[n.fromId]?.category} size={12} />
                      </span> {n.text}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{n.timestamp?.toDate ? formatWhatsAppTime(n.timestamp.toDate()) : 'Just now'}</p>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* OneSignal Invite */}
      <div className="p-4 bg-white dark:bg-[#111b21] border-t border-gray-100 dark:border-gray-800">
        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2 text-center">Stay in touch</p>
        <div className="onesignal-customlink-container"></div>
      </div>
    </div>
  );
};

const CreateAd = ({ user, onBack, settings, initialContent = '', initialMediaUrl = '' }: { user: User, onBack: () => void, settings: AppSettings, initialContent?: string, initialMediaUrl?: string }) => {
  const [content, setContent] = useState(initialContent);
  const [link, setLink] = useState('');
  const [duration, setDuration] = useState(settings.minAdDuration);
  const [mediaUrl, setMediaUrl] = useState(initialMediaUrl);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      console.log("Starting ad media upload:", file.name, "Size:", file.size);
      const compressedFile = await compressImage(file);
      console.log("Compressed size:", compressedFile.size);
      
      const url = await uploadFileToServer(compressedFile);
      console.log("Ad media upload complete, URL:", url);
      setMediaUrl(url);
    } catch (error: any) {
      console.error("Ad media upload error details:", error);
      alert("Upload failed: " + (error.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || !mediaUrl) {
      alert("Please provide ad content and an image.");
      return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setSubmitting(true);
      try {
        console.log("Starting ad proof upload:", file.name, "Size:", file.size);
        const compressedFile = await compressImage(file);
        console.log("Compressed size:", compressedFile.size);
        
        const proofUrl = await uploadFileToServer(compressedFile);
        console.log("Ad proof upload complete, URL:", proofUrl);
        
        const totalCost = duration * settings.adPricePerDay;
        
        await addDoc(collection(db, 'payment_proofs'), {
          userId: user.uid,
          userName: user.displayName,
          type: 'ad',
          tier: 'Ad Campaign',
          amount: totalCost,
          proofUrl,
          status: 'pending',
          adData: {
            content,
            link,
            duration,
            mediaUrl,
            cost: totalCost
          },
          timestamp: serverTimestamp()
        });
        
        alert("Upload Complete! Ad submission and payment proof sent! Admin will review and publish your ad soon.");
        onBack();
      } catch (error: any) {
        console.error("Ad proof upload error details:", error);
        alert("Upload failed: " + (error.message || "Unknown error"));
      } finally {
        setSubmitting(false);
      }
    };
    alert("Please upload proof of payment for the ad campaign.");
    input.click();
  };

  const totalCost = duration * settings.adPricePerDay;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] dark:bg-[#0b141a]">
      <div className="bg-[#008069] dark:bg-[#202c33] text-white p-4 flex items-center gap-6 shadow-md transition-colors duration-300">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium">Create Advertisement</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        <div className="bg-white dark:bg-[#111b21] rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-bold text-[#00a884] uppercase block mb-2">Ad Content</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What are you promoting?"
              className="w-full p-3 bg-gray-50 dark:bg-[#2a3942] rounded-xl border-none focus:ring-2 focus:ring-[#00a884] dark:text-[#e9edef] resize-none h-32"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#00a884] uppercase block mb-2">Ad Image</label>
            <div className="flex items-center gap-4">
              <label className="w-24 h-24 bg-gray-100 dark:bg-[#2a3942] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border-2 border-dashed border-gray-300 dark:border-gray-700">
                {mediaUrl ? (
                  <img src={mediaUrl} className="w-full h-full object-cover rounded-xl" alt="Preview" referrerPolicy="no-referrer" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-[10px] text-gray-400 mt-1">Upload</span>
                  </>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </label>
              <div className="flex-1 text-xs text-gray-500 dark:text-[#8696a0]">
                Upload a clear image for your advertisement. High quality images perform better.
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#00a884] uppercase block mb-2">External Link (Optional)</label>
            <input 
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://example.com"
              className="w-full p-3 bg-gray-50 dark:bg-[#2a3942] rounded-xl border-none focus:ring-2 focus:ring-[#00a884] dark:text-[#e9edef]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#00a884] uppercase block mb-2">Duration (Days)</label>
              <input 
                type="number"
                min={settings.minAdDuration}
                value={duration}
                onChange={(e) => setDuration(Math.max(settings.minAdDuration, parseInt(e.target.value) || settings.minAdDuration))}
                className="w-full p-3 bg-gray-50 dark:bg-[#2a3942] rounded-xl border-none focus:ring-2 focus:ring-[#00a884] dark:text-[#e9edef]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#00a884] uppercase block mb-2">Total Cost</label>
              <div className="w-full p-3 bg-gray-100 dark:bg-[#2a3942] rounded-xl font-bold text-lg text-[#111b21] dark:text-[#e9edef]">
                ${totalCost.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-6 border border-yellow-100 dark:border-yellow-900/30 space-y-4">
          <h3 className="font-bold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
            <Shield className="w-5 h-5" /> Payment Instructions
          </h3>
          <div className="space-y-2">
            {settings.paymentMethods.map((pm, idx) => (
              <div key={idx} className="text-sm text-yellow-700 dark:text-yellow-300">
                <span className="font-bold">{pm.type}:</span> {pm.details}
              </div>
            ))}
          </div>
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            Pay the total amount and upload the screenshot of the transaction. Your ad will be reviewed and published within 24 hours.
          </p>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={uploading || submitting}
          className="w-full bg-[#00a884] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#008f6f] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? <CircleDashed className="w-6 h-6 animate-spin" /> : <Megaphone className="w-6 h-6" />}
          Submit Ad & Upload Proof
        </button>
      </div>
    </div>
  );
};

const UpgradeTiers = ({ user, onBack, settings }: { user: User, onBack: () => void, settings: AppSettings }) => {
  const [uploading, setUploading] = useState(false);
  const tiers = [
    { 
      name: 'General', 
      price: 'Free', 
      color: 'bg-gray-100 text-gray-600', 
      icon: <UserIcon className="w-8 h-8" />,
      benefits: ['Post, Comment & Like', '3 Uploads', '1 Match on Dating'] 
    },
    { 
      name: 'Bronze', 
      price: `$4`, 
      duration: '1 Week',
      color: 'bg-orange-100 text-orange-600', 
      icon: <Trophy className="w-8 h-8" />,
      benefits: ['General Features', '5 Uploads', '3 Matches on Dating', '1 Week Free Boost'] 
    },
    { 
      name: 'Silver', 
      price: `$10`, 
      duration: '1 Month',
      color: 'bg-blue-100 text-blue-600', 
      icon: <Crown className="w-8 h-8" />,
      benefits: ['Bronze Features', '10 Uploads', '10 Matches on Dating', '1 Week Free Boost'] 
    },
    { 
      name: 'Gold', 
      price: `$25`, 
      duration: '1 Year',
      color: 'bg-yellow-100 text-yellow-600', 
      icon: <ShieldCheck className="w-8 h-8" />,
      benefits: ['Unlimited Everything', '1 Year Free Boost', 'VIP Support', 'Verified Badge'] 
    },
  ];

  const handleUpgradeStripe = async (tier: any) => {
    if (tier.price === 'Free') return;
    setUploading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tier.name,
          price: parseInt(tier.price.replace('$', '')),
          userId: user.uid
        })
      });
      const session = await response.json();
      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error(session.error || 'Failed to create payment session');
      }
    } catch (error: any) {
      alert("Payment error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleNotifyPayment = async (tier: any) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const compressedFile = await compressImage(file);
        const url = await uploadFileToServer(compressedFile);
        
        await addDoc(collection(db, 'payment_proofs'), {
          userId: user.uid,
          userName: user.displayName,
          tier: tier.name,
          amount: tier.price === 'Free' ? 0 : parseInt(tier.price.replace('$', '')),
          proofUrl: url,
          status: 'pending',
          timestamp: serverTimestamp()
        });
        
        alert("Upload Complete! Payment proof submitted. Admin will verify and update your tier soon.");
      } catch (error: any) {
        alert("Upload failed: " + (error.message || "Unknown error"));
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f0f2f5] dark:bg-[#0b141a]">
      <div className="bg-[#008069] dark:bg-[#202c33] text-white p-4 flex items-center gap-6 shadow-md shrink-0 transition-colors duration-300">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium">Upgrade Membership</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40 scroll-smooth custom-scrollbar touch-pan-y" style={{ overscrollBehavior: 'contain' }}>
        <div className="bg-white dark:bg-[#111b21] p-6 rounded-3xl shadow-sm text-center">
          <h3 className="text-lg font-bold text-gray-700 dark:text-[#e9edef] mb-2">Current Tier: <span className="text-[#00a884]">{user.category}</span></h3>
          <p className="text-sm text-gray-500 dark:text-[#8696a0]">Upgrade to unlock premium features and support the community.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tiers.map(tier => (
            <div key={tier.name} className="bg-white dark:bg-[#111b21] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-2xl", tier.color)}>
                  {tier.icon}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-[#111b21] dark:text-[#e9edef]">{tier.price}</div>
                  {tier.duration && <div className="text-[10px] text-gray-400 uppercase font-bold">{tier.duration}</div>}
                </div>
              </div>
              
              <h4 className="text-lg font-bold text-[#111b21] dark:text-[#e9edef] mb-4">{tier.name}</h4>
              
              <ul className="space-y-3 mb-8 flex-1">
                {tier.benefits.map(b => (
                  <li key={b} className="flex items-start gap-2 text-sm text-gray-600 dark:text-[#8696a0]">
                    <Check className="w-4 h-4 text-[#00a884] shrink-0 mt-0.5" /> {b}
                  </li>
                ))}
              </ul>

              {user.category !== tier.name && tier.name !== 'General' && (
                <div className="space-y-2">
                  <button 
                    onClick={() => handleUpgradeStripe(tier)}
                    disabled={uploading}
                    className="w-full bg-[#00a884] text-white py-3 rounded-2xl font-bold shadow-lg shadow-[#00a884]/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uploading ? <CircleDashed className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                    Pay with Card/Stripe
                  </button>
                  <button 
                    onClick={() => handleNotifyPayment(tier)}
                    disabled={uploading}
                    className="w-full bg-white dark:bg-[#202c33] border border-gray-200 dark:border-white/5 text-[#667781] dark:text-[#8696a0] py-3 rounded-2xl font-bold shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uploading ? <CircleDashed className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                    Manual Payment Proof
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-[#111b21] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-700 dark:text-[#e9edef] mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#00a884]" /> Payment Methods
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {settings.paymentMethods.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2a3942] rounded-2xl border border-gray-100 dark:border-gray-700">
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase">{m.type}</div>
                  <div className="text-sm font-bold text-[#111b21] dark:text-[#e9edef]">{m.details}</div>
                </div>
                <div className="text-[10px] text-gray-400 font-mono">UID: {user.uid.slice(0, 8)}...</div>
              </div>
            ))}
            {/* EcoCash and Innbucks specifically requested */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <div>
                <div className="text-xs font-bold text-blue-400 uppercase">EcoCash / Innbucks</div>
                <div className="text-sm font-bold text-blue-800 dark:text-blue-200">Pay via Merchant/Phone</div>
              </div>
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-[10px] text-center text-gray-400 mt-4">
            After payment, upload the screenshot using the "Upgrade Now" button above.
          </p>
        </div>
      </div>
    </div>
  );
};

const PointsLeaderboard = ({ onBack }: any) => {
  const [leaders, setLeaders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('isVerified', '==', true), orderBy('points', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setLeaders(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
      setLoading(false);
    }, (err) => {
      console.error("Leaderboard error:", err);
      // Fallback if index is missing
      const qFallback = query(collection(db, 'users'), orderBy('points', 'desc'), limit(50));
      onSnapshot(qFallback, (s) => {
        const filtered = s.docs.map(d => ({ uid: d.id, ...d.data() } as User)).filter(u => u.isVerified);
        setLeaders(filtered.slice(0, 20));
        setLoading(false);
      });
    });
    return unsub;
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a]">
      <div className="bg-[#008069] dark:bg-[#202c33] text-white p-4 flex items-center gap-6 shadow-md transition-colors duration-300">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium">Points Leaderboard</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-20"><CircleDashed className="w-8 h-8 animate-spin text-[#00a884]" /></div>
        ) : (
          leaders.map((u, i) => (
            <div key={u.uid} className="bg-white dark:bg-[#111b21] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-700" : i === 2 ? "bg-orange-100 text-orange-700" : "text-gray-400")}>
                {i + 1}
              </div>
              <Avatar src={u.photoURL} name={u.displayName} size={48} isOnline={u.isOnline} />
              <div className="flex-1">
                <h4 className="font-bold text-[#111b21] dark:text-[#e9edef] flex items-center gap-1">
                  {u.displayName}
                  <TierBadge tier={u.category} size={14} />
                  {u.isVerified && <VerifiedBadge size={14} />}
                </h4>
                <p className="text-xs text-gray-400">{u.category} Member</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-[#00a884]">{u.points}</div>
                <div className="text-[10px] text-gray-400 uppercase font-bold">Points</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AdminDashboard = ({ user, onBack }: any) => {
  const [users, setUsers] = useState<User[]>([]);
  const usersMap = useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach(u => { map[u.uid] = u; });
    return map;
  }, [users]);
  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, activeAds: 0, totalPoints: 0 });
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'ads' | 'config' | 'branding' | 'payments' | 'vaccancies' | 'notifications'>('users');
  const [ads, setAds] = useState<Post[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [paymentProofs, setPaymentProofs] = useState<PaymentProof[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(prev => {
        if (prev) console.warn("AdminDashboard: fetch safety timeout - forcing load");
        return false;
      });
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uSnap, pSnap, sSnap, paySnap, jSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'posts')),
          getDocs(collection(db, 'settings')),
          getDocs(collection(db, 'payment_proofs')),
          getDocs(collection(db, 'jobs'))
        ]);

        const uList = uSnap.docs
          .map(d => ({ uid: d.id, ...d.data() } as User))
          .sort((a, b) => {
            const tA = a.createdAt?.toMillis?.() || 0;
            const tB = b.createdAt?.toMillis?.() || 0;
            return tB - tA; // Latest first
          });
        const pList = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Post));

        setUsers(uList);
        setAds(pList.filter(p => p.isAd));
        setJobs(jSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
        if (!sSnap.empty) setSettings(sSnap.docs[0].data() as AppSettings);
        setPaymentProofs(paySnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentProof)));

        setStats({
          totalUsers: uList.length,
          totalPosts: pList.length,
          activeAds: pList.filter(d => d.isAd).length,
          totalPoints: uList.reduce((acc, curr) => acc + (curr.points || 0), 0)
        });
      } catch (error) {
        console.error("AdminDashboard fetchData error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const saveSettings = async (newSettings: AppSettings) => {
    const sSnap = await getDocs(collection(db, 'settings'));
    if (!sSnap.empty) {
      await updateDoc(doc(db, 'settings', sSnap.docs[0].id), newSettings as any);
    } else {
      await addDoc(collection(db, 'settings'), newSettings);
    }
    setSettings(newSettings);
    alert("Settings saved successfully!");
  };

  const approvePayment = async (proof: PaymentProof) => {
    await updateDoc(doc(db, 'payment_proofs', proof.id), { status: 'approved' });
    
    if ((proof as any).type === 'ad' && (proof as any).adData) {
      const adData = (proof as any).adData;
      await addDoc(collection(db, 'posts'), {
        userId: proof.userId,
        content: adData.content,
        media: [adData.mediaUrl],
        adLink: adData.link,
        adCost: adData.cost,
        isAd: true,
        likes: [],
        commentCount: 0,
        createdAt: serverTimestamp(),
        user: { displayName: proof.userName, photoURL: users.find(u => u.uid === proof.userId)?.photoURL }
      });
      alert("Ad approved and published!");
    } else {
      await updateDoc(doc(db, 'users', proof.userId), { category: proof.tier });
      alert("Payment approved and user tier updated!");
    }
    
    setPaymentProofs(paymentProofs.map(p => p.id === proof.id ? { ...p, status: 'approved' } : p));
  };

  const deleteAd = async (adId: string) => {
    await deleteDoc(doc(db, 'posts', adId));
    setAds(ads.filter(a => a.id !== adId));
    setStats({ ...stats, activeAds: stats.activeAds - 1 });
  };

  const toggleUserRole = async (targetUser: User) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    await updateDoc(doc(db, 'users', targetUser.uid), { role: newRole });
    setUsers(users.map(u => u.uid === targetUser.uid ? { ...u, role: newRole as any } : u));
  };

  const setUserCategory = async (targetUser: User, category: string) => {
    await updateDoc(doc(db, 'users', targetUser.uid), { category });
    setUsers(users.map(u => u.uid === targetUser.uid ? { ...u, category: category as any } : u));
  };

  const toggleUserSuspension = async (targetUser: User) => {
    const newSuspended = !targetUser.suspended;
    await updateDoc(doc(db, 'users', targetUser.uid), { suspended: newSuspended });
    setUsers(users.map(u => u.uid === targetUser.uid ? { ...u, suspended: newSuspended } : u));
  };

  const toggleUserVerification = async (targetUser: User) => {
    const newVerified = !targetUser.isVerified;
    await updateDoc(doc(db, 'users', targetUser.uid), { isVerified: newVerified });
    setUsers(users.map(u => u.uid === targetUser.uid ? { ...u, isVerified: newVerified } : u));
  };

  const deleteUser = async (targetUser: User) => {
    await deleteDoc(doc(db, 'users', targetUser.uid));
    setUsers(users.filter(u => u.uid !== targetUser.uid));
    setStats({ ...stats, totalUsers: stats.totalUsers - 1 });
  };

  const broadcastNotification = async (title: string, body: string) => {
    if (!confirm(`Are you sure you want to broadcast this message to ${users.length} users?`)) return;
    
    setLoading(true);
    try {
      // 1. Create a Public Post on the Wall
      const postRef = await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        content: `📢 ${title}\n\n${body}`,
        media: [],
        mediaType: 'text',
        likes: [],
        hashtags: ['#Announcment', '#Update'],
        isReel: false,
        commentCount: 0,
        createdAt: serverTimestamp(),
        isAd: false,
        user: {
          displayName: user.displayName,
          photoURL: user.photoURL,
          isVerified: true
        }
      });

      // 2. Send Notifications to all users
      const batch = writeBatch(db);
      users.forEach(u => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: u.uid,
          fromId: user.uid,
          fromName: user.displayName,
          type: 'broadcast',
          text: body,
          title: title,
          read: false,
          timestamp: serverTimestamp(),
          relatedId: postRef.id // Link to the post
        });
      });
      await batch.commit();

      // Send Push Notification via Server (OneSignal Broadcast)
      fetch('/api/broadcast-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          message: body,
          data: { type: 'broadcast', relatedId: postRef.id }
        })
      }).catch(e => console.warn("Push broadcast failed:", e));
      
      // Attempt local browser notification for admin immediately
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
      
      alert("Broadcast and Wall Post sent successfully!");
    } catch (e) {
      console.error("Broadcast failed:", e);
      alert("Failed to send broadcast.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      await updateDoc(doc(db, 'users', updatedUser.uid), updatedUser as any);
      
      // Update existing posts and statuses for consistency
      const postsQuery = query(collection(db, 'posts'), where('userId', '==', updatedUser.uid));
      const statusesQuery = query(collection(db, 'statuses'), where('userId', '==', updatedUser.uid));
      const [postsSnap, statusesSnap] = await Promise.all([getDocs(postsQuery), getDocs(statusesQuery)]);
      const batch = writeBatch(db);
      postsSnap.docs.forEach(d => batch.update(d.ref, { 'user.displayName': updatedUser.displayName, 'user.photoURL': updatedUser.photoURL }));
      statusesSnap.docs.forEach(d => batch.update(d.ref, { 'user.displayName': updatedUser.displayName, 'user.photoURL': updatedUser.photoURL }));
      await batch.commit();

      setUsers(users.map(u => u.uid === updatedUser.uid ? updatedUser : u));
      setEditingUser(null);
      alert("User updated successfully across all records!");
    } catch (e) {
      console.error("Error updating user:", e);
      alert("Failed to update user.");
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center bg-white"><CircleDashed className="w-8 h-8 animate-spin text-[#00a884]" /></div>;
  if (editingUser) return <ProfileSettings user={editingUser} onBack={() => setEditingUser(null)} onUpdate={handleUpdateUser} />;

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a] h-full max-h-full overflow-hidden">
      <div className="bg-[#111b21] text-white p-4 flex items-center gap-6 shadow-md flex-shrink-0 z-10">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium flex items-center gap-2"><Shield className="w-5 h-5 text-[#00a884]" /> Admin Dashboard</h2>
      </div>
      
      <div className="flex bg-white dark:bg-[#111b21] border-b border-gray-100 dark:border-gray-800 overflow-x-auto flex-shrink-0">
        {['users', 'ads', 'config', 'branding', 'payments', 'vaccancies', 'notifications'].map((t) => (
          <button 
            key={t}
            onClick={() => setActiveTab(t as any)}
            className={cn("flex-shrink-0 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2", activeTab === t ? "border-[#00a884] text-[#00a884]" : "border-transparent text-gray-400 dark:text-[#8696a0]")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 space-y-6 pb-32 scroll-smooth overflow-y-auto custom-scrollbar min-h-0">
        {activeTab === 'users' ? (
          <>
            {/* Stats Section */}
            <div className="space-y-4 p-1">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Dashboard Overview</h3>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
              </div>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-[#111b21] p-4 rounded-2xl shadow-sm text-center border border-gray-100 dark:border-gray-800">
                  <UserIcon className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <div className="text-xl font-bold dark:text-[#e9edef]">{stats.totalUsers}</div>
                  <div className="text-[10px] text-gray-400 dark:text-[#8696a0] uppercase font-bold">Users</div>
                </div>
                <div className="bg-white dark:bg-[#111b21] p-4 rounded-2xl shadow-sm text-center border border-gray-100 dark:border-gray-800">
                  <BarChart3 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <div className="text-xl font-bold dark:text-[#e9edef]">{stats.totalPoints}</div>
                  <div className="text-[10px] text-gray-400 dark:text-[#8696a0] uppercase font-bold">Total Points</div>
                </div>
              </div>
            </div>

            {/* User Management Section */}
            <div className="bg-white dark:bg-[#111b21] rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 flex flex-col">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-gray-800/20">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00a884]" />
                  <h3 className="font-bold text-gray-800 dark:text-[#e9edef] text-sm tracking-tight uppercase">User Management</h3>
                </div>
                <div className="text-[10px] font-black text-[#00a884] bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full uppercase tracking-widest">{users.length} Records</div>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {users.map(u => (
                  <div key={u.uid} className="p-4 space-y-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar src={u.photoURL} name={u.displayName} size={42} isOnline={u.isOnline} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate dark:text-[#e9edef] flex items-center gap-1">
                          {u.displayName}
                          {u.isVerified && <VerifiedBadge size={14} />}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 dark:text-[#8696a0] uppercase font-bold">{u.role}</span>
                          <span className="text-[10px] text-[#00a884] font-bold">{u.points || 0} pts</span>
                        </div>
                      </div>
                      <button onClick={() => setEditingUser(u)} className="p-2 text-gray-400 hover:text-[#00a884] hover:bg-white dark:hover:bg-gray-800 rounded-full transition-all shadow-sm"><SettingsIcon className="w-4 h-4" /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select 
                        value={u.category} 
                        onChange={(e) => setUserCategory(u, e.target.value)}
                        className="text-[10px] font-bold bg-gray-50 dark:bg-[#2a3942] border-none rounded-full px-3 py-1 outline-none dark:text-[#e9edef] appearance-none"
                      >
                        {['General', 'Bronze', 'Silver', 'Gold', 'Platinum'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button 
                        onClick={() => toggleUserRole(u)}
                        className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors", u.role === 'admin' ? "bg-red-50 dark:bg-red-900/20 text-red-500" : "bg-green-50 dark:bg-green-900/20 text-[#00a884]")}
                      >
                        {u.role === 'admin' ? "Demote" : "Make Admin"}
                      </button>
                      <button 
                        onClick={() => toggleUserSuspension(u)}
                        className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors", u.suspended ? "bg-green-50 dark:bg-green-900/20 text-[#00a884]" : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600")}
                      >
                        {u.suspended ? "Unsuspend" : "Suspend"}
                      </button>
                      <button 
                        onClick={() => toggleUserVerification(u)}
                        className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors", u.isVerified ? "bg-blue-50 dark:bg-blue-900/20 text-blue-500" : "bg-gray-50 dark:bg-gray-800 text-gray-400")}
                      >
                        {u.isVerified ? "Verified" : "Verify"}
                      </button>
                      <button 
                        onClick={async () => {
                          const newFeatured = !u.isFeaturedSingle;
                          await updateDoc(doc(db, 'users', u.uid), { isFeaturedSingle: newFeatured });
                          setUsers(users.map(user => user.uid === u.uid ? { ...user, isFeaturedSingle: newFeatured } : user));
                        }}
                        className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors", u.isFeaturedSingle ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600" : "bg-gray-50 dark:bg-gray-800 text-gray-400")}
                      >
                        {u.isFeaturedSingle ? "Featured" : "Feature"}
                      </button>
                      <button 
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = async (e: any) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setLoading(true);
                            try {
                              const compressed = await compressImage(file);
                              const url = await uploadFileToServer(compressed);
                              await updateDoc(doc(db, 'users', u.uid), { photoURL: url });
                              // Sync with posts for consistency
                              const qP = query(collection(db, 'posts'), where('userId', '==', u.uid));
                              const sP = await getDocs(qP);
                              const batch = writeBatch(db);
                              sP.docs.forEach(d => batch.update(d.ref, { 'user.photoURL': url }));
                              await batch.commit();
                              
                              setUsers(users.map(user => user.uid === u.uid ? { ...user, photoURL: url } : user));
                              alert("User photo updated!");
                            } catch (err: any) { alert("Update failed"); }
                            finally { setLoading(false); }
                          };
                          input.click();
                        }}
                        className="p-1 px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full hover:bg-blue-100 transition-colors text-[10px] font-bold uppercase tracking-widest"
                      >
                        Change Photo
                      </button>
                      <button 
                         onClick={() => deleteUser(u)}
                         className="p-1 px-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full hover:bg-red-100 transition-colors text-[10px] font-bold uppercase tracking-widest"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {activeTab === 'ads' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 dark:text-[#e9edef]">Active Advertisements</h3>
            {ads.length === 0 ? (
              <div className="bg-white dark:bg-[#111b21] p-8 rounded-2xl text-center text-gray-500 dark:text-[#8696a0]">No active ads.</div>
            ) : (
              ads.map(ad => (
                <div key={ad.id} className="bg-white dark:bg-[#111b21] p-4 rounded-2xl shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Avatar src={usersMap[ad.userId]?.photoURL} name={usersMap[ad.userId]?.displayName || "Advertiser"} size={32} />
                        <div>
                          <h4 className="font-bold text-sm dark:text-[#e9edef]">{usersMap[ad.userId]?.displayName || "Advertiser"}</h4>
                          <p className="text-[10px] text-gray-400 dark:text-[#8696a0]">Sponsored</p>
                        </div>
                      </div>
                      <button onClick={() => deleteAd(ad.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  <p className="text-sm text-gray-700 dark:text-[#e9edef]">{ad.content}</p>
                  {ad.media?.[0] && <img src={ad.media[0]} className="w-full h-32 object-cover rounded-xl" alt="Ad Media" referrerPolicy="no-referrer" />}
                  {ad.adLink && <div className="text-xs text-[#00a884] font-bold truncate">{ad.adLink}</div>}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'config' && settings && (
          <div className="bg-white dark:bg-[#111b21] rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 dark:text-[#e9edef]">System Configuration</h3>
              <SettingsIcon className="w-4 h-4 text-gray-400" />
            </div>
            <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
              <h3 className="font-bold text-gray-700 dark:text-[#e9edef] border-b dark:border-gray-800 pb-2">Point System Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Points per Post</label>
                <input type="number" value={settings.pointsPerPost} onChange={(e) => setSettings({...settings, pointsPerPost: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Points per Comment</label>
                <input type="number" value={settings.pointsPerComment} onChange={(e) => setSettings({...settings, pointsPerComment: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Points per Like</label>
                <input type="number" value={settings.pointsPerLike} onChange={(e) => setSettings({...settings, pointsPerLike: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Money per Point ($)</label>
                <input type="number" step="0.001" value={settings.moneyPerPoint} onChange={(e) => setSettings({...settings, moneyPerPoint: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef]" />
              </div>
            </div>

            <h3 className="font-bold text-gray-700 dark:text-[#e9edef] border-b dark:border-gray-800 pb-2 pt-4">Tier Pricing & Duration</h3>
            <div className="space-y-4">
              {['Bronze', 'Silver', 'Gold', 'Platinum'].map(tier => (
                <div key={tier} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">{tier} Price ($)</label>
                    <input type="number" value={settings.tierPrices[tier]} onChange={(e) => setSettings({...settings, tierPrices: {...settings.tierPrices, [tier]: Number(e.target.value)}})} className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef]" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">{tier} Duration</label>
                    <input type="text" value={settings.tierDurations[tier]} onChange={(e) => setSettings({...settings, tierDurations: {...settings.tierDurations, [tier]: e.target.value}})} className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef]" />
                  </div>
                </div>
              ))}
            </div>

            <h3 className="font-bold text-gray-700 dark:text-[#e9edef] border-b dark:border-gray-800 pb-2 pt-4">Advertisement Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Ad Price per Day ($)</label>
                <input type="number" value={settings.adPricePerDay} onChange={(e) => setSettings({...settings, adPricePerDay: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Min Ad Duration (Days)</label>
                <input type="number" value={settings.minAdDuration} onChange={(e) => setSettings({...settings, minAdDuration: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef]" />
              </div>
            </div>

            <h3 className="font-bold text-gray-700 dark:text-[#e9edef] border-b dark:border-gray-800 pb-2 pt-4">Affiliate System</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Points awarded per Invitation</label>
                <input type="number" value={settings.pointsPerInvitation || 0} onChange={(e) => setSettings({...settings, pointsPerInvitation: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef]" />
              </div>
            </div>

            <h3 className="font-bold text-gray-700 dark:text-[#e9edef] border-b dark:border-gray-800 pb-2 pt-4">Word Censorship</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Sensored Words (comma separated)</label>
                <textarea 
                  value={settings.sensoredWords?.join(', ') || ''} 
                  onChange={(e) => setSettings({...settings, sensoredWords: e.target.value.split(',').map(s => s.trim()).filter(s => s)})} 
                  placeholder="badword1, badword2..."
                  className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef] h-24 font-mono text-xs" 
                />
              </div>
            </div>

            <h3 className="font-bold text-gray-700 dark:text-[#e9edef] border-b dark:border-gray-800 pb-2 pt-4">Analytics & AdSense</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Google Analytics Code (HTML)</label>
                <textarea 
                  value={settings.googleAnalyticsCode || ''} 
                  onChange={(e) => setSettings({...settings, googleAnalyticsCode: e.target.value})} 
                  placeholder="Paste <script> here..."
                  className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef] h-24 font-mono text-xs" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Google AdSense Code (HTML)</label>
                <textarea 
                  value={settings.adSenseCode || ''} 
                  onChange={(e) => setSettings({...settings, adSenseCode: e.target.value})} 
                  placeholder="Paste <ins> or <script> here..."
                  className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef] h-24 font-mono text-xs" 
                />
              </div>
            </div>

            <button onClick={() => saveSettings(settings)} className="w-full bg-[#00a884] text-white py-4 rounded-2xl font-bold shadow-lg mt-4">Save Configuration</button>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white dark:bg-[#111b21] rounded-2xl shadow-sm p-6 space-y-6">
            <h3 className="font-bold text-gray-700 dark:text-[#e9edef] border-b dark:border-gray-800 pb-2 flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#00a884]" />
              System Broadcast
            </h3>
            <p className="text-sm text-gray-500">Send a notification to all registered users. This will appear in their in-app notifications and as a browser popup if they have enabled it.</p>
            
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const title = e.currentTarget.title.value;
              const body = e.currentTarget.body.value;
              if (title && body) {
                broadcastNotification(title, body);
                e.currentTarget.reset();
              }
            }} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Notification Title</label>
                <input name="title" type="text" required className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef]" placeholder="E.g. Weekend Special Offer!" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Message Content</label>
                <textarea name="body" required className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef] h-24" placeholder="Type your message here..." />
              </div>
              <button type="submit" className="w-full bg-[#00a884] text-white py-4 rounded-2xl font-bold translate-y-0 active:translate-y-1 transition-all shadow-lg flex items-center justify-center gap-2">
                <Send size={18} />
                Send Broadcast to {users.length} Users
              </button>
            </form>
          </div>
        )}

        {activeTab === 'branding' && settings && (
          <div className="bg-white dark:bg-[#111b21] rounded-2xl shadow-sm p-6 space-y-6">
            <h3 className="font-bold text-gray-700 dark:text-[#e9edef] border-b dark:border-gray-800 pb-2">Site Branding & Identity</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Site Name</label>
                <input 
                  type="text" 
                  value={settings.siteName || ""} 
                  onChange={(e) => setSettings({...settings, siteName: e.target.value})} 
                  className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl outline-none dark:text-[#e9edef]" 
                  placeholder="Heart Connect"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Site Logo</label>
                  <div className="flex flex-col gap-2">
                    {settings.logoUrl && <img src={settings.logoUrl} className="w-12 h-12 object-cover rounded-xl border" alt="Logo" referrerPolicy="no-referrer" />}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const compressed = await compressImage(file);
                          const url = await uploadFileToServer(compressed);
                          setSettings({...settings, logoUrl: url});
                        }
                      }}
                      className="text-[10px] text-gray-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-[#8696a0] uppercase block mb-1">Favicon URL</label>
                  <div className="flex flex-col gap-2">
                    {settings.faviconUrl && <img src={settings.faviconUrl} className="w-8 h-8 object-contain rounded border" alt="Favicon" referrerPolicy="no-referrer" />}
                    <input 
                      type="file" 
                      accept="image/x-icon,image/png" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await uploadFileToServer(file);
                          setSettings({...settings, faviconUrl: url});
                        }
                      }}
                      className="text-[10px] text-gray-500"
                    />
                  </div>
                </div>
              </div>
              <button 
                onClick={() => saveSettings(settings)}
                className="w-full bg-[#00a884] text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all"
              >
                Save Branding Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 dark:text-[#e9edef]">Manual Payment Verification</h3>
            {paymentProofs.length === 0 ? (
              <div className="bg-white dark:bg-[#111b21] p-8 rounded-2xl text-center text-gray-500 dark:text-[#8696a0]">No payment proofs submitted.</div>
            ) : (
              paymentProofs.map(proof => (
                <div key={proof.id} className="bg-white dark:bg-[#111b21] p-4 rounded-2xl shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm dark:text-[#e9edef]">{proof.userName}</h4>
                      <p className="text-[10px] text-gray-400 dark:text-[#8696a0] uppercase font-bold">{proof.tier} - ${proof.amount}</p>
                    </div>
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase", proof.status === 'pending' ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400" : proof.status === 'approved' ? "bg-green-50 dark:bg-green-900/20 text-[#00a884]" : "bg-red-50 dark:bg-red-900/20 text-red-500")}>
                      {proof.status}
                    </span>
                  </div>
                  {proof.proofUrl && (
                    <a href={proof.proofUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={proof.proofUrl} className="w-full h-40 object-cover rounded-xl border border-gray-100 dark:border-gray-800" alt="Proof" referrerPolicy="no-referrer" />
                    </a>
                  )}
                  {proof.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => approvePayment(proof)} className="flex-1 bg-[#00a884] text-white py-2 rounded-xl text-xs font-bold">Approve</button>
                      <button onClick={() => updateDoc(doc(db, 'payment_proofs', proof.id), { status: 'rejected' })} className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-500 py-2 rounded-xl text-xs font-bold">Reject</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'vaccancies' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 dark:text-[#e9edef]">Manage Vacancies</h3>
            {jobs.length === 0 ? (
              <div className="bg-white dark:bg-[#111b21] p-8 rounded-2xl text-center text-gray-500 dark:text-[#8696a0]">No job postings found.</div>
            ) : (
              jobs.map(job => (
                <div key={job.id} className="bg-white dark:bg-[#111b21] p-4 rounded-2xl shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#00a884]/10 rounded-xl flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-[#00a884]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm dark:text-[#e9edef]">{job.title}</h4>
                        <p className="text-[10px] text-gray-400 dark:text-[#8696a0] uppercase font-bold">{job.company} • {job.location}</p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        if (confirm('Delete this job?')) {
                          await deleteDoc(doc(db, 'jobs', job.id));
                          setJobs(jobs.filter(j => j.id !== job.id));
                        }
                      }} 
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#8696a0] line-clamp-2">{job.description}</p>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-50 dark:border-gray-800">
                    <span className="text-[10px] text-[#00a884] font-bold uppercase">{job.type}</span>
                    <span className="text-[10px] text-gray-400 font-bold">{job.status === 'open' ? '🟢 OPEN' : '🔴 CLOSED'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </>
    )}
  </div>
</div>
);
};
const ProfileSettings = ({ user, onBack, onUpdate, darkMode, setDarkMode }: { 
  user: User, 
  onBack: () => void, 
  onUpdate: (u: User) => void,
  darkMode?: boolean,
  setDarkMode?: (v: boolean) => void
}) => {
  const [firstName, setFirstName] = useState(user.firstName || user.displayName.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user.lastName || user.displayName.split(' ')[1] || '');
  const [status, setStatus] = useState(user.status || '');
  const [datingBio, setDatingBio] = useState(user.datingProfile?.bio || '');
  const [datingAge, setDatingAge] = useState(user.datingProfile?.age || 18);
  const [gender, setGender] = useState(user.datingProfile?.gender || 'other');
  const [country, setCountry] = useState(user.datingProfile?.country || '');
  const [city, setCity] = useState(user.datingProfile?.city || '');
  const [datingCategory, setDatingCategory] = useState(user.datingProfile?.datingCategory || 'Soulmates');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [coverURL, setCoverURL] = useState(user.coverURL || '');
  const [jobRole, setJobRole] = useState(user.jobRole || 'seeker');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const compressAndUpload = async (file: File, type: 'photo' | 'cover' = 'photo') => {
    setUploading(true);
    try {
      console.log(`Starting ${type} upload:`, file.name, "Size:", file.size);
      const compressedFile = await compressImage(file);
      console.log("Compressed size:", compressedFile.size);
      
      const url = await uploadFileToServer(compressedFile);
      console.log(`${type} upload complete, URL:`, url);
      
      if (type === 'photo') setPhotoURL(url);
      else setCoverURL(url);
      
      alert(`${type === 'photo' ? 'Photo' : 'Cover'} uploaded successfully! Click Save to persist changes.`);
    } catch (error: any) {
      console.error(`${type} upload error details:`, error);
      alert("Upload failed: " + (error.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert("Please enter both Name and Surname");
      return;
    }
    setSaving(true);
    try {
      const userDoc = doc(db, 'users', user.uid);
      const capFirstName = capitalizeName(firstName.trim());
      const capLastName = capitalizeName(lastName.trim());
      const displayName = `${capFirstName} ${capLastName}`;
      const updatedData = {
        displayName,
        firstName: capFirstName,
        lastName: capLastName,
        photoURL,
        coverURL,
        status,
        jobRole,
        datingProfile: {
          ...user.datingProfile,
          bio: datingBio,
          age: Number(datingAge),
          gender,
          country,
          city,
          datingCategory
        }
      };
      await updateDoc(userDoc, updatedData);

      // Update existing posts and statuses for consistency
      try {
        const postsQuery = query(collection(db, 'posts'), where('userId', '==', user.uid));
        const statusesQuery = query(collection(db, 'statuses'), where('userId', '==', user.uid));
        const [postsSnap, statusesSnap] = await Promise.all([getDocs(postsQuery), getDocs(statusesQuery)]);
        const batch = writeBatch(db);
        postsSnap.docs.forEach(d => batch.update(d.ref, { 'user.displayName': displayName, 'user.photoURL': photoURL }));
        statusesSnap.docs.forEach(d => batch.update(d.ref, { 'user.displayName': displayName, 'user.photoURL': photoURL }));
        await batch.commit();
      } catch (e) {
        console.error("Error updating related documents:", e);
      }

      onUpdate({ ...user, ...updatedData });
      onBack();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCountry = COUNTRIES.find(c => c.name === country);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] dark:bg-[#0b141a]">
      <div className="bg-[#008069] dark:bg-[#202c33] text-white p-4 flex items-center gap-6 shadow-md transition-colors duration-300">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium">Edit Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="relative bg-white dark:bg-[#111b21] mb-6">
          {/* Cover Photo Upload */}
          <div className="relative h-48 md:h-56 bg-gray-200 dark:bg-gray-800 overflow-hidden group/cover">
            <img 
              src={coverURL || `https://picsum.photos/seed/${user.uid}_cover/800/400?blur=1`} 
              className="w-full h-full object-cover" 
              alt="Cover" 
              referrerPolicy="no-referrer"
            />
            <label className="absolute inset-0 bg-black/20 opacity-0 group-hover/cover:opacity-100 transition-opacity cursor-pointer flex flex-col items-center justify-center text-white gap-2">
              <Camera className="w-8 h-8" />
              <span className="text-xs font-bold uppercase">Change Cover</span>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    compressAndUpload(file, 'cover');
                    e.target.value = '';
                  }
                }} 
              />
            </label>
          </div>

          <div className="flex flex-col items-center -mt-20 relative z-10">
            <div className="relative group">
              <div className="p-1 bg-white dark:bg-[#111b21] rounded-full shadow-2xl">
                <Avatar src={photoURL} name={user.displayName} size={140} className={cn("shadow-lg", !photoURL && "grayscale")} />
              </div>
              {!photoURL && (
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg z-10"
                  title="Profile photo missing"
                >
                  <ShieldAlert className="w-5 h-5" />
                </motion.div>
              )}
              <label className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="text-white w-8 h-8" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      compressAndUpload(file, 'photo');
                      e.target.value = ''; // Clear input
                    }
                  }} 
                />
              </label>
              {uploading && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-full flex items-center justify-center"><CircleDashed className="w-8 h-8 animate-spin text-[#00a884]" /></div>}
            </div>
            <h3 className="mt-4 text-xl font-bold dark:text-[#e9edef] flex items-center gap-2">
              {firstName} {lastName}
              <TierBadge tier={user.category} size={20} />
              {user.isVerified && <VerifiedBadge size={20} />}
            </h3>
            {!photoURL && (
              <p className="text-red-500 text-[10px] font-bold mt-1 animate-pulse">
                ⚠️ Upload photo to unlock full messaging features (Max 3 msgs allowed)
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6 px-4 pb-8">
          <section className="bg-white dark:bg-[#111b21] rounded-xl p-4 shadow-sm space-y-4">
            <label className="text-xs font-semibold text-[#00a884] uppercase tracking-wider block">Personal Information</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] text-gray-500 dark:text-[#8696a0] mb-1 block">First Name</label>
                <input 
                  type="text" 
                  value={firstName} 
                  onChange={(e) => setFirstName(capitalizeName(e.target.value))}
                  className="w-full border-b border-gray-200 dark:border-gray-800 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px] bg-transparent dark:text-[#e9edef]"
                />
              </div>
              <div>
                <label className="text-[12px] text-gray-500 dark:text-[#8696a0] mb-1 block">Surname</label>
                <input 
                  type="text" 
                  value={lastName} 
                  onChange={(e) => setLastName(capitalizeName(e.target.value))}
                  className="w-full border-b border-gray-200 dark:border-gray-800 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px] bg-transparent dark:text-[#e9edef]"
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] text-gray-500 dark:text-[#8696a0] mb-1 block">Status</label>
              <input 
                type="text" 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border-b border-gray-200 dark:border-gray-800 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px] bg-transparent dark:text-[#e9edef]"
              />
            </div>
          </section>

          <section className="bg-white dark:bg-[#111b21] rounded-xl p-4 shadow-sm space-y-4">
            <label className="text-xs font-semibold text-[#00a884] uppercase tracking-wider block">Dating Details</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] text-gray-500 dark:text-[#8696a0] mb-1 block">Age</label>
                <input 
                  type="number" 
                  value={datingAge} 
                  onChange={(e) => setDatingAge(Number(e.target.value))}
                  className="w-full border-b border-gray-200 dark:border-gray-800 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px] bg-transparent dark:text-[#e9edef]"
                />
              </div>
              <div>
                <label className="text-[12px] text-gray-500 dark:text-[#8696a0] mb-1 block">Gender</label>
                <select 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full border-b border-gray-200 dark:border-gray-800 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px] bg-transparent dark:text-[#e9edef]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] text-gray-500 dark:text-[#8696a0] mb-1 block">Country</label>
                <select 
                  value={country} 
                  onChange={(e) => { setCountry(e.target.value); setCity(''); }}
                  className="w-full border-b border-gray-200 dark:border-gray-800 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px] bg-transparent dark:text-[#e9edef]"
                >
                  <option value="">Select Country</option>
                  {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-gray-500 dark:text-[#8696a0] mb-1 block">City</label>
                <select 
                  value={city} 
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border-b border-gray-200 dark:border-gray-800 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px] bg-transparent dark:text-[#e9edef]"
                  disabled={!country}
                >
                  <option value="">Select City</option>
                  {selectedCountry?.cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] text-gray-500 dark:text-[#8696a0] mb-1 block">Dating Category</label>
                <select 
                  value={datingCategory} 
                  onChange={(e) => setDatingCategory(e.target.value as any)}
                  className="w-full border-b border-gray-200 dark:border-gray-800 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px] bg-transparent dark:text-[#e9edef]"
                >
                  <option value="Soulmates">Soulmates</option>
                  <option value="Friendship">Friendship</option>
                  <option value="Business">Business</option>
                  <option value="Casual">Casual</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] text-gray-500 dark:text-[#8696a0] mb-1 block">Bio</label>
                <textarea 
                  value={datingBio} 
                  onChange={(e) => setDatingBio(e.target.value)}
                  className="w-full border-b border-gray-200 dark:border-gray-800 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px] resize-none h-10 bg-transparent dark:text-[#e9edef]"
                />
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-[#111b21] rounded-xl p-4 shadow-sm space-y-4">
            <label className="text-xs font-semibold text-[#00a884] uppercase tracking-wider block">Job Marketplace Role</label>
            <div className="flex gap-4">
              <button 
                onClick={() => setJobRole('seeker')}
                className={cn("flex-1 py-3 rounded-xl border-2 transition-all font-bold text-sm flex flex-col items-center gap-1", jobRole === 'seeker' ? "border-[#00a884] bg-green-50 dark:bg-green-900/10 text-[#00a884]" : "border-gray-100 dark:border-gray-800 text-gray-400 dark:text-[#8696a0]")}
              >
                <GraduationCap className="w-5 h-5" />
                Job Seeker
              </button>
              <button 
                onClick={() => {
                  if (user.isVerified) {
                    setJobRole('employer');
                  } else {
                    alert("Verification Required: Only verified users can register as employers and post jobs.");
                  }
                }}
                className={cn(
                  "flex-1 py-3 rounded-xl border-2 transition-all font-bold text-sm flex flex-col items-center gap-1", 
                  jobRole === 'employer' ? "border-[#00a884] bg-green-50 dark:bg-green-900/10 text-[#00a884]" : "border-gray-100 dark:border-gray-800 text-gray-400 dark:text-[#8696a0]",
                  !user.isVerified && "grayscale opacity-60"
                )}
              >
                <Building2 className="w-5 h-5" />
                Employer
              </button>
            </div>
          </section>

          {setDarkMode && (
            <section className="bg-white dark:bg-[#111b21] rounded-xl p-4 shadow-sm space-y-4">
              <label className="text-xs font-semibold text-[#00a884] uppercase tracking-wider block">Appearance</label>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[16px] font-medium text-[#111b21] dark:text-[#e9edef]">Dark Mode</h4>
                  <p className="text-xs text-gray-500 dark:text-[#8696a0]">Switch between light and dark themes</p>
                </div>
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    darkMode ? "bg-[#00a884]" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                    darkMode ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            </section>
          )}

          <button 
            onClick={handleSave}
            disabled={saving || uploading}
            className="w-full bg-[#00a884] text-white py-4 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};

const JobsView = ({ user, jobs, applications, onApply, onCreateClick, onSelectJob, activeTab, onUpdateStatus, onDeleteJob, onEditJob }: any) => {
  const [jobSubTab, setJobSubTab] = useState<'find' | 'applications' | 'postings' | 'reviews'>('find');
  const [filterType, setFilterType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const canManage = user?.isVerified;

  const jobTypes = ['All', 'Full-time', 'Part-time', 'Contract', 'Remote'];

  const filteredJobs = jobs.filter((j: any) => {
    const matchesSearch = j.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         j.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || j.type === filterType;
    return matchesSearch && matchesType && j.status === 'open';
  });

  const myPostings = jobs.filter((j: any) => j.employerId === user?.uid);
  const myApplications = applications.filter((a: any) => a.seekerId === user?.uid);
  const receivedApplications = applications.filter((a: any) => a.employerId === user?.uid);

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#0b141a]">
      {/* Sub Tabs */}
      <div className="flex bg-white dark:bg-[#111b21] p-1 border-b border-gray-100 dark:border-gray-800 overflow-x-auto custom-scrollbar">
        <button 
          onClick={() => setJobSubTab('find')}
          className={cn("flex-shrink-0 px-4 py-2 text-[10px] font-bold uppercase transition-all rounded-lg whitespace-nowrap", jobSubTab === 'find' ? "bg-[#00a884] text-white" : "text-gray-400")}
        >
          Browse
        </button>
        <button 
          onClick={() => setJobSubTab('applications')}
          className={cn("flex-shrink-0 px-4 py-2 text-[10px] font-bold uppercase transition-all rounded-lg whitespace-nowrap", jobSubTab === 'applications' ? "bg-[#00a884] text-white" : "text-gray-400")}
        >
          My Apps
        </button>
        {canManage && (
          <>
            <button 
              onClick={() => setJobSubTab('postings')}
              className={cn("flex-shrink-0 px-4 py-2 text-[10px] font-bold uppercase transition-all rounded-lg whitespace-nowrap", jobSubTab === 'postings' ? "bg-[#00a884] text-white" : "text-gray-400")}
            >
              My Jobs
            </button>
            <button 
              onClick={() => setJobSubTab('reviews')}
              className={cn("flex-shrink-0 px-4 py-2 text-[10px] font-bold uppercase transition-all rounded-lg whitespace-nowrap", jobSubTab === 'reviews' ? "bg-[#00a884] text-white" : "text-gray-400")}
            >
              Applicants ({receivedApplications.length})
            </button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {!canManage && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-tight">Employer Verification Required</p>
              <p className="text-[11px] text-blue-600 dark:text-blue-500 font-medium leading-tight mt-1">
                Only verified accounts can post jobs and manage applicants. Contact admin or upgrade to a premium tier to receive your verification badge.
              </p>
            </div>
          </div>
        )}
        {jobSubTab === 'find' && (
          <>
            {/* Search & Filters */}
            <div className="flex gap-2 sticky top-0 z-10 bg-[#f0f2f5] dark:bg-[#0b141a] py-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Titles, companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-[#202c33] border-none p-2 pl-10 rounded-xl text-sm outline-none shadow-sm dark:text-[#e9edef]"
                />
              </div>
              <div className="relative">
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-white dark:bg-[#202c33] border-none p-2 rounded-xl text-xs font-bold pr-8 outline-none shadow-sm dark:text-[#e9edef] appearance-none"
                >
                  {jobTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="grid gap-3">
              {filteredJobs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No jobs found matching your criteria.</div>
              ) : (
                filteredJobs.map((job: any) => (
                  <div 
                    key={job.id} 
                    onClick={() => onSelectJob(job)}
                    className="bg-white dark:bg-[#111b21] p-4 rounded-2xl shadow-sm border border-transparent hover:border-[#00a884] transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 bg-[#00a884]/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#00a884]/20 transition-colors">
                          <Briefcase className="w-6 h-6 text-[#00a884]" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg dark:text-[#e9edef] leading-tight">{job.title}</h4>
                          <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                            <Building2 className="w-3 h-3" />
                            {job.company}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-500 px-2 py-1 rounded-full uppercase tracking-wider">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-green-50 dark:bg-green-900/20 text-[#00a884] px-2 py-1 rounded-full uppercase tracking-wider">
                        <DollarSign className="w-3 h-3" />
                        {job.salary || 'Competitive'}
                      </span>
                      <span className="text-[10px] font-bold bg-gray-50 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded-full uppercase tracking-wider">
                        {job.type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {jobSubTab === 'applications' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold dark:text-[#e9edef] px-1">My Job Applications</h3>
            {myApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white dark:bg-[#111b21] rounded-2xl">You haven't applied to any jobs yet.</div>
            ) : (
              myApplications.map((app: any) => {
                const job = jobs.find((j: any) => j.id === app.jobId);
                return (
                  <div key={app.id} className="bg-white dark:bg-[#111b21] p-4 rounded-2xl shadow-sm border border-gray-50 dark:border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="font-bold text-sm dark:text-[#e9edef]">{job?.title || "Unknown Job"}</h4>
                       <span className={cn("text-[10px] font-bold min-w-[70px] text-center uppercase px-2 py-1 rounded-full", 
                        app.status === 'applied' ? "bg-blue-50 text-blue-500" :
                        app.status === 'reviewed' ? "bg-yellow-50 text-yellow-600" :
                        app.status === 'accepted' ? "bg-green-50 text-[#00a884]" :
                        "bg-red-50 text-red-500"
                       )}>
                         {app.status}
                       </span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{job?.company} • {app.timestamp?.toDate ? formatWhatsAppTime(app.timestamp.toDate()) : 'Recently'}</p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {jobSubTab === 'postings' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold dark:text-[#e9edef]">My Active Postings</h3>
              <button onClick={onCreateClick} className="text-[10px] font-bold text-[#00a884] uppercase">Post New</button>
            </div>
            {myPostings.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white dark:bg-[#111b21] rounded-2xl">You haven't posted any jobs yet.</div>
            ) : (
              myPostings.map((job: any) => (
                <div key={job.id} className="bg-white dark:bg-[#111b21] p-4 rounded-2xl shadow-sm border border-gray-50 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm dark:text-[#e9edef]">{job.title}</h4>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => onEditJob(job)}
                        className="p-1 text-gray-400 hover:text-[#00a884]"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDeleteJob(job.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{job.type} • {job.location}</p>
                    <button 
                      onClick={() => onSelectJob(job)}
                      className="text-[10px] font-bold text-[#00a884] underline"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {jobSubTab === 'reviews' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold dark:text-[#e9edef] px-1">Manage Applicants</h3>
            {receivedApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white dark:bg-[#111b21] rounded-2xl">No applications received yet.</div>
            ) : (
              receivedApplications.map((app: any) => {
                const job = jobs.find((j: any) => j.id === app.jobId);
                return (
                  <div key={app.id} className="bg-white dark:bg-[#111b21] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2">
                        {app.seekerPhoto ? (
                          <img src={app.seekerPhoto} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-sm dark:text-[#e9edef]">{app.seekerName}</h4>
                          <p className="text-[10px] text-gray-500 font-medium">Applied for: {job?.title}</p>
                        </div>
                      </div>
                      <span className={cn("text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full", 
                        app.status === 'applied' ? "bg-blue-50 text-blue-500" :
                        app.status === 'reviewed' ? "bg-yellow-50 text-yellow-600" :
                        app.status === 'accepted' ? "bg-green-50 text-[#00a884]" :
                        "bg-red-50 text-red-500"
                      )}>
                        {app.status}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                      <button 
                        onClick={() => onUpdateStatus(app, 'reviewed')}
                        className="flex-1 py-1.5 text-[10px] font-bold border border-gray-200 dark:border-gray-700 rounded-lg dark:text-gray-300"
                      >
                        Review
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(app, 'accepted')}
                        className="flex-1 py-1.5 text-[10px] font-bold bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-lg"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(app, 'rejected')}
                        className="flex-1 py-1.5 text-[10px] font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CreateJob = ({ user, onBack, jobToEdit }: any) => {
  const [formData, setFormData] = useState({
    title: jobToEdit?.title || '',
    company: jobToEdit?.company || '',
    location: jobToEdit?.location || '',
    type: jobToEdit?.type || 'Full-time',
    description: jobToEdit?.description || '',
    summary: jobToEdit?.summary || '',
    requirements: jobToEdit?.requirements?.join('\n') || '',
    salary: jobToEdit?.salary || '',
    status: jobToEdit?.status || 'open'
  });
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const generateSummary = async () => {
    if (!formData.description) return;
    setSummarizing(true);
    try {
      const ai = getAI();
      if (!ai) return;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Summarize this job description in 2-3 short sentences for a social media feed. Focus on the core role and key benefits: ${formData.description}`,
      });
      if (response.text) {
        setFormData(prev => ({ ...prev, summary: response.text || '' }));
      }
    } catch (e) {
      console.error("Summary generation failed:", e);
    } finally {
      setSummarizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.company || !formData.description) return alert("Required fields missing");
    
    setLoading(true);
    try {
      let finalSummary = formData.summary;
      if (!finalSummary) {
        const ai = getAI();
        if (!ai) return;
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Summarize this job description in 2-3 short sentences: ${formData.description}`,
        });
        finalSummary = response.text || '';
      }

      const jobData = {
        ...formData,
        summary: finalSummary,
        requirements: formData.requirements.split('\n').filter((r: string) => r.trim()),
      };

      if (jobToEdit) {
        await updateDoc(doc(db, 'jobs', jobToEdit.id), {
          ...jobData,
          updatedAt: serverTimestamp()
        });
        alert("Job Updated Successfully!");
      } else {
        await addDoc(collection(db, 'jobs'), {
          ...jobData,
          employerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // If not already an employer, become one
        if (user.jobRole !== 'employer') {
          await updateDoc(doc(db, 'users', user.uid), { jobRole: 'employer' });
        }
        
        alert("Job Posted Successfully!");
      }
      onBack();
    } catch (e) { 
      console.error("Action failed", e);
      alert("Action failed"); 
    }
    finally { setLoading(false); }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] dark:bg-[#0b141a]">
      <div className="bg-[#008069] dark:bg-[#202c33] text-white p-4 flex items-center gap-6 shadow-md transition-colors duration-300">
        <button onClick={onBack} className="p-1 transition-colors hover:bg-white/10 rounded-full"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium">Post a Vacancy</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-10">
        <div className="bg-white dark:bg-[#111b21] rounded-2xl p-6 shadow-sm space-y-4 border border-gray-100 dark:border-gray-800">
          <div>
            <label className="text-xs font-bold text-[#00a884] uppercase block mb-1">Job Title*</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. Senior Frontend Developer"
              className="w-full p-3 bg-gray-50 dark:bg-[#202c33] rounded-xl border-none focus:ring-2 focus:ring-[#00a884] dark:text-[#e9edef] outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#00a884] uppercase block mb-1">Company Name*</label>
            <input 
              type="text" 
              required
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              placeholder="Your company name"
              className="w-full p-3 bg-gray-50 dark:bg-[#202c33] rounded-xl border-none focus:ring-2 focus:ring-[#00a884] dark:text-[#e9edef] outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#00a884] uppercase block mb-1">Location</label>
              <input 
                type="text" 
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="City, Country"
                className="w-full p-3 bg-gray-50 dark:bg-[#202c33] rounded-xl border-none focus:ring-2 focus:ring-[#00a884] dark:text-[#e9edef] outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#00a884] uppercase block mb-1">Type</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full p-3 bg-gray-50 dark:bg-[#202c33] rounded-xl border-none focus:ring-2 focus:ring-[#00a884] dark:text-[#e9edef] outline-none appearance-none"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-[#00a884] uppercase block mb-1">Description*</label>
            <textarea 
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the role in detail..."
              className="w-full p-3 bg-gray-50 dark:bg-[#202c33] rounded-xl border-none focus:ring-2 focus:ring-[#00a884] dark:text-[#e9edef] h-32 resize-none outline-none"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-[#00a884] uppercase block">Job Summary (Short)</label>
              <button 
                type="button" 
                onClick={generateSummary}
                disabled={summarizing || !formData.description}
                className="text-[10px] bg-[#00a884]/10 text-[#00a884] px-2 py-1 rounded-lg font-bold hover:bg-[#00a884]/20 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {summarizing ? <CircleDashed className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Auto-Generate
              </button>
            </div>
            <textarea 
              value={formData.summary}
              onChange={(e) => setFormData({...formData, summary: e.target.value})}
              placeholder="A short summary that appears in the feed..."
              className="w-full p-3 bg-gray-50 dark:bg-[#202c33] rounded-xl border-none focus:ring-2 focus:ring-[#00a884] dark:text-[#e9edef] h-20 resize-none outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#00a884] uppercase block mb-1">Requirements (one per line)</label>
            <textarea 
              value={formData.requirements}
              onChange={(e) => setFormData({...formData, requirements: e.target.value})}
              placeholder="Requirement 1&#10;Requirement 2..."
              className="w-full p-3 bg-gray-50 dark:bg-[#202c33] rounded-xl border-none focus:ring-2 focus:ring-[#00a884] dark:text-[#e9edef] h-32 resize-none outline-none"
            />
          </div>
        </div>
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-[#00a884] text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <CircleDashed className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
          Post Job Now
        </button>
      </form>
    </div>
  );
};

const JobDetails = ({ job, user, applications, onBack, onApply, onFollow }: any) => {
  const application = applications.find((a: any) => a.jobId === job.id && a.seekerId === user.uid);
  const hasApplied = !!application;
  const isEmployer = job.employerId === user?.uid;
  const isFollowing = user?.followingEmployers?.includes(job.employerId);
  const jobApplicants = applications.filter((a: any) => a.jobId === job.id);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] dark:bg-[#0b141a]">
      <div className="bg-[#008069] dark:bg-[#202c33] text-white p-4 flex items-center gap-6 shadow-md fixed top-0 w-full z-10 transition-colors duration-300">
        <button onClick={onBack} className="p-1 transition-colors hover:bg-white/10 rounded-full"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium truncate">Job Details</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-20 pb-24 space-y-6 custom-scrollbar">
        <div className="bg-white dark:bg-[#111b21] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-[#00a884]/10 rounded-3xl flex items-center justify-center">
                <Briefcase className="w-10 h-10 text-[#00a884]" />
              </div>
              <div>
                <h1 className="text-2xl font-black dark:text-[#e9edef] leading-tight">{job.title}</h1>
                <p className="text-lg text-gray-500 font-medium flex items-center justify-center gap-2 mt-1">
                  <Building2 className="w-5 h-5 text-[#00a884]" />
                  {job.company}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">{job.type}</span>
                <span className="bg-green-100 dark:bg-green-900/30 text-[#00a884] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">{job.location}</span>
                {job.salary && <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">{job.salary}</span>}
              </div>
              
              {!isEmployer && (
                <button 
                  onClick={() => onFollow?.(job.employerId)}
                  className={cn(
                    "text-[10px] font-black uppercase px-4 py-2 rounded-full transition-all flex items-center gap-2",
                    isFollowing 
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-400"
                      : "bg-[#00a884] text-white shadow-md hover:scale-105"
                  )}
                >
                  {isFollowing ? "Following Employer" : <>Follow Employer <UserPlus className="w-4 h-4" /></>}
                </button>
              )}

              {isEmployer && (
                <div className="mt-2 text-xs font-bold text-[#00a884] uppercase bg-[#00a884]/5 px-4 py-2 rounded-xl">
                  {jobApplicants.length} Total Applicants
                </div>
              )}

              {hasApplied && (
                <div className="mt-2 text-xs font-bold uppercase px-4 py-2 rounded-xl flex items-center gap-2 bg-blue-50 text-blue-500 dark:bg-blue-900/20">
                  Application Status: <span className="font-black">{application.status}</span>
                </div>
              )}
           </div>

           <div className="mt-8 space-y-8">
              <div>
                <h3 className="font-bold text-[#111b21] dark:text-[#e9edef] mb-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                  <ClipboardList className="w-5 h-5 text-[#00a884]" />
                  About the Role
                </h3>
                <p className="text-sm text-gray-600 dark:text-[#d1d7db] leading-relaxed whitespace-pre-wrap">{job.description}</p>
              </div>

              {job.requirements && job.requirements.length > 0 && (
                <div>
                  <h3 className="font-bold text-[#111b21] dark:text-[#e9edef] mb-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                    <GraduationCap className="w-5 h-5 text-[#00a884]" />
                    Requirements
                  </h3>
                  <ul className="space-y-3">
                    {job.requirements.map((req: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-[#d1d7db]">
                        <div className="w-2 h-2 bg-[#00a884] rounded-full mt-1.5 flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
           </div>
        </div>
      </div>

      {!isEmployer && (
        <div className="fixed bottom-0 w-full p-4 bg-white/80 dark:bg-[#111b21]/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-10">
          <button 
            onClick={() => onApply(job)}
            disabled={hasApplied}
            className={cn(
              "w-full py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2",
              hasApplied ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed" : "bg-[#00a884] text-white hover:bg-[#008f6f]"
            )}
          >
            {hasApplied ? <CheckCheck className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
            {hasApplied ? "Applied - Check status above" : "Apply for this Job"}
          </button>
        </div>
      )}
    </div>
  );
};

const AdMobBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (Capacitor.getPlatform() === 'web') return;

    const showBanner = async () => {
      const options = {
        adId: 'ca-app-pub-8271489359179610/4964665647', // User's Android Banner ID
        adSize: BannerAdSize.BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: false,
      };

      try {
        await AdMob.showBanner(options);
        setIsVisible(true);
      } catch (e) {
        console.error("AdMob Banner Error:", e);
      }
    };

    // Delay a bit to ensure UI is settled
    const timer = setTimeout(showBanner, 2000);
    
    return () => {
      clearTimeout(timer);
      AdMob.removeBanner();
    };
  }, []);

  return null; // The banner is native overlay
};

const AffiliateDashboard = ({ user, onBack }: any) => {
  const [referrals, setReferrals] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      const q = query(collection(db, 'users'), where('referredBy', '==', user.uid));
      const snap = await getDocs(q);
      setReferrals(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
      setLoading(false);
    };
    fetchReferrals();
  }, [user.uid]);

  const affiliateLink = `${window.location.origin}?ref=${user.affiliateCode}`;

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a]">
      <div className="bg-[#008069] dark:bg-[#202c33] text-white p-4 flex items-center gap-6 shadow-md transition-colors duration-300">
        <button onClick={onBack} className="p-1 transition-colors hover:bg-white/10 rounded-full"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium">Affiliate Program</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-10">
        <div className="bg-white dark:bg-[#111b21] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
          <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-[#00a884]" />
          </div>
          <h3 className="text-xl font-bold dark:text-[#e9edef]">Invite and Earn</h3>
          <p className="text-sm text-gray-500 mt-2">Earn points for every new user you invite who joins Heart Connect!</p>
          
          <div className="mt-8 p-4 bg-gray-50 dark:bg-[#202c33] rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Your Unique Link</p>
            <p className="text-[10px] break-all font-mono dark:text-gray-300">{affiliateLink}</p>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(affiliateLink);
                alert("Affiliate link copied!");
              }}
              className="mt-4 w-full bg-[#00a884] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" /> Copy Link
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#111b21] p-6 rounded-3xl shadow-sm space-y-1 text-center border border-gray-100 dark:border-gray-800">
            <span className="text-3xl font-black text-[#00a884]">{user.referralCount || 0}</span>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Referrals</p>
          </div>
          <div className="bg-white dark:bg-[#111b21] p-6 rounded-3xl shadow-sm space-y-1 text-center border border-gray-100 dark:border-gray-800">
            <span className="text-3xl font-black text-blue-500">{user.points || 0}</span>
            <p className="text-[10px] font-bold text-gray-400 uppercase">My Points</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold dark:text-[#e9edef] mb-3 px-2 text-left">Referral History</h4>
          {loading ? (
            <div className="flex justify-center p-8"><CircleDashed className="w-6 h-6 animate-spin text-[#00a884]" /></div>
          ) : referrals.length === 0 ? (
            <div className="bg-white dark:bg-[#111b21] rounded-2xl p-8 text-center text-gray-500">No referrals yet. Share your link to get started!</div>
          ) : (
            <div className="bg-white dark:bg-[#111b21] rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-gray-800">
              {referrals.map(r => (
                <div key={r.uid} className="p-4 flex items-center gap-3">
                  <Avatar src={r.photoURL} name={r.displayName} size={40} />
                  <div className="flex-1 text-left">
                    <h5 className="text-sm font-bold dark:text-[#e9edef]">{r.displayName}</h5>
                    <p className="text-[10px] text-gray-400">Joined via your link</p>
                  </div>
                  <div className="text-xs font-bold text-green-500">+Bonus</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const JobQualificationModal = ({ job, onApply, onCancel }: any) => {
  const [qualifications, setQualifications] = useState({
    oLevel: '',
    aLevel: '',
    tertiary: ''
  });

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-[#202c33] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6">
          <h3 className="text-xl font-bold dark:text-[#e9edef] mb-2">Qualifications</h3>
          <p className="text-xs text-gray-500 mb-6">Optional: Add your educational background to stand out.</p>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">O Level Qualifications</label>
              <textarea 
                value={qualifications.oLevel} 
                onChange={(e) => setQualifications({...qualifications, oLevel: e.target.value})}
                placeholder="List your subjects and grades..."
                className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl dark:text-[#e9edef] text-sm h-20 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">A Level Qualifications</label>
              <textarea 
                value={qualifications.aLevel} 
                onChange={(e) => setQualifications({...qualifications, aLevel: e.target.value})}
                placeholder="List your subjects and grades..."
                className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl dark:text-[#e9edef] text-sm h-20 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tertiary Education</label>
              <textarea 
                value={qualifications.tertiary} 
                onChange={(e) => setQualifications({...qualifications, tertiary: e.target.value})}
                placeholder="Degree, Diploma, Institution..."
                className="w-full bg-gray-50 dark:bg-[#2a3942] border-none p-3 rounded-xl dark:text-[#e9edef] text-sm h-20 outline-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                onClick={onCancel}
                className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={() => onApply(job, qualifications)}
                className="flex-[2] py-3 text-sm font-bold text-white bg-[#00a884] rounded-xl shadow-lg"
              >
                Submit Application
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
