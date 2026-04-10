import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  CircleDashed, 
  LayoutGrid, 
  Heart, 
  Settings, 
  Search, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Mic, 
  Send,
  Check,
  CheckCheck,
  User as UserIcon,
  LogOut,
  Plus,
  Image as ImageIcon,
  Video,
  FileText,
  ThumbsUp,
  MessageSquare,
  Share2,
  X,
  ChevronLeft,
  ChevronRight,
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

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't throw here to avoid crashing the whole app, but we log it clearly
}

// --- Components ---

const AuthScreen = () => {
  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center"
      >
        <div className="w-20 h-20 bg-[#25d366] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100">
          <MessageCircle className="text-white w-12 h-12 fill-current" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">WhatsApp Hybrid</h1>
        <p className="text-gray-500 mb-8">Connect, Share, and Discover in one place.</p>
        <button 
          onClick={handleLogin}
          className="w-full bg-[#25d366] hover:bg-[#20bd5b] text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
          Continue with Google
        </button>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'wall' | 'dating' | 'admin'>('chats');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [datingUsers, setDatingUsers] = useState<User[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = doc(db, 'users', firebaseUser.uid);
        const userData: User = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Anonymous',
          photoURL: firebaseUser.photoURL || undefined,
          role: firebaseUser.email === 'alasindani2020@gmail.com' ? 'admin' : 'user',
          isOnline: true,
          lastSeen: serverTimestamp(),
        };
        try {
          await setDoc(userDoc, userData, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Real-time Chats
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });
  }, [user]);

  // Real-time Messages
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, `chats/${selectedChat.id}/messages`),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${selectedChat.id}/messages`);
    });
  }, [selectedChat]);

  // Real-time Posts
  useEffect(() => {
    if (!user || activeTab !== 'wall') return;
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });
  }, [user, activeTab]);

  // Real-time Statuses
  useEffect(() => {
    if (!user || activeTab !== 'status') return;
    const q = query(collection(db, 'statuses'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setStatuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Status)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'statuses');
    });
  }, [user, activeTab]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#f0f2f5]">
      <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
        <motion.div 
          animate={{ x: [-64, 64] }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-full h-full bg-[#25d366]"
        />
      </div>
    </div>
  );

  if (!user) return <AuthScreen />;

  const sendMessage = async (text: string) => {
    if (!selectedChat || !text.trim()) return;
    const msgData = {
      chatId: selectedChat.id,
      senderId: user.uid,
      text,
      type: 'text',
      timestamp: serverTimestamp(),
      status: 'sent'
    };
    await addDoc(collection(db, `chats/${selectedChat.id}/messages`), msgData);
    await updateDoc(doc(db, 'chats', selectedChat.id), {
      lastMessage: { text, senderId: user.uid, timestamp: serverTimestamp() },
      updatedAt: serverTimestamp()
    });
  };

  return (
    <div className="h-screen bg-[#f0f2f5] flex overflow-hidden">
      {/* --- Sidebar --- */}
      <div className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        sidebarOpen ? "w-full md:w-[400px]" : "w-0 md:w-0 overflow-hidden"
      )}>
        {/* Sidebar Header */}
        <div className="bg-[#f0f2f5] p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-10 h-10 rounded-full border border-gray-300" alt="Profile" />
            <span className="font-semibold text-gray-700 hidden md:block">{user.displayName}</span>
          </div>
          <div className="flex items-center gap-4 text-gray-500">
            <button onClick={() => setActiveTab('status')} className={cn("p-2 rounded-full hover:bg-gray-200", activeTab === 'status' && "text-[#25d366]")}><CircleDashed className="w-6 h-6" /></button>
            <button onClick={() => setActiveTab('chats')} className={cn("p-2 rounded-full hover:bg-gray-200", activeTab === 'chats' && "text-[#25d366]")}><MessageCircle className="w-6 h-6" /></button>
            <button onClick={() => setActiveTab('wall')} className={cn("p-2 rounded-full hover:bg-gray-200", activeTab === 'wall' && "text-[#25d366]")}><LayoutGrid className="w-6 h-6" /></button>
            <button onClick={() => setActiveTab('dating')} className={cn("p-2 rounded-full hover:bg-gray-200", activeTab === 'dating' && "text-[#25d366]")}><Heart className="w-6 h-6" /></button>
            <button onClick={() => signOut(auth)} className="p-2 rounded-full hover:bg-gray-200"><LogOut className="w-6 h-6" /></button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2">
          <div className="bg-[#f0f2f5] flex items-center gap-4 px-4 py-1.5 rounded-lg">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search or start new chat" className="bg-transparent border-none outline-none w-full text-sm py-1" />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <div 
              key={chat.id}
              onClick={() => { setSelectedChat(chat); if (window.innerWidth < 768) setSidebarOpen(false); }}
              className={cn(
                "flex items-center gap-3 p-3 cursor-pointer hover:bg-[#f5f6f6] border-b border-gray-100",
                selectedChat?.id === chat.id && "bg-[#ebebeb]"
              )}
            >
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`} className="w-12 h-12 rounded-full" alt="Chat" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <h3 className="font-semibold text-gray-900 truncate">{chat.groupName || "Chat"}</h3>
                  <span className="text-xs text-gray-500">{chat.updatedAt?.toDate ? formatWhatsAppTime(chat.updatedAt.toDate()) : ''}</span>
                </div>
                <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                  {chat.lastMessage?.senderId === user.uid && <CheckCheck className="w-4 h-4 text-[#53bdeb]" />}
                  {chat.lastMessage?.text || "Start a conversation"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative">
        {activeTab === 'chats' && selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-[#f0f2f5] p-3 flex items-center justify-between border-l border-gray-300">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1 mr-1"><ChevronLeft className="w-6 h-6" /></button>
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedChat.id}`} className="w-10 h-10 rounded-full" alt="Chat" />
                <div>
                  <h3 className="font-semibold text-gray-800">{selectedChat.groupName || "Chat"}</h3>
                  <p className="text-xs text-gray-500">online</p>
                </div>
              </div>
              <div className="flex items-center gap-5 text-gray-500">
                <Search className="w-5 h-5 cursor-pointer" />
                <MoreVertical className="w-5 h-5 cursor-pointer" />
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={cn(
                    "flex w-full mb-1",
                    msg.senderId === user.uid ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[85%] md:max-w-[65%] p-2 rounded-lg shadow-sm relative",
                    msg.senderId === user.uid ? "bg-[#dcf8c6] rounded-tr-none" : "bg-white rounded-tl-none"
                  )}>
                    <p className="text-sm text-gray-800 pr-12">{msg.text}</p>
                    <div className="absolute bottom-1 right-1 flex items-center gap-1">
                      <span className="text-[10px] text-gray-500 uppercase">
                        {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                      </span>
                      {msg.senderId === user.uid && (
                        msg.status === 'seen' ? <CheckCheck className="w-3 h-3 text-[#53bdeb]" /> : <CheckCheck className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="bg-[#f0f2f5] p-3 flex items-center gap-4">
              <div className="flex items-center gap-4 text-gray-500">
                <Smile className="w-6 h-6 cursor-pointer" />
                <Paperclip className="w-6 h-6 cursor-pointer" />
              </div>
              <input 
                type="text" 
                placeholder="Type a message" 
                className="flex-1 bg-white border-none outline-none px-4 py-2.5 rounded-lg text-sm shadow-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <div className="text-gray-500">
                <Mic className="w-6 h-6 cursor-pointer" />
              </div>
            </div>
          </>
        ) : activeTab === 'wall' ? (
          <WallView user={user} posts={posts} />
        ) : activeTab === 'dating' ? (
          <DatingView user={user} />
        ) : activeTab === 'status' ? (
          <StatusView user={user} statuses={statuses} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-64 h-64 bg-white rounded-full flex items-center justify-center mb-8 shadow-inner">
              <MessageCircle className="w-32 h-32 text-gray-200 fill-current" />
            </div>
            <h2 className="text-3xl font-light text-gray-600 mb-4">WhatsApp Web</h2>
            <p className="text-gray-500 max-w-md leading-relaxed">
              Send and receive messages without keeping your phone online. Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
            </p>
            <div className="mt-auto flex items-center gap-2 text-gray-400 text-xs py-8">
              <ShieldCheck className="w-4 h-4" />
              End-to-end encrypted
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-Views ---

const WallView = ({ user, posts }: { user: User, posts: Post[] }) => {
  const [newPost, setNewPost] = useState('');

  const handlePost = async () => {
    if (!newPost.trim()) return;
    await addDoc(collection(db, 'posts'), {
      userId: user.uid,
      content: newPost,
      likes: [],
      createdAt: serverTimestamp(),
      isAd: false,
      user: {
        displayName: user.displayName,
        photoURL: user.photoURL
      }
    });
    setNewPost('');
  };

  const toggleLike = async (post: Post) => {
    const postRef = doc(db, 'posts', post.id);
    if (post.likes.includes(user.uid)) {
      await updateDoc(postRef, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(user.uid) });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Create Post */}
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex gap-4 mb-4">
            <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-10 h-10 rounded-full" alt="User" />
            <textarea 
              placeholder="What's on your mind?" 
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="flex-1 bg-gray-50 border-none outline-none p-3 rounded-xl text-sm resize-none h-24"
            />
          </div>
          <div className="flex justify-between items-center border-t pt-3">
            <div className="flex gap-4 text-gray-500">
              <button className="flex items-center gap-2 hover:text-[#25d366]"><ImageIcon className="w-5 h-5" /> Photo</button>
              <button className="flex items-center gap-2 hover:text-[#25d366]"><Video className="w-5 h-5" /> Video</button>
            </div>
            <button 
              onClick={handlePost}
              className="bg-[#25d366] text-white px-6 py-1.5 rounded-full font-bold text-sm hover:bg-[#20bd5b]"
            >
              Post
            </button>
          </div>
        </div>

        {/* Feed */}
        {posts.map(post => (
          <motion.div 
            layout
            key={post.id} 
            className="bg-white rounded-xl shadow-sm overflow-hidden"
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={post.user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`} className="w-10 h-10 rounded-full" alt="User" />
                <div>
                  <h4 className="font-bold text-gray-900">{post.user?.displayName || "User"}</h4>
                  <p className="text-xs text-gray-500">{post.createdAt?.toDate ? formatWhatsAppTime(post.createdAt.toDate()) : 'Just now'}</p>
                </div>
              </div>
              {post.isAd && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded font-bold uppercase tracking-wider">Sponsored</span>}
            </div>
            <div className="px-4 pb-4">
              <p className="text-gray-800 leading-relaxed">{post.content}</p>
            </div>
            {post.media && post.media.length > 0 && (
              <img src={post.media[0]} className="w-full h-auto max-h-[500px] object-cover" alt="Post content" />
            )}
            <div className="p-3 border-t flex items-center justify-around text-gray-500 text-sm font-medium">
              <button 
                onClick={() => toggleLike(post)}
                className={cn("flex items-center gap-2 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors", post.likes.includes(user.uid) && "text-red-500")}
              >
                <ThumbsUp className={cn("w-5 h-5", post.likes.includes(user.uid) && "fill-current")} />
                {post.likes.length > 0 ? post.likes.length : 'Like'}
              </button>
              <button className="flex items-center gap-2 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors">
                <MessageSquare className="w-5 h-5" /> Comment
              </button>
              <button className="flex items-center gap-2 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors">
                <Share2 className="w-5 h-5" /> Share
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const DatingView = ({ user }: { user: User }) => {
  const [profiles, setProfiles] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchProfiles = async () => {
      const q = query(collection(db, 'users'), limit(20));
      const snap = await getDocs(q);
      setProfiles(snap.docs.map(d => d.data() as User).filter(u => u.uid !== user.uid));
    };
    fetchProfiles();
  }, [user]);

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (direction === 'right') {
      // Handle match logic here
      console.log("Liked:", profiles[currentIndex].displayName);
    }
    setCurrentIndex(prev => prev + 1);
  };

  const currentProfile = profiles[currentIndex];

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="max-w-sm w-full relative h-[600px]">
        <AnimatePresence mode="wait">
          {currentProfile ? (
            <motion.div 
              key={currentProfile.uid}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="absolute inset-0 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="relative flex-1">
                <img 
                  src={currentProfile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentProfile.uid}`} 
                  className="w-full h-full object-cover" 
                  alt="Profile" 
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
                  <h3 className="text-2xl font-bold">{currentProfile.displayName}, {currentProfile.datingProfile?.age || 24}</h3>
                  <p className="text-sm opacity-90 line-clamp-2">{currentProfile.datingProfile?.bio || "No bio yet."}</p>
                </div>
              </div>
              <div className="p-6 flex justify-center gap-8 bg-white">
                <button 
                  onClick={() => handleSwipe('left')}
                  className="w-16 h-16 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-red-200 hover:text-red-500 transition-all"
                >
                  <X className="w-8 h-8" />
                </button>
                <button 
                  onClick={() => handleSwipe('right')}
                  className="w-16 h-16 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-green-200 hover:text-green-500 transition-all"
                >
                  <Heart className="w-8 h-8 fill-current" />
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl shadow-xl">
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                <Heart className="w-10 h-10 text-pink-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">No more profiles</h3>
              <p className="text-gray-500">Check back later for more people in your area!</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const StatusView = ({ user, statuses }: { user: User, statuses: Status[] }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-white p-4 md:p-8">
      <div className="max-w-md mx-auto space-y-8">
        <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl cursor-pointer">
          <div className="relative">
            <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-14 h-14 rounded-full" alt="User" />
            <div className="absolute bottom-0 right-0 bg-[#25d366] rounded-full p-1 border-2 border-white">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <h4 className="font-bold text-gray-900">My Status</h4>
            <p className="text-sm text-gray-500">Tap to add status update</p>
          </div>
        </div>

        <div className="space-y-4">
          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4">Recent Updates</h5>
          {statuses.map(status => (
            <div key={status.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl cursor-pointer">
              <div className="p-0.5 rounded-full border-2 border-[#25d366]">
                <img src={status.user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${status.userId}`} className="w-14 h-14 rounded-full border-2 border-white" alt="User" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{status.user?.displayName || "User"}</h4>
                <p className="text-sm text-gray-500">{status.createdAt?.toDate ? formatWhatsAppTime(status.createdAt.toDate()) : 'Just now'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
