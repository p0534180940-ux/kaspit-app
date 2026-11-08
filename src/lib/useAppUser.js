import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

let cached = null;

// המשתמש המחובר (תפקיד admin / מאמן). null עד שנטען.
export default function useAppUser() {
  const [user, setUser] = useState(cached);
  useEffect(() => {
    if (cached) return;
    base44.auth.me().then((u) => { cached = u; setUser(u); }).catch(() => setUser(null));
  }, []);
  return user;
}