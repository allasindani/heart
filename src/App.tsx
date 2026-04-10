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
  ShieldCheck,
  Camera,
  Phone,
  Video as VideoIcon
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
}

// --- Components ---

const AuthScreen = () => {
  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  return (
    <div className="min-h-screen bg-[#00a884] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center"
      >
        <div className="w-20 h-20 bg-[#25d366] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
          <MessageCircle className="text-white w-12 h-12 fill-current" />
        </div>
        <h1 className="text-3xl font-bold text-[#111b21] mb-2">Heart Connect</h1>
        <p className="text-[#667781] mb-8">Simple. Secure. Reliable messaging.</p>
        <button 
          onClick={handleLogin}
          className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white font-bold py-4 rounded-full transition-all shadow-lg flex items-center justify-center gap-3"
        >
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
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'dating' | 'wall'>('chats');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Real-time Data Listeners (Same as before but with reordered tabs)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'chats'));
  }, [user]);

  useEffect(() => {
    if (!selectedChat) return;
    const q = query(collection(db, `chats/${selectedChat.id}/messages`), orderBy('timestamp', 'asc'), limit(100));
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `messages`));
  }, [selectedChat]);

  useEffect(() => {
    if (!user || activeTab !== 'wall') return;
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'posts'));
  }, [user, activeTab]);

  useEffect(() => {
    if (!user || activeTab !== 'status') return;
    const q = query(collection(db, 'statuses'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setStatuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Status)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'statuses'));
  }, [user, activeTab]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-16 h-16 mb-8">
        <MessageCircle className="w-full h-full text-[#25d366] fill-current animate-pulse" />
      </div>
      <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
        <motion.div 
          animate={{ x: [-192, 192] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-full h-full bg-[#00a884]"
        />
      </div>
      <p className="mt-4 text-[#667781] text-sm font-medium">Heart Connect</p>
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
    <div className="h-screen bg-[#f0f2f5] flex flex-col overflow-hidden max-w-[1600px] mx-auto shadow-2xl">
      {/* Desktop Layout: Sidebar + Main */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar (Chat List) */}
        <div className={cn(
          "bg-white border-r border-[#d1d7db] flex flex-col transition-all duration-300 z-20",
          isMobile && selectedChat ? "hidden" : "w-full md:w-[400px] lg:w-[450px]"
        )}>
          {/* Header */}
          <div className="bg-[#f0f2f5] p-3 flex items-center justify-between">
            <img 
              src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              className="w-10 h-10 rounded-full cursor-pointer" 
              alt="Me" 
            />
            <div className="flex items-center gap-2 text-[#54656f]">
              <button onClick={() => setActiveTab('wall')} className={cn("p-2 rounded-full hover:bg-[#d1d7db]", activeTab === 'wall' && "text-[#00a884]")}><LayoutGrid className="w-6 h-6" /></button>
              <button onClick={() => setActiveTab('status')} className={cn("p-2 rounded-full hover:bg-[#d1d7db]", activeTab === 'status' && "text-[#00a884]")}><CircleDashed className="w-6 h-6" /></button>
              <button onClick={() => setActiveTab('dating')} className={cn("p-2 rounded-full hover:bg-[#d1d7db]", activeTab === 'dating' && "text-[#00a884]")}><Heart className="w-6 h-6" /></button>
              <button onClick={() => setActiveTab('chats')} className={cn("p-2 rounded-full hover:bg-[#d1d7db]", activeTab === 'chats' && "text-[#00a884]")}><MessageCircle className="w-6 h-6" /></button>
              <button className="p-2 rounded-full hover:bg-[#d1d7db]"><MoreVertical className="w-6 h-6" /></button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-2 border-b border-[#f0f2f5]">
            <div className="bg-[#f0f2f5] flex items-center gap-4 px-4 py-1.5 rounded-lg">
              <Search className="w-5 h-5 text-[#8696a0]" />
              <input type="text" placeholder="Search or start new chat" className="bg-transparent border-none outline-none w-full text-sm py-1 placeholder-[#8696a0]" />
            </div>
          </div>

          {/* Tab Content in Sidebar */}
          <div className="flex-1 overflow-y-auto bg-white">
            {activeTab === 'chats' && (
              chats.map(chat => (
                <div 
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer hover:bg-[#f5f6f6] border-b border-[#f0f2f5] transition-colors",
                    selectedChat?.id === chat.id && "bg-[#f0f2f5]"
                  )}
                >
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`} className="w-12 h-12 rounded-full" alt="Chat" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h3 className="font-medium text-[#111b21] truncate">{chat.groupName || "Chat"}</h3>
                      <span className="text-xs text-[#667781]">{chat.updatedAt?.toDate ? formatWhatsAppTime(chat.updatedAt.toDate()) : ''}</span>
                    </div>
                    <p className="text-sm text-[#667781] truncate flex items-center gap-1">
                      {chat.lastMessage?.senderId === user.uid && <CheckCheck className="w-4 h-4 text-[#53bdeb]" />}
                      {chat.lastMessage?.text || "Start a conversation"}
                    </p>
                  </div>
                </div>
              ))
            )}
            {activeTab === 'status' && <StatusList user={user} statuses={statuses} />}
            {activeTab === 'dating' && <div className="p-4 text-center text-[#667781]">Swipe in the main view to find matches!</div>}
            {activeTab === 'wall' && <div className="p-4 text-center text-[#667781]">Check the wall in the main view!</div>}
          </div>
        </div>

        {/* Main Content (Conversation / Tab Content) */}
        <div className={cn(
          "flex-1 flex flex-col bg-[#efeae2] relative",
          isMobile && !selectedChat && activeTab === 'chats' ? "hidden" : "flex"
        )}>
          {selectedChat && activeTab === 'chats' ? (
            <ChatView 
              user={user} 
              chat={selectedChat} 
              messages={messages} 
              onBack={() => setSelectedChat(null)} 
              onSendMessage={sendMessage}
            />
          ) : activeTab === 'wall' ? (
            <WallView user={user} posts={posts} />
          ) : activeTab === 'dating' ? (
            <DatingView user={user} />
          ) : activeTab === 'status' ? (
            <StatusView user={user} statuses={statuses} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#f8f9fa] border-l border-[#d1d7db]">
              <div className="w-64 h-64 bg-white rounded-full flex items-center justify-center mb-8 shadow-sm">
                <MessageCircle className="w-32 h-32 text-[#e9edef] fill-current" />
              </div>
              <h2 className="text-3xl font-light text-[#41525d] mb-4">Heart Connect</h2>
              <p className="text-[#667781] max-w-md leading-relaxed text-sm">
                Send and receive messages without keeping your phone online.<br/>
                Use Heart Connect on up to 4 linked devices and 1 phone at the same time.
              </p>
              <div className="mt-auto flex items-center gap-2 text-[#8696a0] text-xs py-8">
                <ShieldCheck className="w-4 h-4" />
                End-to-end encrypted
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-Components ---

const ChatView = ({ user, chat, messages, onBack, onSendMessage }: any) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-[#f0f2f5] p-3 flex items-center justify-between border-l border-[#d1d7db] z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-1 mr-1 text-[#54656f]"><ChevronLeft className="w-6 h-6" /></button>
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`} className="w-10 h-10 rounded-full" alt="Chat" />
          <div className="cursor-pointer">
            <h3 className="font-medium text-[#111b21]">{chat.groupName || "Chat"}</h3>
            <p className="text-xs text-[#667781]">online</p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-[#54656f]">
          <VideoIcon className="w-5 h-5 cursor-pointer" />
          <Phone className="w-5 h-5 cursor-pointer" />
          <div className="w-[1px] h-6 bg-[#d1d7db] mx-1" />
          <Search className="w-5 h-5 cursor-pointer" />
          <MoreVertical className="w-5 h-5 cursor-pointer" />
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat"
      >
        {messages.map((msg: any) => (
          <div 
            key={msg.id}
            className={cn("flex w-full mb-1", msg.senderId === user.uid ? "justify-end" : "justify-start")}
          >
            <div className={cn(
              "max-w-[85%] md:max-w-[65%] p-1.5 px-2 rounded-lg shadow-sm relative min-w-[80px]",
              msg.senderId === user.uid ? "bg-[#dcf8c6] rounded-tr-none" : "bg-white rounded-tl-none"
            )}>
              <p className="text-[14.2px] text-[#111b21] pr-12 leading-relaxed">{msg.text}</p>
              <div className="absolute bottom-1 right-1.5 flex items-center gap-1">
                <span className="text-[10px] text-[#667781] uppercase">
                  {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                </span>
                {msg.senderId === user.uid && (
                  msg.status === 'seen' ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /> : <CheckCheck className="w-3.5 h-3.5 text-[#8696a0]" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input */}
      <div className="bg-[#f0f2f5] p-2.5 flex items-center gap-3">
        <div className="flex items-center gap-3 text-[#54656f]">
          <Smile className="w-6 h-6 cursor-pointer" />
          <Paperclip className="w-6 h-6 cursor-pointer" />
        </div>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message" 
          className="flex-1 bg-white border-none outline-none px-4 py-2.5 rounded-lg text-[15px] shadow-sm placeholder-[#8696a0]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              onSendMessage(input);
              setInput('');
            }
          }}
        />
        <div className="text-[#54656f]">
          {input.trim() ? (
            <button onClick={() => { onSendMessage(input); setInput(''); }} className="p-2"><Send className="w-6 h-6 text-[#00a884]" /></button>
          ) : (
            <Mic className="w-6 h-6 cursor-pointer" />
          )}
        </div>
      </div>
    </div>
  );
};

const StatusList = ({ user, statuses }: any) => (
  <div className="divide-y divide-[#f0f2f5]">
    <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#f5f6f6]">
      <div className="relative">
        <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-12 h-12 rounded-full" alt="Me" />
        <div className="absolute bottom-0 right-0 bg-[#00a884] rounded-full p-0.5 border-2 border-white">
          <Plus className="w-3 h-3 text-white" />
        </div>
      </div>
      <div>
        <h4 className="font-medium text-[#111b21]">My Status</h4>
        <p className="text-sm text-[#667781]">Tap to add status update</p>
      </div>
    </div>
    <div className="p-3 text-xs font-semibold text-[#00a884] uppercase tracking-wider bg-white">Recent Updates</div>
    {statuses.map((s: any) => (
      <div key={s.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#f5f6f6]">
        <div className="p-0.5 rounded-full border-2 border-[#00a884]">
          <img src={s.user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.userId}`} className="w-12 h-12 rounded-full border-2 border-white" alt="User" />
        </div>
        <div>
          <h4 className="font-medium text-[#111b21]">{s.user?.displayName || "User"}</h4>
          <p className="text-sm text-[#667781]">{s.createdAt?.toDate ? formatWhatsAppTime(s.createdAt.toDate()) : 'Just now'}</p>
        </div>
      </div>
    ))}
  </div>
);

const WallView = ({ user, posts }: any) => {
  const [newPost, setNewPost] = useState('');
  return (
    <div className="flex-1 overflow-y-auto bg-[#f0f2f5] p-4">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#d1d7db]">
          <textarea 
            placeholder="Share something with the community..." 
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            className="w-full bg-[#f8f9fa] border-none outline-none p-3 rounded-xl text-sm resize-none h-24 mb-3"
          />
          <div className="flex justify-between items-center border-t border-[#f0f2f5] pt-3">
            <div className="flex gap-4 text-[#54656f]">
              <ImageIcon className="w-5 h-5 cursor-pointer hover:text-[#00a884]" />
              <VideoIcon className="w-5 h-5 cursor-pointer hover:text-[#00a884]" />
            </div>
            <button className="bg-[#00a884] text-white px-6 py-1.5 rounded-full font-bold text-sm hover:bg-[#008f6f]">Post</button>
          </div>
        </div>
        {posts.map((post: any) => (
          <div key={post.id} className="bg-white rounded-xl shadow-sm border border-[#d1d7db] overflow-hidden">
            <div className="p-3 flex items-center gap-3">
              <img src={post.user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`} className="w-10 h-10 rounded-full" alt="User" />
              <div>
                <h4 className="font-bold text-[#111b21] text-sm">{post.user?.displayName}</h4>
                <p className="text-[10px] text-[#667781]">{post.createdAt?.toDate ? formatWhatsAppTime(post.createdAt.toDate()) : ''}</p>
              </div>
            </div>
            <div className="px-4 pb-3 text-[14px] text-[#111b21]">{post.content}</div>
            <div className="p-2 border-t border-[#f0f2f5] flex justify-around text-[#667781] text-xs font-semibold">
              <button className="flex items-center gap-2 py-1 px-4 rounded hover:bg-[#f8f9fa]"><ThumbsUp className="w-4 h-4" /> Like</button>
              <button className="flex items-center gap-2 py-1 px-4 rounded hover:bg-[#f8f9fa]"><MessageSquare className="w-4 h-4" /> Comment</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DatingView = ({ user }: any) => (
  <div className="flex-1 flex items-center justify-center p-4 bg-[#f0f2f5]">
    <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl overflow-hidden h-[600px] flex flex-col border border-[#d1d7db]">
      <div className="flex-1 bg-gray-200 relative">
        <img src="https://picsum.photos/seed/dating/400/600" className="w-full h-full object-cover" alt="Discovery" />
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
          <h3 className="text-2xl font-bold">Sarah, 24</h3>
          <p className="text-sm opacity-90">Love traveling and coffee. Let's connect!</p>
        </div>
      </div>
      <div className="p-6 flex justify-center gap-8">
        <button className="w-14 h-14 rounded-full border border-gray-200 flex items-center justify-center text-red-500 hover:bg-red-50 transition-all shadow-sm"><X className="w-7 h-7" /></button>
        <button className="w-14 h-14 rounded-full border border-gray-200 flex items-center justify-center text-[#00a884] hover:bg-green-50 transition-all shadow-sm"><Heart className="w-7 h-7 fill-current" /></button>
      </div>
    </div>
  </div>
);

const StatusView = ({ user, statuses }: any) => (
  <div className="flex-1 bg-[#f0f2f5] p-4 flex flex-col items-center justify-center text-center">
    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
      <CircleDashed className="w-10 h-10 text-[#00a884]" />
    </div>
    <h3 className="text-lg font-medium text-[#41525d]">Status Updates</h3>
    <p className="text-sm text-[#667781] max-w-xs mt-2">View updates from your contacts that disappear after 24 hours.</p>
  </div>
);
