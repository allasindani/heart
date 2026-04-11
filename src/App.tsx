import React, { useState, useEffect, useRef } from 'react';
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
  Settings,
  ArrowRight
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
  writeBatch
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { auth, db } from './firebase';
import { cn, formatWhatsAppTime } from './lib/utils';
import type { User, Chat, Message, Post, Status, Notification as AppNotification, PostComment } from './types';

// --- Error Handling ---
enum OperationType { CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write' }
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Firestore Error: ', JSON.stringify({ error: error instanceof Error ? error.message : String(error), operationType, path }));
}

// --- Auth Screen ---
const AuthScreen = () => {
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
    <div className="min-h-screen bg-[#00a884] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
        <div className="w-20 h-20 bg-[#25d366] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
          <Heart className="text-white w-12 h-12 fill-current" />
        </div>
        <h1 className="text-3xl font-bold text-[#111b21] mb-2">Heart Connect</h1>
        <p className="text-[#667781] mb-8 font-medium">Simple. Secure. Reliable Dating.</p>
        
        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#00a884]"
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#00a884]"
            required
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button type="submit" className="w-full bg-[#00a884] text-white font-bold py-3 rounded-xl shadow-md hover:bg-[#008f6f] transition-all">
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-[1px] bg-gray-200"></div>
          <span className="text-xs text-gray-400 uppercase font-bold">OR</span>
          <div className="flex-1 h-[1px] bg-gray-200"></div>
        </div>

        <button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 mb-4 hover:bg-gray-50">
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
          Continue with Google
        </button>

        <button 
          onClick={() => setIsLogin(!isLogin)} 
          className="text-[#00a884] text-sm font-bold hover:underline"
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'dating'>('chats');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const awardPoints = async (amount: number) => {
    if (!user) return;
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = doc(db, 'users', firebaseUser.uid);
        const userData: User = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous',
          photoURL: firebaseUser.photoURL || null,
          role: firebaseUser.email === 'alasindani2020@gmail.com' ? 'admin' : 'user',
          category: 'General',
          points: 0,
          isOnline: true,
          lastSeen: serverTimestamp(),
          status: "Hey there! I am using Heart Connect.",
        };
        try { await setDoc(userDoc, userData, { merge: true }); } catch (e) { handleFirestoreError(e, OperationType.WRITE, `users/${firebaseUser.uid}`); }
        setUser(userData);
      } else { setUser(null); }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Seed Data for Zimbabwe Profiles
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
    if (!user) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat))), (e) => handleFirestoreError(e, OperationType.LIST, 'chats'));
  }, [user]);

  useEffect(() => {
    if (!selectedChat) return;
    const q = query(collection(db, `chats/${selectedChat.id}/messages`), orderBy('timestamp', 'asc'), limit(100));
    return onSnapshot(q, (snapshot) => setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message))), (e) => handleFirestoreError(e, OperationType.LIST, 'messages'));
  }, [selectedChat]);

  useEffect(() => {
    if (!user || activeTab !== 'status') return;
    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    const qStatus = query(collection(db, 'statuses'), orderBy('createdAt', 'desc'));
    const unsubPosts = onSnapshot(qPosts, (snap) => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post))));
    const unsubStatus = onSnapshot(qStatus, (snap) => setStatuses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Status))));
    
    // Notifications listener
    const qNotif = query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'), limit(20));
    const unsubNotif = onSnapshot(qNotif, (snap) => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification))));

    return () => { unsubPosts(); unsubStatus(); unsubNotif(); };
  }, [user, activeTab]);

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
  }, [chats, user]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <MessageCircle className="w-16 h-16 text-[#25d366] fill-current animate-pulse mb-8" />
      <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
        <motion.div animate={{ x: [-192, 192] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} className="w-full h-full bg-[#00a884]" />
      </div>
      <p className="mt-4 text-[#667781] text-sm font-medium">Heart Connect</p>
    </div>
  );

  if (!user) return <AuthScreen />;

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
    
    const msgData = { 
      chatId: selectedChat.id, 
      senderId: user.uid, 
      text, 
      type, 
      timestamp: serverTimestamp(), 
      status: 'sent' 
    };

    // Parallelize writes for better performance and reduced latency
    const messagePromise = addDoc(collection(db, `chats/${selectedChat.id}/messages`), msgData);
    
    const chatUpdatePromise = updateDoc(doc(db, 'chats', selectedChat.id), { 
      lastMessage: { 
        text: type === 'text' ? text : `Sent an ${type}`, 
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
        text: `sent you a message: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`,
        read: false,
        timestamp: serverTimestamp(),
        relatedId: selectedChat.id
      });
    }

    try {
      await Promise.all([messagePromise, chatUpdatePromise, notificationPromise]);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `chats/${selectedChat.id}/messages`);
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden max-w-md mx-auto shadow-2xl border-x border-gray-200 relative">
      {selectedChat ? (
        <div className="absolute inset-0 z-50 bg-[#efeae2] flex flex-col">
          <ChatView user={user} chat={selectedChat} messages={messages} onBack={() => setSelectedChat(null)} onSendMessage={sendMessage} />
        </div>
      ) : showProfile ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] flex flex-col">
          <ProfileSettings user={user} onBack={() => setShowProfile(false)} onUpdate={(updatedUser: User) => setUser(updatedUser)} />
        </div>
      ) : showAdmin ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] flex flex-col">
          <AdminDashboard user={user} onBack={() => setShowAdmin(false)} />
        </div>
      ) : viewingUser ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] flex flex-col">
          <UserProfileView user={user} targetUser={viewingUser} onBack={() => setViewingUser(null)} onStartChat={(chat) => { setViewingUser(null); setSelectedChat(chat); }} />
        </div>
      ) : showNotifications ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] flex flex-col">
          <NotificationCenter user={user} notifications={notifications} onBack={() => setShowNotifications(false)} />
        </div>
      ) : showUpgrade ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] flex flex-col">
          <UpgradeTiers user={user} onBack={() => setShowUpgrade(false)} />
        </div>
      ) : showLeaderboard ? (
        <div className="absolute inset-0 z-50 bg-[#f0f2f5] flex flex-col">
          <PointsLeaderboard onBack={() => setShowLeaderboard(false)} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* App Header */}
          <div className="bg-[#008069] text-white p-4 pb-2 shadow-md relative z-30">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-medium">Heart Connect</h1>
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
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-50 border border-gray-100">
                      <button onClick={() => { setShowProfile(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                        <UserIcon className="w-4 h-4" /> Profile
                      </button>
                      <button onClick={() => { setShowLeaderboard(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                        <Trophy className="w-4 h-4 text-yellow-600" /> Leaderboard
                      </button>
                      <button onClick={() => { setShowUpgrade(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                        <Crown className="w-4 h-4 text-purple-600" /> Upgrade
                      </button>
                      {user.role === 'admin' && (
                        <button onClick={() => { setShowAdmin(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-[#00a884] hover:bg-gray-50 flex items-center gap-3">
                          <Shield className="w-4 h-4" /> Admin Panel
                        </button>
                      )}
                      <button onClick={() => { signOut(auth); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3">
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
              <button onClick={() => setActiveTab('status')} className={cn("flex-1 pb-3 border-b-4 transition-colors", activeTab === 'status' ? "border-white" : "border-transparent opacity-70")}>Status</button>
              <button onClick={() => setActiveTab('dating')} className={cn("flex-1 pb-3 border-b-4 transition-colors", activeTab === 'dating' ? "border-white" : "border-transparent opacity-70")}>Dating</button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'chats' && (
              <div className="divide-y divide-gray-100">
                {chats.filter(c => {
                  if (!searchQuery) return true;
                  const name = c.groupName || '';
                  return name.toLowerCase().includes(searchQuery.toLowerCase());
                }).length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No chats found.</div>
                ) : (
                  chats.filter(c => {
                    if (!searchQuery) return true;
                    const name = c.groupName || '';
                    return name.toLowerCase().includes(searchQuery.toLowerCase());
                  }).map(chat => (
                    <div key={chat.id} onClick={() => setSelectedChat(chat)} className="flex items-center gap-4 p-4 active:bg-gray-100 transition-colors cursor-pointer">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`} className="w-14 h-14 rounded-full" alt="Chat" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-bold text-[#111b21] truncate">{chat.groupName || "Chat"}</h3>
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
                  ))
                )}
              </div>
            )}
            {activeTab === 'status' && <StatusAndWallView user={user} statuses={statuses} posts={posts} onUserClick={(u: User) => setViewingUser(u)} awardPoints={awardPoints} />}
            {activeTab === 'dating' && <DatingView user={user} filters={datingFilters} onUpdateFilters={setDatingFilters} onUserClick={(u: User) => setViewingUser(u)} searchQuery={searchQuery} />}
          </div>

          {/* Floating Action Button */}
          <button className="absolute bottom-6 right-6 w-14 h-14 bg-[#00a884] rounded-full shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}

// --- Sub-Components ---

const ChatView = ({ user, chat, messages, onBack, onSendMessage }: any) => {
  const [input, setInput] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<any>(null);

  const emojis = ['❤️', '😂', '😮', '😢', '🙏', '👍'];

  useEffect(() => {
    const fetchOtherUser = async () => {
      const otherId = chat.participants.find((p: string) => p !== user.uid);
      if (otherId) {
        const { getDoc, doc } = await import('firebase/firestore');
        const docSnap = await getDoc(doc(db, 'users', otherId));
        if (docSnap.exists()) setOtherUser(docSnap.data());
      }
    };
    fetchOtherUser();
  }, [chat, user.uid]);

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
  }, [messages, chat, user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `chats/${chat.id}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
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
      await updateDoc(doc(db, `chats/${chat.id}/messages`, messageId), {
        [`reactions.${user.uid}`]: emoji
      });
      setReactingTo(null);
    } catch (e) {
      console.error("Error adding reaction:", e);
    }
  };

  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setReactingTo(id);
    }, 500);
  };

  const endLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <div className="bg-[#008069] text-white p-3 flex items-center gap-2 shadow-md">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <img src={otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`} className="w-10 h-10 rounded-full" alt="Chat" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold truncate">{otherUser?.displayName || chat.groupName || "Chat"}</h3>
          <p className="text-xs opacity-80">{otherUser?.isOnline ? 'online' : 'offline'}</p>
        </div>
        <div className="flex gap-5 mr-2">
          <Video className="w-6 h-6" />
          <Phone className="w-6 h-6" />
          <MoreVertical className="w-6 h-6" />
        </div>
      </div>
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat"
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
              className={cn(
                "max-w-[85%] p-2 px-3 rounded-lg shadow-sm relative min-w-[80px] transition-all",
                msg.senderId === user.uid ? "bg-[#dcf8c6] rounded-tr-none" : "bg-white rounded-tl-none",
                reactingTo === msg.id && "scale-105 ring-2 ring-[#00a884]/30"
              )}
            >
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
                <img src={msg.text} className="rounded-lg max-w-full h-auto mb-1" alt="Sent" />
              ) : msg.type === 'video' ? (
                <video src={msg.text} controls className="rounded-lg max-w-full h-auto mb-1" />
              ) : (
                <p className="text-[15px] text-[#111b21] pr-12 leading-relaxed">{msg.text}</p>
              )}
              
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="flex -space-x-1 mt-1">
                  {Object.entries(msg.reactions).map(([uid, emoji]: any) => (
                    <div key={uid} className="bg-white rounded-full shadow-sm border border-gray-100 px-1 text-xs">
                      {emoji}
                    </div>
                  ))}
                </div>
              )}

              <div className="absolute bottom-1 right-1.5 flex items-center gap-1">
                <span className="text-[10px] text-[#667781] uppercase">{msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</span>
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
      <div className="bg-[#f0f2f5] p-2 flex items-center gap-2">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*" />
        <div className="bg-white flex-1 flex items-center px-3 py-2 rounded-full shadow-sm">
          <Smile className="w-6 h-6 text-gray-500 mr-2" />
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message" className="flex-1 bg-transparent border-none outline-none text-[16px]" onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) { onSendMessage(input); setInput(''); } }} />
          <Paperclip className="w-6 h-6 text-gray-500 ml-2 cursor-pointer" onClick={() => fileInputRef.current?.click()} />
          <Camera className="w-6 h-6 text-gray-500 ml-3 cursor-pointer" onClick={() => fileInputRef.current?.click()} />
        </div>
        <button onClick={() => { if (input.trim()) { onSendMessage(input); setInput(''); } }} className="w-12 h-12 bg-[#00a884] rounded-full flex items-center justify-center text-white shadow-md">
          {input.trim() ? <Send className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};

const StatusAndWallView = ({ user, statuses, posts, onUserClick, awardPoints }: any) => {
  const [newPost, setNewPost] = useState('');
  const [postMedia, setPostMedia] = useState<string | null>(null);
  const [postMediaType, setPostMediaType] = useState<'image' | 'video' | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusDuration, setStatusDuration] = useState('24h');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLike = async (post: Post) => {
    if (!user) return;
    const postRef = doc(db, 'posts', post.id);
    const isLiked = post.likes.includes(user.uid);
    const { arrayUnion, arrayRemove } = await import('firebase/firestore');
    
    await updateDoc(postRef, {
      likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });

    if (!isLiked) {
      awardPoints(2); // 2 points for liking
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
    awardPoints(5); // 5 points for commenting
  };

  const handlePost = async () => {
    if (!newPost.trim() && !postMedia) return;
    await addDoc(collection(db, 'posts'), { 
      userId: user.uid, 
      content: newPost, 
      media: postMedia ? [postMedia] : [],
      mediaType: postMediaType,
      likes: [], 
      commentCount: 0,
      createdAt: serverTimestamp(), 
      isAd: false, 
      user: { displayName: user.displayName, photoURL: user.photoURL } 
    });
    setNewPost('');
    setPostMedia(null);
    setPostMediaType(null);
    awardPoints(10); // 10 points for posting
  };

  const handlePostFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPostMedia(url);
      setPostMediaType(file.type.startsWith('image/') ? 'image' : 'video');
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
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
        createdAt: serverTimestamp(),
        expiresAt,
        user: { displayName: user.displayName, photoURL: user.photoURL }
      });
      setShowStatusModal(false);
      setStatusText('');
    } catch (error) {
      console.error("Status error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleStatusFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `statuses/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const type = file.type.startsWith('image/') ? 'image' : 'video';
      handleCreateStatus(url, type);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-[#f0f2f5] min-h-full">
      {/* Status Section */}
      <div className="bg-white p-4 mb-2 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Status</h4>
          <button onClick={() => setShowStatusModal(true)} className="text-[#00a884] text-xs font-bold flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Status
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer" onClick={() => setShowStatusModal(true)}>
            <div className="relative">
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-16 h-16 rounded-full border-2 border-gray-200" alt="Me" />
              <div className="absolute bottom-0 right-0 bg-[#00a884] rounded-full p-1 border-2 border-white"><Plus className="w-3 h-3 text-white" /></div>
            </div>
            <span className="text-xs text-gray-600">My Status</span>
          </div>
          {statuses.filter((s: any) => s.expiresAt?.toDate ? s.expiresAt.toDate() > new Date() : true).map((s: any) => (
            <div key={s.id} className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer" onClick={() => onUserClick({ uid: s.userId, displayName: s.user?.displayName, photoURL: s.user?.photoURL })}>
              <div className="p-0.5 rounded-full border-2 border-[#00a884]">
                <img src={s.user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.userId}`} className="w-16 h-16 rounded-full border-2 border-white" alt="User" />
              </div>
              <span className="text-xs text-gray-600 truncate w-16 text-center">{s.user?.displayName || "User"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Creation Modal */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-[#111b21]">Create Status</h3>
                  <button onClick={() => setShowStatusModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6 text-gray-400" /></button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Status Text</label>
                    <textarea 
                      value={statusText}
                      onChange={(e) => setStatusText(e.target.value)}
                      placeholder="What's on your mind?"
                      className="w-full bg-gray-50 border-none outline-none p-4 rounded-2xl text-[16px] resize-none h-32 focus:ring-2 focus:ring-[#00a884]/20 transition-all"
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
      <div className="p-4 space-y-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <textarea placeholder="Share an update..." value={newPost} onChange={(e) => setNewPost(e.target.value)} className="w-full bg-gray-50 border-none outline-none p-3 rounded-xl text-[15px] resize-none h-20 mb-3" />
          {postMedia && (
            <div className="relative mb-3">
              {postMediaType === 'image' ? (
                <img src={postMedia} className="w-full h-48 object-cover rounded-xl" alt="Preview" />
              ) : (
                <video src={postMedia} className="w-full h-48 object-cover rounded-xl" controls />
              )}
              <button onClick={() => setPostMedia(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"><X className="w-4 h-4" /></button>
            </div>
          )}
          <div className="flex justify-between items-center border-t border-gray-50 pt-3">
            <div className="flex gap-5 text-gray-500">
              <input type="file" id="post-media" className="hidden" accept="image/*,video/*" onChange={handlePostFileUpload} />
              <label htmlFor="post-media" className="cursor-pointer hover:text-[#00a884]"><ImageIcon className="w-5 h-5" /></label>
              <label htmlFor="post-media" className="cursor-pointer hover:text-[#00a884]"><VideoIcon className="w-5 h-5" /></label>
            </div>
            <button onClick={handlePost} disabled={uploading} className="bg-[#00a884] text-white px-6 py-1.5 rounded-full font-bold text-sm shadow-sm disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Post'}
            </button>
          </div>
        </div>
        {posts.map((post: any) => (
          <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => onUserClick({ uid: post.userId, displayName: post.user?.displayName, photoURL: post.user?.photoURL })}>
              <img src={post.user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`} className="w-10 h-10 rounded-full" alt="User" />
              <div>
                <h4 className="font-bold text-[#111b21] text-[15px]">{post.user?.displayName}</h4>
                <p className="text-[11px] text-[#667781]">{post.createdAt?.toDate ? formatWhatsAppTime(post.createdAt.toDate()) : ''}</p>
              </div>
              {post.isAd && <span className="ml-auto bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Sponsored</span>}
            </div>
            <div className="px-4 pb-4 text-[15px] text-[#111b21] leading-relaxed">
              {post.content}
              {post.media?.[0] && (
                <div className="mt-3">
                  {post.mediaType === 'video' ? (
                    <video src={post.media[0]} controls className="w-full rounded-xl" />
                  ) : (
                    <img src={post.media[0]} className="w-full rounded-xl" alt="Post media" />
                  )}
                </div>
              )}
              {post.adLink && (
                <a href={post.adLink} target="_blank" rel="noopener noreferrer" className="block mt-3 text-[#00a884] font-bold flex items-center gap-1">
                  Learn More <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="p-2 border-t border-gray-50 flex justify-around text-[#667781] text-sm font-semibold">
              <button 
                onClick={() => handleLike(post)}
                className={cn("flex items-center gap-2 py-2 px-6 rounded-xl hover:bg-gray-50 transition-colors", post.likes.includes(user.uid) && "text-[#00a884]")}
              >
                <ThumbsUp className={cn("w-5 h-5", post.likes.includes(user.uid) && "fill-current")} /> {post.likes.length || ''} Like
              </button>
              <button 
                onClick={() => setShowComments(post.id)}
                className="flex items-center gap-2 py-2 px-6 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="w-5 h-5" /> {post.commentCount || ''} Comment
              </button>
            </div>
          </div>
        ))}
      </div>

      {showComments && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Comments</h3>
              <button onClick={() => setShowComments(null)} className="p-2 bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <img src={c.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userId}`} className="w-8 h-8 rounded-full" alt="User" />
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
    </div>
  );
};

const DatingView = ({ user, filters, onUpdateFilters, onUserClick, searchQuery }: any) => {
  const [discoverUsers, setDiscoverUsers] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

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
          .filter(u => u.uid !== user.uid && u.datingProfile);
        
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
      setCurrentIndex(0); // Loop back for demo
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><CircleDashed className="w-8 h-8 animate-spin text-[#00a884]" /></div>;

  const currentUser = discoverUsers[currentIndex];

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#f0f2f5] relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-[#111b21]">Discover</h2>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 bg-white rounded-full shadow-sm text-[#00a884]"
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
            className="bg-white p-4 rounded-2xl shadow-lg mb-4 space-y-4 z-20"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Min Age</label>
                <input 
                  type="number" 
                  value={filters.minAge} 
                  onChange={(e) => onUpdateFilters({...filters, minAge: Number(e.target.value)})}
                  className="w-full border-b border-gray-200 py-1 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Max Age</label>
                <input 
                  type="number" 
                  value={filters.maxAge} 
                  onChange={(e) => onUpdateFilters({...filters, maxAge: Number(e.target.value)})}
                  className="w-full border-b border-gray-200 py-1 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Gender Preference</label>
              <select 
                value={filters.gender} 
                onChange={(e) => onUpdateFilters({...filters, gender: e.target.value})}
                className="w-full border-b border-gray-200 py-1 outline-none bg-transparent"
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

      {discoverUsers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <Heart className="w-16 h-16 text-gray-200 mb-4" />
          <p className="text-gray-500">No matches found with current filters. Try expanding your search!</p>
        </div>
      ) : (
        <div className="max-w-sm w-full mx-auto bg-white rounded-[40px] shadow-2xl overflow-hidden h-[550px] flex flex-col relative border-4 border-white">
          <div className="flex-1 bg-gray-200 relative">
            <img 
              src={currentUser.photoURL || `https://picsum.photos/seed/${currentUser.uid}/400/600`} 
              className="w-full h-full object-cover" 
              alt={currentUser.displayName} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-3xl font-bold">{currentUser.displayName}, {currentUser.datingProfile?.age}</h3>
                {currentUser.isOnline && (
                  <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
                )}
              </div>
              <p className="text-sm opacity-90 leading-relaxed line-clamp-2">{currentUser.datingProfile?.bio}</p>
              <div className="flex gap-2 mt-4 flex-wrap">
                {currentUser.datingProfile?.city && (
                  <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider">
                    {currentUser.datingProfile.city}
                  </span>
                )}
                {currentUser.datingProfile?.interests?.slice(0, 2).map(tag => (
                  <span key={tag} className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="p-6 flex justify-center gap-10 bg-white">
            <button onClick={handleNext} className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:scale-110 transition-transform shadow-lg"><X className="w-8 h-8" /></button>
            <button onClick={() => onUserClick(currentUser)} className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 hover:scale-110 transition-transform shadow-lg"><UserIcon className="w-8 h-8" /></button>
            <button onClick={handleNext} className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-[#00a884] hover:scale-110 transition-transform shadow-lg"><Heart className="w-8 h-8 fill-current" /></button>
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
    if (!fullUser) return;
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

  if (!fullUser) return <div className="flex-1 flex items-center justify-center bg-white"><CircleDashed className="w-8 h-8 animate-spin text-[#00a884]" /></div>;

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="relative h-72">
        <img src={fullUser.photoURL || `https://picsum.photos/seed/${fullUser.uid}/600/800`} className="w-full h-full object-cover" alt={fullUser.displayName} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-black/20 backdrop-blur-md rounded-full text-white"><ChevronLeft className="w-6 h-6" /></button>
        <div className="absolute bottom-6 left-6 text-white">
          <h2 className="text-3xl font-bold">{fullUser.displayName}</h2>
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
            <button disabled className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
              <CircleDashed className="w-5 h-5 animate-spin" /> Request Sent
            </button>
          )}
          {requestStatus === 'accepted' && (
            <button disabled className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
              <UserCheck className="w-5 h-5" /> Friends
            </button>
          )}
          <button onClick={handleStartChat} className="flex-1 border-2 border-[#00a884] text-[#00a884] py-3 rounded-xl font-bold flex items-center justify-center gap-2">
            <MessageSquare className="w-5 h-5" /> Message
          </button>
        </div>
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">About</h4>
          <p className="text-gray-700 leading-relaxed">{fullUser.datingProfile?.bio || fullUser.status || "No bio available."}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-xl">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Age</span>
              <span className="font-bold">{fullUser.datingProfile?.age || 'N/A'}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Location</span>
              <span className="font-bold">{fullUser.datingProfile?.city || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationCenter = ({ user, notifications, onBack }: any) => {
  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5]">
      <div className="bg-[#008069] text-white p-4 flex items-center gap-6 shadow-md">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium">Notifications</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No notifications yet.</div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => markAsRead(n.id)}
              className={cn("bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 border-l-4 transition-all", n.read ? "border-transparent opacity-70" : "border-[#00a884]")}
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-[#00a884]">
                {n.type === 'like' && <ThumbsUp className="w-6 h-6" />}
                {n.type === 'message' && <MessageSquare className="w-6 h-6" />}
                {n.type === 'friend_request' && <UserPlus className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#111b21]">
                  <span className="font-bold">{n.fromName}</span> {n.text}
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

const UpgradeTiers = ({ user, onBack }: any) => {
  const tiers = [
    { name: 'General', price: 'Free', color: 'bg-gray-100 text-gray-600', benefits: ['Standard Chat', 'Basic Profile', 'Wall Access'] },
    { name: 'Bronze', price: '$5/mo', color: 'bg-orange-100 text-orange-600', benefits: ['Priority Support', 'Bronze Badge', 'Ad-Free Feed'] },
    { name: 'Silver', price: '$10/mo', color: 'bg-blue-100 text-blue-600', benefits: ['Silver Badge', 'Profile Boost', 'Unlimited Likes'] },
    { name: 'Gold', price: '$20/mo', color: 'bg-yellow-100 text-yellow-600', benefits: ['Gold Badge', 'Exclusive Events', 'See Who Liked You'] },
    { name: 'Platinum', price: '$50/mo', color: 'bg-purple-100 text-purple-600', benefits: ['Platinum Badge', 'VIP Concierge', 'Incognito Mode'] },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5]">
      <div className="bg-[#008069] text-white p-4 flex items-center gap-6 shadow-md">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium">Upgrade Membership</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm text-center">
          <h3 className="text-lg font-bold text-gray-700 mb-2">Current Tier: <span className="text-[#00a884]">{user.category}</span></h3>
          <p className="text-sm text-gray-500">Upgrade to unlock premium features and support the community.</p>
        </div>
        {tiers.map(tier => (
          <div key={tier.name} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <span className={cn("px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest", tier.color)}>{tier.name}</span>
              <span className="text-xl font-bold text-[#111b21]">{tier.price}</span>
            </div>
            <ul className="space-y-2 mb-6">
              {tier.benefits.map(b => (
                <li key={b} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-[#00a884]" /> {b}
                </li>
              ))}
            </ul>
            {user.category !== tier.name && (
              <div className="space-y-3">
                <p className="text-[10px] text-gray-400 text-center uppercase font-bold">Manual Payment Method</p>
                <p className="text-xs text-center text-gray-500 bg-gray-50 p-3 rounded-xl">Send payment to: <span className="font-bold">alasindani2020@gmail.com</span> via PayPal or EcoCash. Include your UID: <span className="font-mono bg-white px-1 rounded">{user.uid}</span></p>
                <button className="w-full bg-[#00a884] text-white py-3 rounded-xl font-bold shadow-md hover:bg-[#008f6f] transition-all">Notify Admin of Payment</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const PointsLeaderboard = ({ onBack }: any) => {
  const [leaders, setLeaders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setLeaders(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5]">
      <div className="bg-[#008069] text-white p-4 flex items-center gap-6 shadow-md">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium">Points Leaderboard</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20"><CircleDashed className="w-8 h-8 animate-spin text-[#00a884]" /></div>
        ) : (
          leaders.map((u, i) => (
            <div key={u.uid} className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-700" : i === 2 ? "bg-orange-100 text-orange-700" : "text-gray-400")}>
                {i + 1}
              </div>
              <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-12 h-12 rounded-full" alt="User" />
              <div className="flex-1">
                <h4 className="font-bold text-[#111b21]">{u.displayName}</h4>
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
  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, activeAds: 0, totalPoints: 0 });
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const uSnap = await getDocs(collection(db, 'users'));
      const pSnap = await getDocs(collection(db, 'posts'));
      const uList = uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
      setUsers(uList);
      setStats({
        totalUsers: uList.length,
        totalPosts: pSnap.docs.length,
        activeAds: pSnap.docs.filter(d => d.data().isAd).length,
        totalPoints: uList.reduce((acc, curr) => acc + (curr.points || 0), 0)
      });
      setLoading(false);
    };
    fetchData();
  }, []);

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

  const deleteUser = async (targetUser: User) => {
    await deleteDoc(doc(db, 'users', targetUser.uid));
    setUsers(users.filter(u => u.uid !== targetUser.uid));
    setStats({ ...stats, totalUsers: stats.totalUsers - 1 });
  };

  const handleUpdateUser = async (updatedUser: User) => {
    await updateDoc(doc(db, 'users', updatedUser.uid), updatedUser as any);
    setUsers(users.map(u => u.uid === updatedUser.uid ? updatedUser : u));
    setEditingUser(null);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center bg-white"><CircleDashed className="w-8 h-8 animate-spin text-[#00a884]" /></div>;
  if (editingUser) return <ProfileSettings user={editingUser} onBack={() => setEditingUser(null)} onUpdate={handleUpdateUser} />;

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5]">
      <div className="bg-[#111b21] text-white p-4 flex items-center gap-6 shadow-md">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium flex items-center gap-2"><Shield className="w-5 h-5 text-[#00a884]" /> Admin Dashboard</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm text-center">
            <UserIcon className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <div className="text-xl font-bold">{stats.totalUsers}</div>
            <div className="text-[10px] text-gray-400 uppercase font-bold">Users</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm text-center">
            <BarChart3 className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <div className="text-xl font-bold">{stats.totalPoints}</div>
            <div className="text-[10px] text-gray-400 uppercase font-bold">Total Points</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm text-center">
            <Plus className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <div className="text-xl font-bold">{stats.activeAds}</div>
            <div className="text-[10px] text-gray-400 uppercase font-bold">Ads</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm text-center">
            <MessageSquare className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <div className="text-xl font-bold">{stats.totalPosts}</div>
            <div className="text-[10px] text-gray-400 uppercase font-bold">Posts</div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">User Management</h3>
            <Settings className="w-4 h-4 text-gray-400" />
          </div>
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {users.map(u => (
              <div key={u.uid} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-10 h-10 rounded-full" alt="User" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{u.displayName}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 uppercase font-bold">{u.role}</span>
                      <span className="text-[10px] text-[#00a884] font-bold">{u.points} pts</span>
                    </div>
                  </div>
                  <button onClick={() => setEditingUser(u)} className="p-2 text-gray-400 hover:text-[#00a884]"><Settings className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select 
                    value={u.category} 
                    onChange={(e) => setUserCategory(u, e.target.value)}
                    className="text-[10px] font-bold bg-gray-50 border-none rounded-full px-2 py-1 outline-none"
                  >
                    {['General', 'Bronze', 'Silver', 'Gold', 'Platinum'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button 
                    onClick={() => toggleUserRole(u)}
                    className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors", u.role === 'admin' ? "bg-red-50 text-red-500" : "bg-green-50 text-[#00a884]")}
                  >
                    {u.role === 'admin' ? "Demote" : "Make Admin"}
                  </button>
                  <button 
                    onClick={() => toggleUserSuspension(u)}
                    className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors", u.suspended ? "bg-green-50 text-[#00a884]" : "bg-yellow-50 text-yellow-600")}
                  >
                    {u.suspended ? "Unsuspend" : "Suspend"}
                  </button>
                  <button 
                    onClick={() => deleteUser(u)}
                    className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ad Management */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold text-gray-700 mb-4">Ad Management</h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-sm mb-1">Standard Ad</h4>
              <p className="text-xs text-gray-500 mb-3">Visible to all users in the wall feed.</p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-[#00a884]">$10 / day</span>
                <button className="bg-[#00a884] text-white px-4 py-2 rounded-xl text-xs font-bold">Create Ad</button>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-sm mb-1">Premium Ad</h4>
              <p className="text-xs text-gray-500 mb-3">Pinned at the top of the wall feed.</p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-[#00a884]">$25 / day</span>
                <button className="bg-[#00a884] text-white px-4 py-2 rounded-xl text-xs font-bold">Create Ad</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
const ProfileSettings = ({ user, onBack, onUpdate }: { user: User, onBack: () => void, onUpdate: (u: User) => void }) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [status, setStatus] = useState(user.status || '');
  const [datingBio, setDatingBio] = useState(user.datingProfile?.bio || '');
  const [datingAge, setDatingAge] = useState(user.datingProfile?.age || 18);
  const [gender, setGender] = useState(user.datingProfile?.gender || 'other');
  const [country, setCountry] = useState(user.datingProfile?.country || '');
  const [city, setCity] = useState(user.datingProfile?.city || '');
  const [saving, setSaving] = useState(false);

  const updateLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const userDoc = doc(db, 'users', user.uid);
        updateDoc(userDoc, {
          'datingProfile.location': { lat: latitude, lng: longitude }
        });
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const userDoc = doc(db, 'users', user.uid);
      const updatedData = {
        displayName,
        status,
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
      onUpdate({ ...user, ...updatedData });
      onBack();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f2f5]">
      <div className="bg-[#008069] text-white p-4 flex items-center gap-6 shadow-md">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-medium">Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center py-8 bg-white mb-6">
          <div className="relative group">
            <img 
              src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              className="w-40 h-40 rounded-full shadow-lg object-cover" 
              alt="Profile" 
            />
            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="text-white w-8 h-8" />
            </div>
          </div>
          <h3 className="mt-4 text-xl font-bold">{user.displayName}</h3>
          <div className="flex gap-2 mt-2">
            <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", 
              user.category === 'Platinum' ? "bg-purple-100 text-purple-700" :
              user.category === 'Gold' ? "bg-yellow-100 text-yellow-700" :
              user.category === 'Silver' ? "bg-gray-100 text-gray-700" :
              user.category === 'Bronze' ? "bg-orange-100 text-orange-700" :
              "bg-blue-100 text-blue-700"
            )}>
              {user.category} Member
            </span>
            <span className="px-3 py-1 bg-green-100 text-[#00a884] rounded-full text-[10px] font-bold uppercase tracking-wider">
              {user.points} Points
            </span>
          </div>
        </div>

        <div className="space-y-6 px-4 pb-8">
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <label className="text-xs font-semibold text-[#00a884] uppercase tracking-wider mb-2 block">Your Name</label>
            <div className="flex items-center gap-3">
              <input 
                type="text" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 border-b border-gray-200 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px]"
              />
              <Smile className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-[12px] text-gray-500 mt-2">This is not your username or pin. This name will be visible to your Heart Connect contacts.</p>
          </section>

          <section className="bg-white rounded-xl p-4 shadow-sm">
            <label className="text-xs font-semibold text-[#00a884] uppercase tracking-wider mb-2 block">About / Status</label>
            <div className="flex items-center gap-3">
              <input 
                type="text" 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                className="flex-1 border-b border-gray-200 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px]"
              />
              <Smile className="w-5 h-5 text-gray-400" />
            </div>
          </section>

          <section className="bg-white rounded-xl p-4 shadow-sm">
            <label className="text-xs font-semibold text-[#00a884] uppercase tracking-wider mb-4 block">Dating Profile</label>
            <div className="space-y-4">
              <button 
                onClick={updateLocation}
                className="w-full flex items-center justify-center gap-2 py-2 border border-[#00a884] text-[#00a884] rounded-lg text-sm font-bold hover:bg-[#00a884]/5"
              >
                <Search className="w-4 h-4" /> Update My Location
              </button>
              <div>
                <label className="text-[12px] text-gray-500 mb-1 block">Age</label>
                <input 
                  type="number" 
                  value={datingAge} 
                  onChange={(e) => setDatingAge(Number(e.target.value))}
                  className="w-full border-b border-gray-200 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px]"
                />
              </div>
              <div>
                <label className="text-[12px] text-gray-500 mb-1 block">Gender</label>
                <select 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full border-b border-gray-200 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px] bg-transparent"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] text-gray-500 mb-1 block">Country</label>
                  <input 
                    type="text" 
                    value={country} 
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full border-b border-gray-200 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px]"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-gray-500 mb-1 block">City</label>
                  <input 
                    type="text" 
                    value={city} 
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full border-b border-gray-200 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[12px] text-gray-500 mb-1 block">Bio</label>
                <textarea 
                  value={datingBio} 
                  onChange={(e) => setDatingBio(e.target.value)}
                  placeholder="Tell others about yourself..."
                  className="w-full border-b border-gray-200 py-2 outline-none focus:border-[#00a884] transition-colors text-[16px] resize-none h-20"
                />
              </div>
            </div>
          </section>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#00a884] text-white py-4 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};
