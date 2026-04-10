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
  CheckCheck,
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
  Camera,
  Phone,
  Video,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
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
  arrayUnion, 
  arrayRemove,
  limit,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { cn, formatWhatsAppTime } from './lib/utils';
import type { User, Chat, Message, Post, Status } from './types';

// --- Error Handling ---
enum OperationType { CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write' }
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Firestore Error: ', JSON.stringify({ error: error instanceof Error ? error.message : String(error), operationType, path }));
}

// --- Auth Screen ---
const AuthScreen = () => {
  const handleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
  return (
    <div className="min-h-screen bg-[#00a884] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
        <div className="w-20 h-20 bg-[#25d366] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
          <MessageCircle className="text-white w-12 h-12 fill-current" />
        </div>
        <h1 className="text-3xl font-bold text-[#111b21] mb-2">Heart Connect</h1>
        <p className="text-[#667781] mb-8">Simple. Secure. Reliable messaging.</p>
        <button onClick={handleLogin} className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white font-bold py-4 rounded-full transition-all shadow-lg flex items-center justify-center gap-3">
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
          Get Started
        </button>
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
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = doc(db, 'users', firebaseUser.uid);
        const userData: User = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Anonymous',
          photoURL: firebaseUser.photoURL || null,
          role: firebaseUser.email === 'alasindani2020@gmail.com' ? 'admin' : 'user',
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
    return () => { unsubPosts(); unsubStatus(); };
  }, [user, activeTab]);

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

  const sendMessage = async (text: string) => {
    if (!selectedChat || !text.trim()) return;
    const msgData = { chatId: selectedChat.id, senderId: user.uid, text, type: 'text', timestamp: serverTimestamp(), status: 'sent' };
    await addDoc(collection(db, `chats/${selectedChat.id}/messages`), msgData);
    await updateDoc(doc(db, 'chats', selectedChat.id), { lastMessage: { text, senderId: user.uid, timestamp: serverTimestamp() }, updatedAt: serverTimestamp() });
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden max-w-md mx-auto shadow-2xl border-x border-gray-200">
      <AnimatePresence mode="wait">
        {selectedChat ? (
          <motion.div key="chat" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute inset-0 z-50 bg-[#efeae2] flex flex-col">
            <ChatView user={user} chat={selectedChat} messages={messages} onBack={() => setSelectedChat(null)} onSendMessage={sendMessage} />
          </motion.div>
        ) : showProfile ? (
          <motion.div key="profile" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute inset-0 z-50 bg-[#f0f2f5] flex flex-col">
            <ProfileSettings user={user} onBack={() => setShowProfile(false)} onUpdate={(updatedUser: User) => setUser(updatedUser)} />
          </motion.div>
        ) : (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col overflow-hidden relative">
            {/* App Header */}
            <div className="bg-[#008069] text-white p-4 pb-2 shadow-md relative z-30">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-medium">Heart Connect</h1>
                <div className="flex gap-5 items-center">
                  <Camera className="w-6 h-6" />
                  <Search className="w-6 h-6" />
                  <div className="relative">
                    <button onClick={() => setShowMenu(!showMenu)} className="p-1"><MoreVertical className="w-6 h-6" /></button>
                    <AnimatePresence>
                      {showMenu && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-50 border border-gray-100"
                        >
                          <button onClick={() => { setShowProfile(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                            <UserIcon className="w-4 h-4" /> Profile
                          </button>
                          <button onClick={() => { signOut(auth); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3">
                            <LogOut className="w-4 h-4" /> Log out
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
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
                  {chats.map(chat => (
                    <div key={chat.id} onClick={() => setSelectedChat(chat)} className="flex items-center gap-4 p-4 active:bg-gray-100 transition-colors cursor-pointer">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`} className="w-14 h-14 rounded-full" alt="Chat" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-bold text-[#111b21] truncate">{chat.groupName || "Chat"}</h3>
                          <span className="text-xs text-[#667781]">{chat.updatedAt?.toDate ? formatWhatsAppTime(chat.updatedAt.toDate()) : ''}</span>
                        </div>
                        <p className="text-[14px] text-[#667781] truncate flex items-center gap-1">
                          {chat.lastMessage?.senderId === user.uid && <CheckCheck className="w-4 h-4 text-[#53bdeb]" />}
                          {chat.lastMessage?.text || "Start a conversation"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'status' && <StatusAndWallView user={user} statuses={statuses} posts={posts} />}
              {activeTab === 'dating' && <DatingView user={user} />}
            </div>

            {/* Floating Action Button */}
            <button className="absolute bottom-6 right-6 w-14 h-14 bg-[#00a884] rounded-full shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform">
              <Plus className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-Components ---

const ChatView = ({ user, chat, messages, onBack, onSendMessage }: any) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="bg-[#008069] text-white p-3 flex items-center gap-2 shadow-md">
        <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`} className="w-10 h-10 rounded-full" alt="Chat" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold truncate">{chat.groupName || "Chat"}</h3>
          <p className="text-xs opacity-80">online</p>
        </div>
        <div className="flex gap-5 mr-2">
          <Video className="w-6 h-6" />
          <Phone className="w-6 h-6" />
          <MoreVertical className="w-6 h-6" />
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
        {messages.map((msg: any) => (
          <div key={msg.id} className={cn("flex w-full mb-1", msg.senderId === user.uid ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] p-2 px-3 rounded-lg shadow-sm relative min-w-[80px]", msg.senderId === user.uid ? "bg-[#dcf8c6] rounded-tr-none" : "bg-white rounded-tl-none")}>
              <p className="text-[15px] text-[#111b21] pr-12 leading-relaxed">{msg.text}</p>
              <div className="absolute bottom-1 right-1.5 flex items-center gap-1">
                <span className="text-[10px] text-[#667781] uppercase">{msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</span>
                {msg.senderId === user.uid && <CheckCheck className={cn("w-3.5 h-3.5", msg.status === 'seen' ? "text-[#53bdeb]" : "text-[#8696a0]")} />}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-[#f0f2f5] p-2 flex items-center gap-2">
        <div className="bg-white flex-1 flex items-center px-3 py-2 rounded-full shadow-sm">
          <Smile className="w-6 h-6 text-gray-500 mr-2" />
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message" className="flex-1 bg-transparent border-none outline-none text-[16px]" onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) { onSendMessage(input); setInput(''); } }} />
          <Paperclip className="w-6 h-6 text-gray-500 ml-2" />
          <Camera className="w-6 h-6 text-gray-500 ml-3" />
        </div>
        <button onClick={() => { if (input.trim()) { onSendMessage(input); setInput(''); } }} className="w-12 h-12 bg-[#00a884] rounded-full flex items-center justify-center text-white shadow-md">
          {input.trim() ? <Send className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};

const StatusAndWallView = ({ user, statuses, posts }: any) => {
  const [newPost, setNewPost] = useState('');
  const handlePost = async () => {
    if (!newPost.trim()) return;
    await addDoc(collection(db, 'posts'), { userId: user.uid, content: newPost, likes: [], createdAt: serverTimestamp(), isAd: false, user: { displayName: user.displayName, photoURL: user.photoURL } });
    setNewPost('');
  };

  return (
    <div className="bg-[#f0f2f5] min-h-full">
      {/* Status Section */}
      <div className="bg-white p-4 mb-2 shadow-sm">
        <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Status</h4>
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex flex-col items-center gap-1 min-w-[70px]">
            <div className="relative">
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-16 h-16 rounded-full border-2 border-gray-200" alt="Me" />
              <div className="absolute bottom-0 right-0 bg-[#00a884] rounded-full p-1 border-2 border-white"><Plus className="w-3 h-3 text-white" /></div>
            </div>
            <span className="text-xs text-gray-600">My Status</span>
          </div>
          {statuses.map((s: any) => (
            <div key={s.id} className="flex flex-col items-center gap-1 min-w-[70px]">
              <div className="p-0.5 rounded-full border-2 border-[#00a884]">
                <img src={s.user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.userId}`} className="w-16 h-16 rounded-full border-2 border-white" alt="User" />
              </div>
              <span className="text-xs text-gray-600 truncate w-16 text-center">{s.user?.displayName || "User"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Wall Section */}
      <div className="p-4 space-y-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <textarea placeholder="Share an update..." value={newPost} onChange={(e) => setNewPost(e.target.value)} className="w-full bg-gray-50 border-none outline-none p-3 rounded-xl text-[15px] resize-none h-20 mb-3" />
          <div className="flex justify-between items-center border-t border-gray-50 pt-3">
            <div className="flex gap-5 text-gray-500">
              <ImageIcon className="w-5 h-5 cursor-pointer hover:text-[#00a884]" />
              <VideoIcon className="w-5 h-5 cursor-pointer hover:text-[#00a884]" />
            </div>
            <button onClick={handlePost} className="bg-[#00a884] text-white px-6 py-1.5 rounded-full font-bold text-sm shadow-sm">Post</button>
          </div>
        </div>
        {posts.map((post: any) => (
          <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <img src={post.user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`} className="w-10 h-10 rounded-full" alt="User" />
              <div>
                <h4 className="font-bold text-[#111b21] text-[15px]">{post.user?.displayName}</h4>
                <p className="text-[11px] text-[#667781]">{post.createdAt?.toDate ? formatWhatsAppTime(post.createdAt.toDate()) : ''}</p>
              </div>
            </div>
            <div className="px-4 pb-4 text-[15px] text-[#111b21] leading-relaxed">{post.content}</div>
            <div className="p-2 border-t border-gray-50 flex justify-around text-[#667781] text-sm font-semibold">
              <button className="flex items-center gap-2 py-2 px-6 rounded-xl hover:bg-gray-50 transition-colors"><ThumbsUp className="w-5 h-5" /> Like</button>
              <button className="flex items-center gap-2 py-2 px-6 rounded-xl hover:bg-gray-50 transition-colors"><MessageSquare className="w-5 h-5" /> Comment</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DatingView = ({ user }: any) => (
  <div className="flex-1 flex items-center justify-center p-4 bg-[#f0f2f5]">
    <div className="max-w-sm w-full bg-white rounded-[40px] shadow-2xl overflow-hidden h-[600px] flex flex-col relative border-4 border-white">
      <div className="flex-1 bg-gray-200 relative">
        <img src="https://picsum.photos/seed/dating/400/600" className="w-full h-full object-cover" alt="Discovery" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <h3 className="text-3xl font-bold mb-1">Sarah, 24</h3>
          <p className="text-sm opacity-90 leading-relaxed">Love traveling and coffee. Let's connect and share some stories!</p>
          <div className="flex gap-2 mt-4">
            {['Travel', 'Coffee', 'Music'].map(tag => <span key={tag} className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider">{tag}</span>)}
          </div>
        </div>
      </div>
      <div className="p-6 flex justify-center gap-10 bg-white">
        <button className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:scale-110 transition-transform shadow-lg"><X className="w-8 h-8" /></button>
        <button className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-[#00a884] hover:scale-110 transition-transform shadow-lg"><Heart className="w-8 h-8 fill-current" /></button>
      </div>
    </div>
  </div>
);

const ProfileSettings = ({ user, onBack, onUpdate }: { user: User, onBack: () => void, onUpdate: (u: User) => void }) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [status, setStatus] = useState(user.status || '');
  const [datingBio, setDatingBio] = useState(user.datingProfile?.bio || '');
  const [datingAge, setDatingAge] = useState(user.datingProfile?.age || 18);
  const [saving, setSaving] = useState(false);

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
