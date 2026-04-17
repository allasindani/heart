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
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
import { cn, formatWhatsAppTime } from './lib/utils';
import { COUNTRIES } from './constants';
import imageCompression from 'browser-image-compression';
import { GoogleGenAI } from "@google/genai";
import { User, Chat, Message, Post, Status, Notification as AppNotification, PostComment, AppSettings, PaymentProof, Job, JobApplication } from './types';

// --- Gemini Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Error Handling ---
enum OperationType { CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write' }
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Firestore Error: ', JSON.stringify({ error: error instanceof Error ? error.message : String(error), operationType, path }));
}

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

const SplashScreen = ({ siteName, logoUrl }: { siteName?: string, logoUrl?: string }) => (
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
    </motion.div>
    <div className="absolute bottom-12 flex flex-col items-center gap-1">
      <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">Powered by</p>
      <p className="text-sm font-bold text-[#00a884]">{siteName || "Heart Connect"}</p>
    </div>
  </div>
);

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
  const [error, setError] = useState('');

  const handleGoogleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
  
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
        <Logo size={60} className="mx-auto mb-6" url={settings?.logoUrl} />
        <h2 className="text-3xl font-black mb-2 text-[#111b21] tracking-tighter">{settings?.siteName || "Heart Connect"}</h2>
        <p className="text-gray-500 mb-8 font-medium">Connecting Hearts, One Chat at a Time</p>
        
        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#00a884]/20"
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#00a884]/20"
            required
          />
          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
          <button type="submit" className="w-full bg-[#00a884] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#00a884]/20 active:scale-95 transition-all">
            {isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-[1px] bg-gray-200"></div>
          <span className="text-xs text-gray-400 uppercase font-bold">OR</span>
          <div className="flex-1 h-[1px] bg-gray-200"></div>
        </div>

        <button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 mb-4 hover:bg-gray-50">
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" referrerPolicy="no-referrer" />
          Continue with Google
        </button>

        <button 
          onClick={() => setIsLogin(!isLogin)} 
          className="text-[#00a884] text-sm font-bold hover:underline"
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
        </button>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Featured Singles Online</h3>
          <div className="flex justify-center gap-4">
            {[
              { city: 'Bulawayo', age: 25, seed: 'zim1' },
              { city: 'Harare', age: 30, seed: 'zim2' },
              { city: 'Gweru', age: 35, seed: 'zim3' }
            ].map((s) => (
              <div key={s.seed} className="relative">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.seed}&gender=female&top=longHair,bob,curly`} 
                  className="w-12 h-12 rounded-full border-2 border-white shadow-sm" 
                  alt={s.city} 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                <div className="text-[8px] font-bold text-gray-500 mt-1">{s.city}</div>
              </div>
            ))}
          </div>
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
  const [viewingUser, setViewingUser] = useState<User | null>(null);
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
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

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
    const q = query(collection(db, 'users'), limit(300));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => {
        const data = d.data();
        return { 
          uid: d.id, 
          ...data,
          displayName: capitalizeName(data.displayName || '')
        } as User;
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const { getDoc } = await import('firebase/firestore');
          const userSnap = await getDoc(userDocRef);
          
          let userData: User;
          if (userSnap.exists()) {
            const data = userSnap.data();
            userData = { 
              uid: firebaseUser.uid, 
              ...data,
              displayName: capitalizeName(data.displayName || '')
            } as User;
            // Update online status
            await updateDoc(userDocRef, { isOnline: true, lastSeen: serverTimestamp() });
            userData.isOnline = true;
            
            // Set default dating filters based on gender
            if (userData.datingProfile?.gender) {
              setDatingFilters(prev => ({
                ...prev,
                gender: userData.datingProfile?.gender === 'male' ? 'female' : 'male'
              }));
            }
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
            try { await setDoc(userDocRef, userData, { merge: true }); } catch (e) { handleFirestoreError(e, OperationType.WRITE, `users/${firebaseUser.uid}`); }
          }
          setUser(userData);
        } else { setUser(null); }
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
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=harare1&gender=female',
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
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=harare2&gender=female',
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
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=harare3&gender=female',
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
  }, [selectedChat, showProfile, showAdmin, viewingUser, showNotifications, showUpgrade, showLeaderboard, showCreateAd, showCreateJob, selectedJob]);

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

  const handleApplyJob = async (job: Job) => {
    if (!user) return;
    try {
      const existing = applications.find(a => a.jobId === job.id && a.seekerId === user.uid);
      if (existing) return alert("You already applied!");

      await addDoc(collection(db, 'applications'), {
        jobId: job.id,
        employerId: job.employerId,
        seekerId: user.uid,
        seekerName: user.displayName,
        seekerPhoto: user.photoURL || '',
        status: 'applied',
        timestamp: serverTimestamp()
      });

      // Notify Employer
      await addDoc(collection(db, 'notifications'), {
        userId: job.employerId,
        fromId: user.uid,
        fromName: user.displayName,
        type: 'job_update',
        text: `New application for "${job.title}"`,
        read: false,
        timestamp: serverTimestamp(),
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
      
      await addDoc(collection(db, 'notifications'), {
        userId: app.seekerId,
        fromId: user?.uid || 'system',
        fromName: user?.displayName || 'Employer',
        type: 'job_update',
        text: `Application for "${job?.title || 'Job'}" updated to: ${status}`,
        read: false,
        timestamp: serverTimestamp(),
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
    if (appSettings.siteName) {
      document.title = appSettings.siteName;
    }
    if (appSettings.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = appSettings.faviconUrl;
    }
  }, [appSettings]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat))), (e) => handleFirestoreError(e, OperationType.LIST, 'chats'));
  }, [user?.uid]);

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

  if (loading) return <SplashScreen siteName={appSettings?.siteName} logoUrl={appSettings?.logoUrl} />;
  if (!user) return <AuthScreen settings={appSettings} />;

  if (user.suspended) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white p-8 text-center">
      <ShieldAlert className="w-16 h-16 text-red-500 mb-6" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h1>
      <p className="text-gray-500 mb-8">Your account has been suspended for violating our terms of service. If you believe this is a mistake, please contact support.</p>
      <button onClick={() => auth.signOut()} className="bg-[#00a884] text-white px-8 py-3 rounded-full font-bold shadow-lg">Sign Out</button>
    </div>
  );

  const sendMessage = async (text: string, type: string = 'text') => {
    if (!selectedChat || !text.trim()) return;
    
    // Scramble phone numbers
    const scrambledText = text.replace(/\d{8,}/g, (match) => {
      return match.split('').sort(() => Math.random() - 0.5).join('');
    });

    const msgData = { 
      chatId: selectedChat.id, 
      senderId: user.uid, 
      text: scrambledText, 
      type, 
      timestamp: serverTimestamp(), 
      status: 'sent' 
    };

    // Parallelize writes for better performance and reduced latency
    const messagePromise = addDoc(collection(db, `chats/${selectedChat.id}/messages`), msgData);
    
    const chatUpdatePromise = updateDoc(doc(db, 'chats', selectedChat.id), { 
      lastMessage: { 
        text: type === 'text' ? scrambledText : `Sent an ${type}`, 
        senderId: user.uid, 
        timestamp: serverTimestamp(),
        status: 'sent'
      }, 
      updatedAt: serverTimestamp() 
    });

    const otherId = selectedChat.participants.find(p => p !== user.uid);
    let notificationPromise: Promise<any> = Promise.resolve();
    if (otherId) {
      notificationPromise = addDoc(collection(db, 'notifications'), {
        userId: otherId,
        fromId: user.uid,
        fromName: user.displayName,
        type: 'message',
        text: `sent you a message: ${scrambledText.substring(0, 30)}${scrambledText.length > 30 ? '...' : ''}`,
        read: false,
        timestamp: serverTimestamp(),
        relatedId: selectedChat.id
      });
      
      // If phone number was detected, send warning notification
      if (text !== scrambledText) {
        addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          fromId: 'system',
          fromName: 'Heart Connect',
          type: 'message',
          text: 'Please Use Heart Connect for chats. Phone numbers are scrambled for your safety.',
          read: false,
          timestamp: serverTimestamp()
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
    <div className="h-screen bg-white flex flex-col overflow-hidden max-w-md mx-auto shadow-2xl border-x border-gray-200 relative">
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
        <div className="absolute inset-0 z-50 bg-[#efeae2] flex flex-col">
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
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] flex flex-col h-screen overflow-hidden">
          <AdminDashboard user={user} onBack={() => setShowAdmin(false)} />
        </div>
      ) : viewingUser ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] flex flex-col">
          <UserProfileView user={user} targetUser={viewingUser} onBack={() => setViewingUser(null)} onStartChat={(chat) => { setViewingUser(null); setSelectedChat(chat); }} />
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
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* App Header */}
          <div className="bg-[#008069] text-white p-4 pb-2 shadow-md relative z-30">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <Logo size={32} className="shadow-none" url={appSettings?.logoUrl} />
                <h1 className="text-xl font-black tracking-tighter">{appSettings?.siteName || "Heart Connect"}</h1>
              </div>
              <div className="flex gap-5 items-center">
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
          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#111b21] overscroll-contain scroll-smooth custom-scrollbar">
            {activeTab === 'chats' && (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {chats.length === 0 ? (
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
                    const chatName = chat.groupName || otherUser?.displayName || "Chat";
                    const chatPhoto = otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`;
                    
                    return (
                      <div key={chat.id} onClick={() => setSelectedChat(chat)} className="flex items-center gap-4 p-4 active:bg-gray-100 transition-colors cursor-pointer">
                        <img 
                          src={chatPhoto} 
                          className="w-14 h-14 rounded-full object-cover" 
                          alt="Chat" 
                          referrerPolicy="no-referrer" 
                          onError={handleImageError}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <h3 className="font-bold text-[#111b21] truncate flex items-center gap-1">
                              {chatName}
                              <TierBadge tier={otherUser?.category} size={14} />
                              {otherUser?.isVerified && <VerifiedBadge size={14} />}
                            </h3>
                            <span className="text-xs text-[#667781]">{chat.updatedAt?.toDate ? formatWhatsAppTime(chat.updatedAt.toDate()) : ''}</span>
                          </div>
                          <p className="text-[14px] text-[#667781] truncate flex items-center gap-1">
                            {chat.lastMessage?.senderId === user.uid && (
                              chat.lastMessage.status === 'sent' ? (
                                <Check className="w-4 h-4 text-[#8696a0]" />
                              ) : (
                                <CheckCheck className={cn("w-4 h-4", chat.lastMessage.status === 'seen' ? "text-[#53bdeb]" : "text-[#8696a0]")} />
                              )
                            )}
                            {chat.lastMessage?.text || "Start a conversation"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
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
            className="absolute bottom-6 right-6 w-14 h-14 bg-[#00a884] rounded-full shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform z-40"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-6 rounded-3xl shadow-2xl max-w-xs w-full text-center">
            <LogOut className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Exit App?</h3>
            <p className="text-gray-500 text-sm mb-6">Are you sure you want to exit Heart Connect?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
              <button onClick={() => window.close()} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">Exit</button>
            </div>
          </motion.div>
        </div>
      )}
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
      <div className="bg-[#008069] text-white p-3 flex items-center gap-2 shadow-md cursor-pointer" onClick={() => otherUser && onUserClick(otherUser)}>
        <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <img 
          src={otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`} 
          className="w-10 h-10 rounded-full" 
          alt="Chat" 
          referrerPolicy="no-referrer" 
          onError={handleImageError}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold truncate flex items-center gap-1">
            {otherUser?.displayName || chat.groupName || "Chat"}
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
              otherUser?.lastSeen?.toDate ? `last seen ${formatWhatsAppTime(otherUser.lastSeen.toDate())}` : 'offline'
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
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] dark:bg-none dark:bg-[#0b141a] bg-repeat custom-scrollbar"
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
                  className="rounded-lg max-w-full h-auto mb-1" 
                  alt="Sent" 
                  referrerPolicy="no-referrer" 
                  onError={handleImageError}
                />
              ) : msg.type === 'video' ? (
                <video src={msg.text} controls className="rounded-lg max-w-full h-auto mb-1" />
              ) : (
                <p className="text-[15px] text-[#111b21] dark:text-[#e9edef] pr-12 leading-relaxed">{msg.text}</p>
              )}
              
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="absolute -bottom-2 right-2 flex -space-x-1 bg-white dark:bg-[#202c33] rounded-full shadow-sm border border-gray-100 dark:border-gray-800 px-1.5 py-0.5 z-10 animate-in zoom-in-50">
                  {Object.entries(msg.reactions).map(([uid, emoji]: any) => (
                    <span key={uid} className="text-[11px] drop-shadow-sm">{emoji}</span>
                  ))}
                </div>
              )}

              <div className="absolute bottom-1 right-1.5 flex items-center gap-1">
                <span className="text-[10px] text-[#667781] dark:text-[#8696a0] uppercase">{msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</span>
                {msg.senderId === user.uid && (
                  msg.status === 'sent' ? (
                    <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                  ) : (
                    <CheckCheck className={cn("w-3.5 h-3.5", msg.status === 'seen' ? "text-[#53bdeb]" : "text-[#8696a0]")} />
                  )
                )}
              </div>
            </div>
          </div>
        ))}
        {uploading && <div className="flex justify-center"><CircleDashed className="w-6 h-6 animate-spin text-[#00a884]" /></div>}
      </div>
      <div className="bg-[#f0f2f5] dark:bg-[#111b21] p-2 pb-6 flex items-center gap-2">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*" />
        <div className="bg-white dark:bg-[#2a3942] flex-1 flex items-center px-3 py-2 rounded-full shadow-sm max-w-[calc(100%-60px)]">
          <Smile className="w-6 h-6 text-gray-500 dark:text-[#8696a0] mr-2 shrink-0" />
          <input 
            type="text" 
            value={input} 
            onChange={(e) => handleTyping(e.target.value)} 
            placeholder="Message" 
            className="flex-1 bg-transparent border-none outline-none text-[16px] dark:text-[#e9edef] w-full" 
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

const StatusAndWallView = ({ user, statuses, posts, jobs, onUserClick, awardPoints, appSettings, showStatusModal, setShowStatusModal, showPostModal, setShowPostModal, setShowCreateAd, setAdContent, setAdMediaUrl, setUploading, setUploadProgress, setUser, uploading, usersMap, onSelectJob, onFollowEmployer }: any) => {
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
        await addDoc(collection(db, 'notifications'), {
          userId: post.userId,
          fromId: user.uid,
          fromName: user.displayName,
          type: 'like',
          text: 'liked your post',
          read: false,
          timestamp: serverTimestamp()
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

    await addDoc(collection(db, 'posts'), { 
      userId: user.uid, 
      content: newPost, 
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
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer" onClick={() => setShowStatusModal(true)}>
            <div className="relative">
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-800" 
                alt="Me" 
                referrerPolicy="no-referrer" 
                onError={handleImageError}
              />
              <div className="absolute bottom-0 right-0 bg-[#00a884] rounded-full p-1 border-2 border-white dark:border-[#111b21]"><Plus className="w-3 h-3 text-white" /></div>
            </div>
            <span className="text-xs text-gray-600 dark:text-[#8696a0]">My Status</span>
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
                  <div className="p-0.5 rounded-full border-2 border-[#00a884]">
                    <img 
                      src={statusUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.userId}`} 
                      className="w-16 h-16 rounded-full border-2 border-white dark:border-[#111b21]" 
                      alt="User" 
                      referrerPolicy="no-referrer" 
                      onError={handleImageError}
                    />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-[#8696a0] truncate w-16 text-center flex items-center justify-center gap-0.5">
                    {statusUser?.displayName || "User"}
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
                            "flex-1 py-2 rounded-xl text-sm font-bold transition-all border-2",
                            statusDuration === d ? "bg-[#00a884] border-[#00a884] text-white shadow-md" : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
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
                      className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
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
      <div className="p-4 space-y-6 pb-24">
        <div className="bg-white dark:bg-[#111b21] p-5 rounded-3xl shadow-md border border-gray-100 dark:border-gray-800 transition-all hover:shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              className="w-10 h-10 rounded-full" 
              alt="Me" 
              referrerPolicy="no-referrer" 
              onError={handleImageError}
            />
            <div className="flex-1 bg-gray-50 dark:bg-[#2a3942] rounded-full px-4 py-2 text-gray-400 text-sm cursor-pointer" onClick={() => setShowPostModal(true)}>
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
                      <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-10 h-10 rounded-full" alt="Me" />
                      <div>
                        <div className="font-bold text-sm dark:text-white">{user.displayName}</div>
                        <div className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full w-fit">Public</div>
                      </div>
                    </div>

                    <textarea 
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder="Share what's happening..."
                      className="w-full bg-transparent border-none outline-none text-lg dark:text-[#e9edef] resize-none h-40 focus:ring-0"
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
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-green-500">
                          <ImageIcon className="w-6 h-6" />
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-red-500">
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
              <div key={post.id} className="bg-white dark:bg-[#111b21] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => onUserClick({ uid: post.userId, displayName: postAuthor?.displayName, photoURL: postAuthor?.photoURL })}>
                  <img 
                    src={postAuthor?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`} 
                    className="w-10 h-10 rounded-full" 
                    alt="User" 
                    referrerPolicy="no-referrer" 
                    onError={handleImageError}
                  />
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
                <div className="px-4 pb-4 text-[15px] text-[#111b21] dark:text-[#e9edef] leading-relaxed">
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
                      <img src={adAuthor?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentAd.userId}`} className="w-8 h-8 rounded-full" alt="Ad" referrerPolicy="no-referrer" />
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
      </div>

      {showComments && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Comments</h3>
              <button onClick={() => setShowComments(null)} className="p-2 bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <img src={c.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userId}`} className="w-8 h-8 rounded-full" alt="User" referrerPolicy="no-referrer" />
                  <div className="flex-1 bg-gray-50 p-3 rounded-2xl">
                    <h4 className="font-bold text-xs mb-1">{c.userName}</h4>
                    <p className="text-sm text-gray-700">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
              <input 
                type="text" 
                value={commentInput} 
                onChange={(e) => setCommentInput(e.target.value)} 
                placeholder="Write a comment..." 
                className="flex-1 bg-gray-50 px-4 py-2 rounded-full outline-none focus:ring-2 focus:ring-[#00a884]/20"
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button onClick={handleAddComment} className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center text-white"><Send className="w-5 h-5" /></button>
            </div>
          </motion.div>
        </div>
      )}

      {editingPost && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Edit Post</h3>
              <button onClick={() => setEditingPost(null)} className="p-2 bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <textarea 
                value={editContent} 
                onChange={(e) => setEditContent(e.target.value)} 
                className="w-full bg-gray-50 border-none outline-none p-4 rounded-2xl text-[15px] resize-none h-40 mb-4"
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const hasGender = user.datingProfile?.gender && user.datingProfile.gender !== '';

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'user'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const users = snapshot.docs
          .map(doc => ({ uid: doc.id, ...doc.data() } as User))
          .filter(u => u.uid !== user.uid && u.datingProfile && u.photoURL);
        
        // Apply filters locally for better flexibility
        const filtered = users.filter(u => {
          const profile = u.datingProfile!;
          const ageMatch = profile.age >= filters.minAge && profile.age <= filters.maxAge;
          const genderMatch = filters.gender === 'all' || profile.gender === filters.gender;
          const searchMatch = !searchQuery || u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || profile.bio.toLowerCase().includes(searchQuery.toLowerCase());
          
          // Basic distance calculation if both have location
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

          return ageMatch && genderMatch && distanceMatch && searchMatch;
        });

        setDiscoverUsers(filtered);
      } catch (error) {
        console.error("Error fetching dating users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user.uid, filters, searchQuery]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleNext = () => {
    if (currentIndex < discoverUsers.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleLike = async () => {
    if (!user) return;
    
    const limits = {
      General: 1,
      Bronze: 3,
      Silver: 10,
      Gold: Infinity,
      Platinum: Infinity
    };
    const currentLimit = limits[user.category as keyof typeof limits] || limits.General;
    if ((user.matchCount || 0) >= currentLimit) {
      alert(`You have reached your match limit for ${user.category} tier. Please upgrade to match with more people!`);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const { increment } = await import('firebase/firestore');
    await updateDoc(userDocRef, { matchCount: increment(1) });
    setUser(prev => prev ? { ...prev, matchCount: (prev.matchCount || 0) + 1 } : null);
    handleNext();
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><CircleDashed className="w-8 h-8 animate-spin text-[#00a884]" /></div>;

  const currentUser = discoverUsers[currentIndex];

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#f0f2f5] dark:bg-[#0b141a] relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-[#111b21] dark:text-[#e9edef]">Discover</h2>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 bg-white dark:bg-[#202c33] rounded-full shadow-sm text-[#00a884]"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-[#202c33] p-4 rounded-2xl shadow-lg mb-4 space-y-4 z-20"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Min Age</label>
                <input 
                  type="number" 
                  value={filters.minAge} 
                  onChange={(e) => onUpdateFilters({...filters, minAge: Number(e.target.value)})}
                  className="w-full border-b border-gray-200 dark:border-gray-800 py-1 outline-none dark:bg-transparent dark:text-[#e9edef]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Max Age</label>
                <input 
                  type="number" 
                  value={filters.maxAge} 
                  onChange={(e) => onUpdateFilters({...filters, maxAge: Number(e.target.value)})}
                  className="w-full border-b border-gray-200 dark:border-gray-800 py-1 outline-none dark:bg-transparent dark:text-[#e9edef]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Gender Preference</label>
              <select 
                value={filters.gender} 
                onChange={(e) => onUpdateFilters({...filters, gender: e.target.value})}
                className="w-full border-b border-gray-200 dark:border-gray-800 py-1 outline-none bg-transparent dark:text-[#e9edef]"
              >
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Max Distance ({filters.maxDistance}km)</label>
              <input 
                type="range" 
                min="1" 
                max="500" 
                value={filters.maxDistance} 
                onChange={(e) => onUpdateFilters({...filters, maxDistance: Number(e.target.value)})}
                className="w-full accent-[#00a884]"
              />
            </div>
            <button 
              onClick={() => setShowFilters(false)}
              className="w-full bg-[#00a884] text-white py-2 rounded-xl font-bold"
            >
              Apply Filters
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasGender && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 p-4 rounded-2xl mb-4 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-yellow-600" />
          <div className="flex-1">
            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-200">Complete Your Profile</p>
            <p className="text-[10px] text-yellow-700 dark:text-yellow-300">Set your gender to get better matches.</p>
          </div>
          <button onClick={onOpenProfile} className="text-xs font-bold text-yellow-800 dark:text-yellow-200 underline">Update</button>
        </div>
      )}

      {discoverUsers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <Heart className="w-16 h-16 text-gray-200 dark:text-gray-800 mb-4" />
          <p className="text-gray-500 dark:text-[#8696a0]">No matches found with current filters. Try expanding your search!</p>
        </div>
      ) : (
        <div className="max-w-sm w-full mx-auto bg-white dark:bg-[#202c33] rounded-[40px] shadow-2xl overflow-hidden h-[480px] flex flex-col relative border-4 border-white dark:border-[#202c33]">
          <div className="flex-1 bg-gray-200 dark:bg-gray-800 relative">
            <img 
              src={currentUser.photoURL || `https://picsum.photos/seed/${currentUser.uid}/400/600`} 
              className="w-full h-full object-cover" 
              alt={currentUser.displayName} 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl font-bold flex items-center gap-1">
                  {currentUser.displayName}, {currentUser.datingProfile?.age}
                  <TierBadge tier={currentUser.category} size={20} />
                  {currentUser.isVerified && <VerifiedBadge size={20} />}
                </h3>
                {currentUser.isOnline && (
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
                )}
              </div>
              <p className="text-xs opacity-90 leading-relaxed line-clamp-2">{currentUser.datingProfile?.bio}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {currentUser.datingProfile?.city && (
                  <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider">
                    {currentUser.datingProfile.city}
                  </span>
                )}
                {currentUser.datingProfile?.interests?.slice(0, 2).map(tag => (
                  <span key={tag} className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="p-6 flex justify-center gap-10 bg-white dark:bg-[#202c33] border-t border-gray-50 dark:border-gray-800">
            <button onClick={handleNext} className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 hover:scale-110 active:scale-95 transition-all shadow-xl border-4 border-white dark:border-[#202c33]"><X className="w-8 h-8" /></button>
            <button onClick={() => onUserClick(currentUser)} className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 hover:scale-110 active:scale-95 transition-all shadow-xl border-4 border-white dark:border-[#202c33]"><UserIcon className="w-8 h-8" /></button>
            <button onClick={handleLike} className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-[#00a884] hover:scale-110 active:scale-95 transition-all shadow-xl border-4 border-white dark:border-[#202c33]"><Heart className="w-8 h-8 fill-current" /></button>
          </div>
        </div>
      )}
    </div>
  );
};

const UserProfileView = ({ user, targetUser, onBack, onStartChat }: any) => {
  const [fullUser, setFullUser] = useState<User | null>(null);
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
    await addDoc(collection(db, 'friend_requests'), {
      fromId: user.uid,
      toId: fullUser.uid,
      status: 'pending',
      timestamp: serverTimestamp()
    });
    await addDoc(collection(db, 'notifications'), {
      userId: fullUser.uid,
      fromId: user.uid,
      fromName: user.displayName,
      type: 'friend_request',
      text: 'sent you a friend request',
      read: false,
      timestamp: serverTimestamp()
    });
    setRequestStatus('pending');
  };

  const handleStartChat = async () => {
    if (!fullUser) return;
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
  };

  if (!fullUser) return <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#0b141a]"><CircleDashed className="w-8 h-8 animate-spin text-[#00a884]" /></div>;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0b141a]">
      <div className="relative h-72">
        <img 
          src={fullUser.photoURL || `https://picsum.photos/seed/${fullUser.uid}/600/800`} 
          className="w-full h-full object-cover" 
          alt={fullUser.displayName} 
          referrerPolicy="no-referrer" 
          onError={handleImageError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-black/20 backdrop-blur-md rounded-full text-white"><ChevronLeft className="w-6 h-6" /></button>
        <div className="absolute bottom-6 left-6 text-white">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            {fullUser.displayName}
            <TierBadge tier={fullUser.category} size={24} />
            {fullUser.isVerified && <VerifiedBadge size={24} />}
          </h2>
          <p className="opacity-80 flex items-center gap-2">
            {fullUser.isOnline ? <span className="w-2 h-2 bg-green-500 rounded-full"></span> : null}
            {fullUser.isOnline ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>
      <div className="p-6 space-y-6">
        <div className="flex gap-4">
          {requestStatus === 'none' && (
            <button onClick={sendFriendRequest} className="flex-1 bg-[#00a884] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
              <UserPlus className="w-5 h-5" /> Add Friend
            </button>
          )}
          {requestStatus === 'pending' && (
            <button disabled className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
              <CircleDashed className="w-5 h-5 animate-spin" /> Request Sent
            </button>
          )}
          {requestStatus === 'accepted' && (
            <button disabled className="flex-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
              <UserCheck className="w-5 h-5" /> Friends
            </button>
          )}
          <button onClick={handleStartChat} className="flex-1 border-2 border-[#00a884] text-[#00a884] py-3 rounded-xl font-bold flex items-center justify-center gap-2">
            <MessageSquare className="w-5 h-5" /> Message
          </button>
        </div>
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">About</h4>
          <p className="text-gray-700 dark:text-[#e9edef] leading-relaxed">{fullUser.datingProfile?.bio || fullUser.status || "No bio available."}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-[#111b21] p-3 rounded-xl">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Age</span>
              <span className="font-bold dark:text-[#e9edef]">{fullUser.datingProfile?.age || 'N/A'}</span>
            </div>
            <div className="bg-gray-50 dark:bg-[#111b21] p-3 rounded-xl">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Location</span>
              <span className="font-bold dark:text-[#e9edef]">{fullUser.datingProfile?.city || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationCenter = ({ user, notifications, usersMap, onBack, onNavigate }: any) => {
  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    if (n.type === 'message' && n.relatedId) {
      onNavigate('chat', n.relatedId);
    } else if (n.type === 'friend_request') {
      onNavigate('dating', null); // Or a specific friend requests view if we had one
    } else if (n.type === 'like' || n.type === 'comment') {
      onNavigate('status', null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a]">
      <div className="bg-[#008069] text-white p-4 flex items-center gap-6 shadow-md">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium">Notifications</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-[#8696a0]">No notifications yet.</div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => handleNotificationClick(n)}
              className={cn("bg-white dark:bg-[#111b21] p-4 rounded-2xl shadow-sm flex items-center gap-4 border-l-4 transition-all cursor-pointer", n.read ? "border-transparent opacity-70" : "border-[#00a884]")}
            >
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-[#00a884]">
                {n.type === 'like' && <ThumbsUp className="w-6 h-6" />}
                {n.type === 'message' && <MessageSquare className="w-6 h-6" />}
                {n.type === 'friend_request' && <UserPlus className="w-6 h-6" />}
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
            </div>
          ))
        )}
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
      <div className="bg-[#008069] text-white p-4 flex items-center gap-6 shadow-md">
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
      <div className="bg-[#008069] text-white p-4 flex items-center gap-6 shadow-md shrink-0">
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
                <button 
                  onClick={() => handleNotifyPayment(tier)}
                  disabled={uploading}
                  className="w-full bg-[#00a884] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#00a884]/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? <CircleDashed className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  Upgrade Now
                </button>
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
    <div className="flex-1 flex flex-col bg-[#f0f2f5]">
      <div className="bg-[#008069] text-white p-4 flex items-center gap-6 shadow-md">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium">Points Leaderboard</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-20"><CircleDashed className="w-8 h-8 animate-spin text-[#00a884]" /></div>
        ) : (
          leaders.map((u, i) => (
            <div key={u.uid} className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-700" : i === 2 ? "bg-orange-100 text-orange-700" : "text-gray-400")}>
                {i + 1}
              </div>
              <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-12 h-12 rounded-full" alt="User" referrerPolicy="no-referrer" />
              <div className="flex-1">
                <h4 className="font-bold text-[#111b21] flex items-center gap-1">
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
  const [activeTab, setActiveTab] = useState<'users' | 'ads' | 'config' | 'branding' | 'payments' | 'vaccancies'>('users');
  const [ads, setAds] = useState<Post[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [paymentProofs, setPaymentProofs] = useState<PaymentProof[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [uSnap, pSnap, sSnap, paySnap, jSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'posts')),
        getDocs(collection(db, 'settings')),
        getDocs(collection(db, 'payment_proofs')),
        getDocs(collection(db, 'jobs'))
      ]);

      const uList = uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
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
      setLoading(false);
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
    <div className="flex-1 flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a]">
      <div className="bg-[#111b21] text-white p-4 flex items-center gap-6 shadow-md">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium flex items-center gap-2"><Shield className="w-5 h-5 text-[#00a884]" /> Admin Dashboard</h2>
      </div>
      
      <div className="flex bg-white dark:bg-[#111b21] border-b border-gray-100 dark:border-gray-800">
        {['users', 'ads', 'config', 'branding', 'payments', 'vaccancies'].map((t) => (
          <button 
            key={t}
            onClick={() => setActiveTab(t as any)}
            className={cn("flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2", activeTab === t ? "border-[#00a884] text-[#00a884]" : "border-transparent text-gray-400 dark:text-[#8696a0]")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40 scroll-smooth custom-scrollbar">
        {activeTab === 'users' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-[#111b21] p-4 rounded-2xl shadow-sm text-center">
                <UserIcon className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <div className="text-xl font-bold dark:text-[#e9edef]">{stats.totalUsers}</div>
                <div className="text-[10px] text-gray-400 dark:text-[#8696a0] uppercase font-bold">Users</div>
              </div>
              <div className="bg-white dark:bg-[#111b21] p-4 rounded-2xl shadow-sm text-center">
                <BarChart3 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <div className="text-xl font-bold dark:text-[#e9edef]">{stats.totalPoints}</div>
                <div className="text-[10px] text-gray-400 dark:text-[#8696a0] uppercase font-bold">Total Points</div>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white dark:bg-[#111b21] p-4 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-700 dark:text-[#e9edef] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#00a884]" />
                  System Status
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#00a884] uppercase">
                  <div className="w-2 h-2 bg-[#00a884] rounded-full animate-pulse" />
                  Online
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[11px]">
                <div className="space-y-1">
                  <p className="text-gray-400 dark:text-[#8696a0] uppercase font-bold">Server</p>
                  <p className="font-bold dark:text-[#e9edef]">Production Node</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 dark:text-[#8696a0] uppercase font-bold">Storage</p>
                  <p className="font-bold dark:text-[#e9edef]">NVMe</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 dark:text-[#8696a0] uppercase font-bold">Node Version</p>
                  <p className="font-bold dark:text-[#e9edef]">v24.14.1</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 dark:text-[#8696a0] uppercase font-bold">Features</p>
                  <p className="font-bold dark:text-[#e9edef]">Reels, Chat, Dating</p>
                </div>
              </div>
            </div>

            {/* User Management */}
            <div className="bg-white dark:bg-[#111b21] rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="font-bold text-gray-700 dark:text-[#e9edef]">User Management</h3>
                <SettingsIcon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-[500px] overflow-y-auto custom-scrollbar">
                {users.map(u => (
                  <div key={u.uid} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-10 h-10 rounded-full" alt="User" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate dark:text-[#e9edef] flex items-center gap-1">
                          {u.displayName}
                          {u.isVerified && <VerifiedBadge size={14} />}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 dark:text-[#8696a0] uppercase font-bold">{u.role}</span>
                          <span className="text-[10px] text-[#00a884] font-bold">{u.points} pts</span>
                        </div>
                      </div>
                      <button onClick={() => setEditingUser(u)} className="p-2 text-gray-400 hover:text-[#00a884]"><SettingsIcon className="w-4 h-4" /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select 
                        value={u.category} 
                        onChange={(e) => setUserCategory(u, e.target.value)}
                        className="text-[10px] font-bold bg-gray-50 dark:bg-[#2a3942] border-none rounded-full px-2 py-1 outline-none dark:text-[#e9edef]"
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
                        onClick={() => deleteUser(u)}
                        className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

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
                        <img src={usersMap[ad.userId]?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ad.userId}`} className="w-8 h-8 rounded-full" alt="Ad" referrerPolicy="no-referrer" />
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
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [jobRole, setJobRole] = useState(user.jobRole || 'seeker');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const compressAndUpload = async (file: File) => {
    setUploading(true);
    try {
      console.log("Starting profile photo upload:", file.name, "Size:", file.size);
      const compressedFile = await compressImage(file);
      console.log("Compressed size:", compressedFile.size);
      
      const url = await uploadFileToServer(compressedFile);
      console.log("Profile upload complete, URL:", url);
      
      setPhotoURL(url);
      alert("Photo uploaded successfully! Click Save to persist changes.");
    } catch (error: any) {
      console.error("Profile upload error details:", error);
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
        status,
        jobRole,
        datingProfile: {
          ...user.datingProfile,
          bio: datingBio,
          age: Number(datingAge),
          gender,
          country,
          city
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
      <div className="bg-[#008069] text-white p-4 flex items-center gap-6 shadow-md">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium">Edit Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col items-center py-8 bg-white dark:bg-[#111b21] mb-6">
          <div className="relative group">
            <img 
              src={photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              className="w-40 h-40 rounded-full shadow-lg object-cover" 
              alt="Profile" 
              referrerPolicy="no-referrer"
            />
            <label className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="text-white w-8 h-8" />
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    compressAndUpload(file);
                    e.target.value = ''; // Clear input
                  }
                }} 
              />
            </label>
            {uploading && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-full flex items-center justify-center"><CircleDashed className="w-8 h-8 animate-spin text-[#00a884]" /></div>}
          </div>
          <h3 className="mt-4 text-xl font-bold dark:text-[#e9edef] flex items-center gap-2">
            {firstName} {lastName}
            {user.isVerified && <VerifiedBadge size={20} />}
          </h3>
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
            <div>
              <label className="text-[12px] text-gray-500 dark:text-[#8696a0] mb-1 block">Bio</label>
              <textarea 
                value={datingBio} 
                onChange={(e) => setDatingBio(e.target.value)}
                className="w-full border-b border-gray-200 dark:border-gray-800 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px] resize-none h-20 bg-transparent dark:text-[#e9edef]"
              />
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
      <div className="flex bg-white dark:bg-[#111b21] p-1 border-b border-gray-100 dark:border-gray-800 overflow-x-auto no-scrollbar">
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
      <div className="bg-[#008069] text-white p-4 flex items-center gap-6 shadow-md">
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
      <div className="bg-[#008069] text-white p-4 flex items-center gap-6 shadow-md fixed top-0 w-full z-10">
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
