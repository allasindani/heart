export interface User {
  uid: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  status?: string;
  lastSeen?: any;
  isOnline?: boolean;
  suspended?: boolean;
  role: 'user' | 'admin';
  category: 'General' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  points: number;
  isVerified?: boolean;
  uploadCount?: number;
  matchCount?: number;
  datingProfile?: {
    age: number;
    gender: 'male' | 'female' | 'other';
    bio: string;
    interests: string[];
    photos: string[];
    country?: string;
    city?: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  friends?: string[];
  jobRole?: 'employer' | 'seeker';
  followingEmployers?: string[];
}

export interface Job {
  id: string;
  employerId: string;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Remote';
  salary?: string;
  description: string;
  summary?: string;
  requirements: string[];
  createdAt: any;
  updatedAt: any;
  status: 'open' | 'closed';
  boosted?: boolean;
}

export interface JobApplication {
  id: string;
  jobId: string;
  employerId: string;
  seekerId: string;
  seekerName: string;
  seekerPhoto?: string;
  status: 'applied' | 'reviewed' | 'accepted' | 'rejected';
  timestamp: any;
  coverLetter?: string;
}

export interface Notification {
  id: string;
  userId: string;
  fromId: string;
  fromName: string;
  type: 'like' | 'comment' | 'message' | 'friend_request' | 'friend_accept' | 'job_update';
  text: string;
  read: boolean;
  timestamp: any;
  relatedId?: string;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  toId: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: any;
}

export interface Chat {
  id: string;
  participants: string[];
  type: 'private' | 'group';
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
    status: 'sent' | 'delivered' | 'seen';
  };
  updatedAt: any;
  groupName?: string;
  groupPhoto?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'document';
  fileUrl?: string;
  fileName?: string;
  timestamp: any;
  status: 'sent' | 'delivered' | 'seen';
  reactions?: Record<string, string>;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  media?: string[];
  likes: string[];
  createdAt: any;
  isAd: boolean;
  adLink?: string;
  adCost?: number;
  hashtags?: string[];
  isReel?: boolean;
  commentCount: number;
  user?: {
    displayName: string;
    photoURL?: string;
  };
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: any;
}

export interface AppSettings {
  pointsPerPost: number;
  pointsPerComment: number;
  pointsPerLike: number;
  moneyPerPoint: number;
  tierPrices: Record<string, number>;
  tierDurations: Record<string, string>;
  adPricePerDay: number;
  minAdDuration: number;
  paymentMethods: { type: string, details: string }[];
  googleAnalyticsCode?: string;
  adSenseCode?: string;
  siteName?: string;
  logoUrl?: string;
  faviconUrl?: string;
}

export interface PaymentProof {
  id: string;
  userId: string;
  userName: string;
  tier: string;
  amount: number;
  proofUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: any;
}

export interface Status {
  id: string;
  userId: string;
  type: 'text' | 'image' | 'video';
  content: string;
  createdAt: any;
  expiresAt: any;
  user?: {
    displayName: string;
    photoURL?: string;
  };
}
