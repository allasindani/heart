export interface User {
  uid: string;
  displayName: string;
  photoURL?: string;
  status?: string;
  lastSeen?: any;
  isOnline?: boolean;
  role: 'user' | 'admin';
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
}

export interface Chat {
  id: string;
  participants: string[];
  type: 'private' | 'group';
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
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
  user?: {
    displayName: string;
    photoURL?: string;
  };
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
