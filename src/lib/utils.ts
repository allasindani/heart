import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWhatsAppTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const day = 24 * 60 * 60 * 1000;

  if (diff < day && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diff < 2 * day) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
}

export function formatLastSeen(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) {
    if (now.getDate() === date.getDate()) {
      return `at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'Yesterday';
  }
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}
