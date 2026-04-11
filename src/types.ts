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
}

export interface Notification {
  id: string;
  userId: string;
  fromId: string;
  fromName: string;
  type: 'like' | 'comment' | 'message' | 'friend_request' | 'friend_accept';
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
