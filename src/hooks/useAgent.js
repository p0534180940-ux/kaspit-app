import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const keyOf = (m) => m.id || `${m.role}|${m.content}`;

function readJson(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}

function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// שומר היסטוריה מקומית של 30 יום, ממזג אליה את מה שהשרת מחזיר
function mergeHistory(local, server) {
  if (!server.length) return local;
  const first = keyOf(server[0]);
  const k = local.findIndex((m) => keyOf(m) === first);
  const base = k >= 0 ? local.slice(0, k) : local;
  const tail = server.map((m) => {
    const prev = local.find((l) => keyOf(l) === keyOf(m));
    return { ...m, _ts: prev?._ts || Date.now() };
  });
  return [...base, ...tail];
}

export function useAgent(agentName, identity) {
  const storageKey = `kasplit_agent_${agentName}_${identity || 'anon'}`;
  const msgCacheKey = storageKey + '_messages';
  const deletedKey = storageKey + '_deleted';
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const unsubRef = useRef(null);
  const archiveRef = useRef([]);
  const deletedRef = useRef(new Set());

  const publish = useCallback(() => {
    writeJson(msgCacheKey, archiveRef.current);
    setMessages(archiveRef.current.filter((m) => !deletedRef.current.has(keyOf(m))));
  }, [msgCacheKey]);

  const applyServer = useCallback((serverMsgs) => {
    archiveRef.current = mergeHistory(archiveRef.current, serverMsgs || []);
    publish();
  }, [publish]);

  const subscribe = useCallback((id) => {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = base44.agents.subscribeToConversation(id, (data) => {
      const msgs = data.messages || [];
      applyServer(msgs);
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant') {
        const pendingTools = last.tool_calls?.some((tc) => ['pending', 'running', 'in_progress'].includes(tc.status));
        if (!pendingTools && last.content) setLoading(false);
      }
    });
  }, [applyServer]);

  useEffect(() => {
    let mounted = true;
    const cutoff = Date.now() - RETENTION_MS;
    archiveRef.current = readJson(msgCacheKey, [])
      .map((m) => ({ ...m, _ts: m._ts || Date.now() }))
      .filter((m) => m._ts >= cutoff);
    deletedRef.current = new Set(readJson(deletedKey, []));
    publish();

    const savedId = localStorage.getItem(storageKey);
    if (!savedId) return;
    setConversationId(savedId);
    base44.agents
      .getConversation(savedId)
      .then((conv) => {
        if (!mounted) return;
        if (conv?.messages?.length) applyServer(conv.messages);
        subscribe(savedId);
      })
      .catch(() => {
        localStorage.removeItem(storageKey);
        setConversationId(null);
      });

    return () => {
      mounted = false;
      if (unsubRef.current) unsubRef.current();
    };
  }, [agentName, identity, storageKey, msgCacheKey, deletedKey, publish, applyServer, subscribe]);

  const send = useCallback(
    async (content) => {
      setLoading(true);
      setError('');
      try {
        let convId = conversationId;
        if (!convId) {
          const conv = await base44.agents.createConversation({ agent_name: agentName, metadata: { name: 'Session' } });
          convId = conv.id;
          setConversationId(convId);
          localStorage.setItem(storageKey, convId);
          subscribe(convId);
        }
        await base44.agents.addMessage({ id: convId }, { role: 'user', content });
      } catch (e) {
        console.error('Agent error:', e);
        setError(e?.message || 'שגיאה. נסה שוב.');
        setLoading(false);
      }
    },
    [agentName, conversationId, storageKey, subscribe]
  );

  const deleteMessage = useCallback((msg) => {
    deletedRef.current.add(keyOf(msg));
    writeJson(deletedKey, [...deletedRef.current]);
    publish();
  }, [deletedKey, publish]);

  const reset = useCallback(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    localStorage.removeItem(storageKey);
    localStorage.removeItem(msgCacheKey);
    localStorage.removeItem(deletedKey);
    archiveRef.current = [];
    deletedRef.current = new Set();
    setConversationId(null);
    setMessages([]);
    setLoading(false);
    setError('');
  }, [storageKey, msgCacheKey, deletedKey]);

  return { messages, loading, error, send, reset, deleteMessage };
}