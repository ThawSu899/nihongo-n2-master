import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  BookmarkPlus,
  BookmarkCheck,
  HelpCircle,
  BookOpen,
  Languages,
  PenTool,
  WifiOff,
  AlertCircle,
  GraduationCap,
  FileText,
  Plus,
  Search,
  PanelLeft,
  PanelLeftClose,
  Square,
  Edit2,
  MessageSquare,
  X,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import { UserProfile, LessonPack } from '../../domain/models/types';
import { db, AINoteRecord, AIChatSession, AIChatMessage } from '../../data/db/dexie-db';
import { ContentLoader } from '../../data/content/content-loader';
import {
  TutorMode,
  JLPTLevel,
  ExplanationLanguage,
  AITutorRequest,
  CompactLessonContext,
} from '../../../server/gemini-tutor-service';
import {
  streamAITutor,
  buildCompactLessonContext,
} from '../../services/ai-tutor-client';
import { diagnoseLearnerFromDB } from '../../domain/ai-learning/weakness-diagnosis';
import {
  buildLearnerDiagnosticDigest,
  getPersonalizationConsent,
} from '../../domain/ai-learning/learner-context';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  mode?: TutorMode;
  savedNoteId?: string;
  isStreaming?: boolean;
}

interface AITutorScreenProps {
  profile: UserProfile;
  initialLessonId?: string;
  onNavigate?: (view: string) => void;
  onOpenLesson?: (lessonId: string) => void;
}

const MODE_DEFINITIONS: Array<{
  id: TutorMode;
  nameEn: string;
  nameMy: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    id: 'ask',
    nameEn: 'Ask AI',
    nameMy: 'အထွေထွေ မေးမြန်းမည်',
    icon: HelpCircle,
    description: 'Ask any Japanese language or JLPT preparation question.',
  },
  {
    id: 'grammar',
    nameEn: 'Grammar Tutor',
    nameMy: 'သဒ္ဒါလမ်းညွှန်',
    icon: BookOpen,
    description: 'Deep dive into grammar meaning, formation, nuance, and comparisons.',
  },
  {
    id: 'vocabulary',
    nameEn: 'Vocabulary Tutor',
    nameMy: 'ဝေါဟာရလမ်းညွှန်',
    icon: Languages,
    description: 'Explore word meanings, readings, collocations, and example sentences.',
  },
  {
    id: 'kanji',
    nameEn: 'Kanji Tutor',
    nameMy: 'ခန်းဂျီးလမ်းညွှန်',
    icon: FileText,
    description: 'Study Onyomi, Kunyomi, stroke orders, radicals, and compound words.',
  },
  {
    id: 'quiz',
    nameEn: 'Interactive Quiz',
    nameMy: 'ဉာဏ်စမ်းစစ်ဆေးမှု',
    icon: GraduationCap,
    description: 'Step-by-step interactive questions with hints and detailed feedback.',
  },
  {
    id: 'correction',
    nameEn: 'Sentence Correction',
    nameMy: 'စာကြောင်း ပြင်ဆင်မည်',
    icon: PenTool,
    description: 'Submit Japanese sentences for grammatical and naturalness review.',
  },
  {
    id: 'learning',
    nameEn: 'My Learning Advisor',
    nameMy: 'ကိုယ်ပိုင် လမ်းညွှန် (AI 分析)',
    icon: TrendingUp,
    description: 'Personalized AI tutor analyzing your real weaknesses, mistakes, and study plan.',
  },
];

export const AITutorScreen: React.FC<AITutorScreenProps> = ({
  profile,
  initialLessonId,
  onNavigate,
  onOpenLesson,
}) => {
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sessionSearchQuery, setSessionSearchQuery] = useState<string>('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  // Mode and context controls
  const [mode, setMode] = useState<TutorMode>('ask');
  const [level, setLevel] = useState<JLPTLevel>(() => (profile?.level as JLPTLevel) || 'N5');
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    () => initialLessonId || profile?.currentLessonId || 'n5.l01'
  );
  const [language, setLanguage] = useState<ExplanationLanguage>('my');
  const [attachContext, setAttachContext] = useState<boolean>(true);

  // Lesson pack caching
  const [lessonPack, setLessonPack] = useState<LessonPack | null>(null);
  const [, setIsLoadingPack] = useState<boolean>(false);

  // Chat message state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(
    () => typeof navigator !== 'undefined' && navigator.onLine === false
  );

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoteMap, setSavedNoteMap] = useState<Record<string, string>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const streamingTextRef = useRef<string>('');

  // Monitor network online / offline events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Retrieve published curriculum map for lesson selection
  const curriculumMap = useMemo(() => {
    return ContentLoader.getCurriculumMap().filter((item) => item.status === 'published');
  }, []);

  const lessonsForSelectedLevel = useMemo(() => {
    return curriculumMap.filter((item) => item.level === level);
  }, [curriculumMap, level]);

  // Adjust selected lesson if level changes
  useEffect(() => {
    const matchesLevel = selectedLessonId.toLowerCase().startsWith(level.toLowerCase());
    if (!matchesLevel && lessonsForSelectedLevel.length > 0) {
      setSelectedLessonId(lessonsForSelectedLevel[0].id);
    }
  }, [level, selectedLessonId, lessonsForSelectedLevel]);

  // Lazily load selected lesson pack for compact context
  useEffect(() => {
    let isCancelled = false;
    async function loadPack() {
      if (!selectedLessonId) return;
      setIsLoadingPack(true);
      try {
        const pack = await ContentLoader.getLessonPack(selectedLessonId);
        if (!isCancelled && pack) {
          setLessonPack(pack);
        }
      } catch (e) {
        console.warn('[AITutorScreen] Failed to load pack for context:', e);
      } finally {
        if (!isCancelled) setIsLoadingPack(false);
      }
    }
    loadPack();
    return () => {
      isCancelled = true;
    };
  }, [selectedLessonId]);

  // Derive compact context from lesson pack
  const compactContext: CompactLessonContext | undefined = useMemo(() => {
    if (!attachContext || !lessonPack) return undefined;
    return buildCompactLessonContext(lessonPack);
  }, [attachContext, lessonPack]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isStreaming]);

  // Helper to generate a welcome message
  const getWelcomeMessage = useCallback(
    (curMode: TutorMode, curLevel: JLPTLevel): ChatMessage => {
      const isBurmese = language === 'my';
      let text = isBurmese
        ? `မင်္ဂလာပါ! ကျွန်တော်သည် JLPT ${curLevel} အတွက် အထူးပြု AI ဂျပန်စာဆရာ (AI 先生) ဖြစ်ပါသည်။ သဒ္ဒါ၊ ဝေါဟာရ၊ ခန်းဂျီး သို့မဟုတ် စာကြောင်းပြင်ဆင်မှုများနှင့် ပတ်သက်၍ သိလိုသည်များကို မေးမြန်းနိုင်ပါသည်။`
        : `Hello! I am your AI Japanese Tutor specializing in JLPT ${curLevel}. Feel free to ask about grammar, vocabulary, kanji, quizzes, or sentence proofreading!`;

      if (curMode === 'quiz') {
        text = isBurmese
          ? `ဉာဏ်စမ်းစစ်ဆေးမှု ကဏ္ဍမှ ကြိုဆိုပါသည်။ JLPT ${curLevel} သင်ခန်းစာများအတွက် ရွေးချယ်မှု မေးခွန်းများကို အဆင့်ဆင့် ဖြေဆိုနိုင်ပါသည်။ အဆင်သင့်ဖြစ်ပါက စတင်မေးမြန်းခိုင်းနိုင်ပါသည်။`
          : `Welcome to the Interactive Quiz mode! I will present JLPT ${curLevel} questions one by one with hints and detailed explanations. Ready to start?`;
      } else if (curMode === 'correction') {
        text = isBurmese
          ? `စာကြောင်းစစ်ဆေးမှု ကဏ္ဍမှ ကြိုဆိုပါသည်။ သင်ရေးသားထားသော ဂျပန်စာကြောင်းကို ရိုက်ထည့်ပေးပါ။ သဒ္ဒါ၊ ဝါစင်္ဂ (助詞) နှင့် သဘာဝကျမှုတို့ကို စစ်ဆေးပြင်ဆင်ပေးပါမည်။`
          : `Welcome to Sentence Correction mode! Paste any Japanese sentences you wrote, and I will review particles, grammar, and natural phrasing.`;
      } else if (curMode === 'learning') {
        text = isBurmese
          ? `ကိုယ်ပိုင် လေ့လာမှု လမ်းညွှန် (Personalized Learning Advisor) မှ ကြိုဆိုပါသည်။ သင်၏ အားနည်းချက်များ၊ မှားလေ့ရှိသော အချက်များနှင့် နေ့စဉ် လေ့လာသင့်သည့် အစီအစဉ်များကို သုံးသပ်အကြံပြုပေးပါမည်။`
          : `Welcome to My Learning Advisor! I analyze your real practice history and errors to provide tailored diagnoses, targeted drill exercises, and daily study advice.`;
      }

      return {
        id: `welcome_${Date.now()}`,
        role: 'model',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: curMode,
      };
    },
    [language]
  );

  // Load chat messages for a specific session from Dexie
  const loadSessionMessages = useCallback(
    async (sessionId: string, sessionMode: TutorMode, sessionLevel: JLPTLevel) => {
      try {
        const storedMessages = await db.ai_messages
          .where('sessionId')
          .equals(sessionId)
          .sortBy('createdAt');

        if (storedMessages.length > 0) {
          const mapped: ChatMessage[] = storedMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: !isNaN(new Date(m.createdAt).getTime())
              ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            mode: m.mode,
            savedNoteId: m.savedNoteId,
          }));
          setMessages(mapped);
        } else {
          setMessages([getWelcomeMessage(sessionMode, sessionLevel)]);
        }
      } catch (err) {
        console.error('[AITutorScreen] Failed to load session messages:', err);
        setMessages([getWelcomeMessage(sessionMode, sessionLevel)]);
      }
    },
    [getWelcomeMessage]
  );

  // Initialize sessions on mount
  useEffect(() => {
    let isCancelled = false;

    async function initSessions() {
      try {
        const loadedSessions = await db.ai_sessions.orderBy('updatedAt').reverse().toArray();

        if (isCancelled) return;

        if (loadedSessions.length > 0) {
          setSessions(loadedSessions);
          const firstSession = loadedSessions[0];
          setActiveSessionId(firstSession.id);
          setMode(firstSession.mode);
          setLevel(firstSession.level);
          if (firstSession.lessonId) setSelectedLessonId(firstSession.lessonId);
          await loadSessionMessages(firstSession.id, firstSession.mode, firstSession.level);
        } else {
          // Create initial default session
          const now = new Date().toISOString();
          const defaultSession: AIChatSession = {
            id: `session_${Date.now()}`,
            title: 'စကားပြောဆိုမှုအသစ် (New Chat)',
            mode: 'ask',
            level: (profile?.level as JLPTLevel) || 'N5',
            lessonId: initialLessonId || profile?.currentLessonId || 'n5.l01',
            createdAt: now,
            updatedAt: now,
          };
          await db.ai_sessions.put(defaultSession);
          if (isCancelled) return;
          setSessions([defaultSession]);
          setActiveSessionId(defaultSession.id);
          setMode(defaultSession.mode);
          setLevel(defaultSession.level);
          setMessages([getWelcomeMessage(defaultSession.mode, defaultSession.level)]);
        }
      } catch (err) {
        console.error('[AITutorScreen] Failed to initialize AI sessions:', err);
      }
    }

    initSessions();

    return () => {
      isCancelled = true;
    };
  }, [profile, initialLessonId, loadSessionMessages, getWelcomeMessage]);

  // Create a brand new session
  const handleCreateNewSession = async (customMode?: TutorMode) => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
    setErrorMessage(null);

    const targetMode = customMode || mode;
    const now = new Date().toISOString();
    const newSession: AIChatSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: 'စကားပြောဆိုမှုအသစ် (New Chat)',
      mode: targetMode,
      level,
      lessonId: selectedLessonId,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.ai_sessions.put(newSession);
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setMode(targetMode);
      setMessages([getWelcomeMessage(targetMode, level)]);
    } catch (err) {
      console.error('[AITutorScreen] Failed to create session:', err);
    }
  };

  // Switch to another session
  const handleSelectSession = async (session: AIChatSession) => {
    if (session.id === activeSessionId) return;

    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
    setErrorMessage(null);

    setActiveSessionId(session.id);
    setMode(session.mode);
    setLevel(session.level);
    if (session.lessonId) setSelectedLessonId(session.lessonId);
    await loadSessionMessages(session.id, session.mode, session.level);
  };

  // Delete a session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('ဒီစကားပြောဆိုမှု မှတ်တမ်းကို ဖျက်လိုပါသလား။ (Delete chat?)')) {
      return;
    }

    try {
      await db.ai_messages.where('sessionId').equals(sessionId).delete();
      await db.ai_sessions.delete(sessionId);

      const remaining = sessions.filter((s) => s.id !== sessionId);
      setSessions(remaining);

      if (sessionId === activeSessionId) {
        if (remaining.length > 0) {
          handleSelectSession(remaining[0]);
        } else {
          handleCreateNewSession();
        }
      }
    } catch (err) {
      console.error('[AITutorScreen] Failed to delete session:', err);
    }
  };

  // Rename a session
  const handleStartRename = (session: AIChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveRename = async (sessionId: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingSessionId(null);
      return;
    }

    try {
      await db.ai_sessions.update(sessionId, {
        title: trimmed,
        updatedAt: new Date().toISOString(),
      });
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: trimmed } : s))
      );
    } catch (err) {
      console.error('[AITutorScreen] Failed to rename session:', err);
    } finally {
      setEditingSessionId(null);
    }
  };

  // Copy text to clipboard
  const handleCopy = async (messageId: string, text: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedId(messageId);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  // Save explanation to existing Dexie ai_notes table
  const handleSaveToNotes = async (message: ChatMessage, prevUserMessage?: ChatMessage) => {
    try {
      const noteId = `ai_note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const topicTitle = `${mode.toUpperCase()} - ${lessonPack?.title || selectedLessonId || level}`;

      const note: AINoteRecord = {
        id: noteId,
        topic: topicTitle,
        prompt: prevUserMessage?.content || 'Learner question',
        response: message.content,
        provenance: 'ai',
        status: 'ai_draft',
        createdAt: new Date().toISOString(),
      };

      await db.ai_notes.put(note);
      setSavedNoteMap((prev) => ({ ...prev, [message.id]: noteId }));
    } catch (err: any) {
      console.error('Failed to save AI note:', err);
      setErrorMessage(`Failed to save note: ${err?.message || 'Database error'}`);
    }
  };

  // Clear current conversation messages
  const handleClearChat = async () => {
    if (!activeSessionId) return;
    if (messages.length <= 1 || window.confirm('စကားပြောဆိုမှု မှတ်တမ်းအားလုံးကို ရှင်းလင်းလိုပါသလား။')) {
      try {
        await db.ai_messages.where('sessionId').equals(activeSessionId).delete();
        setMessages([getWelcomeMessage(mode, level)]);
        setErrorMessage(null);
      } catch (err) {
        console.error('[AITutorScreen] Failed to clear chat:', err);
      }
    }
  };

  // Stop Generation button handler
  const handleStopGeneration = () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsLoading(false);

    // Persist whatever was accumulated so far, but ONLY if non-empty
    const finalContent = streamingTextRef.current.trim();
    if (finalContent) {
      setMessages((prev) =>
        prev.map((m) =>
          m.isStreaming ? { ...m, isStreaming: false, content: finalContent } : m
        )
      );
      if (activeSessionId) {
        const msgId = `model_${Date.now()}`;
        const msg: AIChatMessage = {
          id: msgId,
          sessionId: activeSessionId,
          role: 'model',
          content: finalContent,
          mode,
          createdAt: new Date().toISOString(),
        };
        db.ai_messages.put(msg).catch((e) => console.warn('Failed to save partial stream:', e));
      }
    } else {
      // Do NOT save an empty assistant message to IndexedDB, remove empty placeholder from UI
      setMessages((prev) => prev.filter((m) => !(m.isStreaming && !m.content.trim())));
    }
  };

  // Send message to Gemini with live streaming
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : input;
    const text = rawText.trim();
    if (!text || isLoading || isStreaming || isOffline) return;

    setErrorMessage(null);

    // Current active session check
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const newSession: AIChatSession = {
        id: `session_${Date.now()}`,
        title: text.slice(0, 30),
        mode,
        level,
        lessonId: selectedLessonId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.ai_sessions.put(newSession);
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      currentSessionId = newSession.id;
    }

    const userMsgId = `user_${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode,
    };

    // Persist user message to Dexie
    const dbUserMsg: AIChatMessage = {
      id: userMsgId,
      sessionId: currentSessionId,
      role: 'user',
      content: text,
      mode,
      createdAt: new Date().toISOString(),
    };
    await db.ai_messages.put(dbUserMsg);

    // Auto-update session title if it was the default title
    const currentSession = sessions.find((s) => s.id === currentSessionId);
    if (
      currentSession &&
      (currentSession.title.includes('စကားပြောဆိုမှုအသစ်') ||
        currentSession.title.includes('New Chat') ||
        messages.filter((m) => m.role === 'user').length === 0)
    ) {
      const generatedTitle = text.slice(0, 28) + (text.length > 28 ? '...' : '');
      await db.ai_sessions.update(currentSessionId, {
        title: generatedTitle,
        updatedAt: new Date().toISOString(),
      });
      setSessions((prev) =>
        prev.map((s) => (s.id === currentSessionId ? { ...s, title: generatedTitle } : s))
      );
    } else {
      await db.ai_sessions.update(currentSessionId, {
        updatedAt: new Date().toISOString(),
      });
    }

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);

    // Prepare history: drop any entry where content is missing or content.trim().length === 0
    const filteredHistory = newMessages
      .filter((m) => !m.id.startsWith('welcome_'))
      .slice(0, -1) // exclude current user message
      .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
      .slice(-8)
      .map((m) => ({
        role: m.role,
        content: m.content.trim(),
      }));

    // If user has consented to diagnostic sharing, build compact learner diagnostic digest
    let learnerContextPayload: any = undefined;
    if (getPersonalizationConsent()) {
      try {
        const diagProfile = await diagnoseLearnerFromDB(level);
        learnerContextPayload = buildLearnerDiagnosticDigest(diagProfile, selectedLessonId);
      } catch (err) {
        console.warn('[AITutorScreen] Failed to build learner context:', err);
      }
    }

    const requestPayload: AITutorRequest = {
      mode,
      level,
      lessonId: selectedLessonId,
      language,
      userMessage: text,
      conversationHistory: filteredHistory,
      lessonContext: compactContext,
      learnerContext: learnerContextPayload,
    };

    const modelMsgId = `model_${Date.now()}`;
    streamingTextRef.current = '';

    // Append streaming model placeholder
    setMessages((prev) => [
      ...prev,
      {
        id: modelMsgId,
        role: 'model',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode,
        isStreaming: true,
      },
    ]);

    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    try {
      await streamAITutor(
        requestPayload,
        {
          onStart: () => {
            setIsLoading(false);
          },
          onChunk: (chunk: string) => {
            streamingTextRef.current += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === modelMsgId ? { ...m, content: m.content + chunk } : m
              )
            );
          },
          onDone: async () => {
            setIsStreaming(false);
            setIsLoading(false);
            const finalContent = streamingTextRef.current.trim();
            if (finalContent) {
              setMessages((prev) =>
                prev.map((m) => (m.id === modelMsgId ? { ...m, isStreaming: false, content: finalContent } : m))
              );

              // Persist completed model response to Dexie
              if (currentSessionId) {
                const dbModelMsg: AIChatMessage = {
                  id: modelMsgId,
                  sessionId: currentSessionId,
                  role: 'model',
                  content: finalContent,
                  mode,
                  createdAt: new Date().toISOString(),
                };
                await db.ai_messages.put(dbModelMsg).catch((e) => console.warn('Failed to save message:', e));
              }
            } else {
              // Do NOT save empty assistant message to IndexedDB, remove empty placeholder
              setMessages((prev) => prev.filter((m) => m.id !== modelMsgId));
            }
          },
          onError: async (err: Error) => {
            setIsStreaming(false);
            setIsLoading(false);
            const partial = streamingTextRef.current.trim();
            const isTimeout =
              err.message?.includes('timed out') ||
              err.message?.includes('timeout') ||
              err.name === 'TimeoutError';

            if (partial) {
              // Keep and display the partial streamed text instead of showing only an error
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === modelMsgId ? { ...m, isStreaming: false, content: partial } : m
                )
              );
              if (currentSessionId) {
                const dbModelMsg: AIChatMessage = {
                  id: modelMsgId,
                  sessionId: currentSessionId,
                  role: 'model',
                  content: partial,
                  mode,
                  createdAt: new Date().toISOString(),
                };
                await db.ai_messages.put(dbModelMsg).catch((e) => console.warn('Failed to save partial stream:', e));
              }
              if (isTimeout) {
                setErrorMessage(
                  'တုံ့ပြန်ချိန်ကုန်ဆုံးသွားသဖြင့် လက်ခံရရှိထားသော အပိုင်းကို သိမ်းဆည်းပြသထားပါသည်။ (Request timed out. Partial answer preserved.)'
                );
              } else {
                setErrorMessage(err.message || 'Stream connection failed.');
              }
            } else {
              // Do NOT save empty assistant message to IndexedDB, remove empty placeholder
              setMessages((prev) => prev.filter((m) => m.id !== modelMsgId));
              setErrorMessage(err.message || 'Stream connection failed.');
            }
          },
        },
        controller.signal
      );
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setIsStreaming(false);
        setIsLoading(false);
        const partial = streamingTextRef.current.trim();
        const isTimeout =
          err?.message?.includes('timed out') ||
          err?.message?.includes('timeout') ||
          err?.name === 'TimeoutError';

        if (partial) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === modelMsgId ? { ...m, isStreaming: false, content: partial } : m
            )
          );
          if (currentSessionId) {
            const dbModelMsg: AIChatMessage = {
              id: modelMsgId,
              sessionId: currentSessionId,
              role: 'model',
              content: partial,
              mode,
              createdAt: new Date().toISOString(),
            };
            await db.ai_messages.put(dbModelMsg).catch((e) => console.warn('Failed to save partial stream:', e));
          }
          if (isTimeout) {
            setErrorMessage(
              'တုံ့ပြန်ချိန်ကုန်ဆုံးသွားသဖြင့် လက်ခံရရှိထားသော အပိုင်းကို သိမ်းဆည်းပြသထားပါသည်။ (Request timed out. Partial answer preserved.)'
            );
          } else {
            setErrorMessage(err?.message || 'Failed to connect to AI Tutor. Please try again.');
          }
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== modelMsgId));
          setErrorMessage(err?.message || 'Failed to connect to AI Tutor. Please try again.');
        }
      }
    } finally {
      activeAbortControllerRef.current = null;
    }
  };

  // Dynamic suggestion chips based on active mode and selected lesson
  const suggestionChips = useMemo(() => {
    const lessonTitle = lessonPack?.title || selectedLessonId;
    switch (mode) {
      case 'grammar':
        return [
          `ဒီသင်ခန်းစာ (${lessonTitle}) ထဲက အဓိက သဒ္ဒါများကို ရှင်းပြပေးပါ`,
          'သဒ္ဒါဖွဲ့စည်းပုံနှင့် သုံးစွဲပုံ ဥပမာစာကြောင်းများ ဖော်ပြပါ',
          'ဆင်တူသဒ္ဒါများနှင့် အဓိပ္ပာယ် ကွဲပြားချက်များ နှိုင်းယှဉ်ပါ',
          'ဒီသဒ္ဒါတွင် မှားတတ်သောအချက်များ (Common Traps)',
        ];
      case 'vocabulary':
        return [
          `ဒီသင်ခန်းစာ (${lessonTitle}) မှ အရေးကြီးသော ဝေါဟာရများ`,
          'တွဲဖက်သုံး စကားစုများ (Collocations) နှင့် အသုံးများပုံ',
          'အနက်ဆင်တူ စကားလုံးများနှင့် ကွဲပြားသော အခြေအနေများ',
          'သဘာဝကျသော ဥပမာစာကြောင်း ၃ ကြောင်း ပြပေးပါ',
        ];
      case 'kanji':
        return [
          `ဒီသင်ခန်းစာ (${lessonTitle}) ပါ ခန်းဂျီးများ၏ ဖတ်နည်းများ`,
          'အွန်ယောမိ (Onyomi) နှင့် ခွန်ယောမိ (Kunyomi) ရှင်းလင်းချက်',
          'အသုံးများသော ခန်းဂျီးတွဲစကားလုံးများ (Jukugo)',
          'ပါဝင်သော အစိတ်အပိုင်းများနှင့် ရေးချက်အရေအတွက်',
        ];
      case 'quiz':
        return [
          `ဒီသင်ခန်းစာ (${lessonTitle}) အတွက် ရွေးချယ်မှု မေးခွန်း ၁ ခု မေးပေးပါ`,
          'သဒ္ဒါအသုံးအနှုန်း စစ်ဆေးသည့် မေးခွန်းမေးပါ',
          'ဝေါဟာရ အဓိပ္ပာယ်စစ်ဆေးသည့် မေးခွန်းမေးပါ',
          'အဖြေအတွက် Hint (သဲလွန်စ) ပေးပါ',
        ];
      case 'correction':
        return [
          'ကျေးဇူးပြု၍ ကျွန်ုပ်ရေးသားထားသော ဂျပန်စာကြောင်းကို စစ်ဆေးပြင်ဆင်ပေးပါ',
          'ပိုမို သဘာဝကျပြီး ယဉ်ကျေးသော အသုံးအနှုန်းဖြစ်အောင် ပြင်ပေးပါ',
          'ဝါစင်္ဂ (助詞 - Particles) အသုံး မှန်/မမှန် စစ်ဆေးပေးပါ',
        ];
      case 'learning':
        return [
          'ကျွန်ုပ်၏ လက်ရှိ အားနည်းချက်များကို သုံးသပ်ပြပါ',
          'မကြာခဏ မှားတတ်သော သဒ္ဒါများအတွက် လေ့ကျင့်ခန်း ပေးပါ',
          'ယနေ့ အတွက် အသင့်တော်ဆုံး လေ့လာမှု အစီအစဉ် ရေးဆွဲပေးပါ',
          'အားနည်းနေသော ဝေါဟာရများကို ပြန်လည်မှတ်မိစေရန် အကြံပြုပါ',
        ];
      case 'ask':
      default:
        return [
          `${level} အဆင့်တွင် အရေးကြီးဆုံး သဒ္ဒါလေ့လာနည်း အကြံပြုချက်များ`,
          `${level} စာမေးပွဲအတွက် အချိန်စီမံခန့်ခွဲမှု နည်းဗျူဟာများ`,
          `ဒီသင်ခန်းစာ (${lessonTitle}) ကို ဘယ်လို ထိရောက်စွာ လေ့လာရမလဲ`,
          'ဂျပန်စကားပြော သဘာဝကျစေရန် အဓိက သတိပြုရမည့်အချက်များ',
        ];
    }
  }, [mode, lessonPack, selectedLessonId, level]);

  // Filtered session list for search
  const filteredSessions = useMemo(() => {
    if (!sessionSearchQuery.trim()) return sessions;
    const q = sessionSearchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.mode.toLowerCase().includes(q) ||
        s.level.toLowerCase().includes(q)
    );
  }, [sessions, sessionSearchQuery]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] max-w-7xl mx-auto w-full bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="p-3.5 sm:p-4 bg-surface/80 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition cursor-pointer shadow-xs"
            title={isSidebarOpen ? 'Hide Chat History' : 'Show Chat History'}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeft className="w-4 h-4" />
            )}
          </button>

          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                <span>AI Japanese Tutor</span>
                <span className="text-xs font-normal text-muted-foreground font-myanmar">
                  (AI 先生)
                </span>
              </h1>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Gemini 3.8 Flash Streaming
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-myanmar">
              JLPT N5–N2 သင်ရိုးညွှန်းတမ်း အထောက်အကူပြု မြန်မာဘာသာ ရှင်းလင်းချက် AI သင်ကြားသူ
            </p>
          </div>
        </div>

        {/* Global Controls: Level, Lesson, Language, Clear */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Level Switcher */}
          <div className="flex items-center rounded-lg bg-muted p-0.5">
            {(['N5', 'N4', 'N3', 'N2'] as JLPTLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  level === lvl
                    ? 'bg-card text-primary shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Lesson Selector */}
          <select
            value={selectedLessonId}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            className="text-xs bg-card border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary shadow-xs max-w-[160px] sm:max-w-[200px] truncate"
          >
            {lessonsForSelectedLevel.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id.toUpperCase()}: {l.title}
              </option>
            ))}
          </select>

          {/* Explanation Language Toggle */}
          <button
            type="button"
            onClick={() => setLanguage((prev) => (prev === 'my' ? 'en' : 'my'))}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer flex items-center space-x-1 shadow-xs"
            title="ရှင်းလင်းချက်ဘာသာစကား ပြောင်းလဲမည် (Language Toggle)"
          >
            <Languages className="w-3.5 h-3.5 text-primary" />
            <span>{language === 'my' ? 'မြန်မာ' : 'English'}</span>
          </button>

          {/* Clear Current Chat Messages */}
          <button
            type="button"
            onClick={handleClearChat}
            className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-destructive transition cursor-pointer shadow-xs"
            title="စကားပြောဆိုမှု ရှင်းလင်းမည် (Clear Current Chat)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Body: Sidebar + Chat Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Session Sidebar */}
        {isSidebarOpen && (
          <aside className="w-72 sm:w-80 border-r border-border bg-surface/60 flex flex-col shrink-0">
            {/* New Chat Button */}
            <div className="p-3 border-b border-border flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCreateNewSession()}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>စကားပြောဆိုမှုအသစ် (+ New)</span>
              </button>
            </div>

            {/* Session Search Input */}
            <div className="px-3 py-2 border-b border-border">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={sessionSearchQuery}
                  onChange={(e) => setSessionSearchQuery(e.target.value)}
                  placeholder="စကားပြောဆိုမှု ရှာဖွေမည်..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Scrollable Session List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredSessions.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground font-myanmar">
                  စကားပြောဆိုမှု မတွေ့ရှိပါ
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  const isEditing = editingSessionId === session.id;

                  return (
                    <div
                      key={session.id}
                      onClick={() => !isEditing && handleSelectSession(session)}
                      className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition cursor-pointer ${
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20 font-medium shadow-2xs'
                          : 'text-foreground hover:bg-muted border border-transparent'
                      }`}
                    >
                      <div className="flex items-start space-x-2 min-w-0 flex-1">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary" />
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(session.id);
                                  if (e.key === 'Escape') setEditingSessionId(null);
                                }}
                                autoFocus
                                className="w-full text-xs bg-card border border-primary text-foreground rounded px-1.5 py-0.5"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRename(session.id)}
                                className="p-1 hover:text-emerald-500"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSessionId(null)}
                                className="p-1 hover:text-muted-foreground"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="truncate leading-snug">{session.title}</p>
                              <div className="flex items-center space-x-1.5 text-[10px] text-muted-foreground mt-0.5">
                                <span className="uppercase font-mono font-semibold">
                                  {session.level}
                                </span>
                                <span>•</span>
                                <span>{session.mode}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Hover action icons */}
                      {!isEditing && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1">
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(session, e)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* Chat Main Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-card">
          {/* 2. Mode Selector Bar */}
          <div className="px-3 sm:px-4 py-2 bg-card border-b border-border flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {MODE_DEFINITIONS.map((m) => {
              const Icon = m.icon;
              const isActive = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id);
                    if (activeSessionId) {
                      db.ai_sessions.update(activeSessionId, { mode: m.id });
                    }
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.nameEn}</span>
                  <span className="text-[10px] opacity-80 font-myanmar">({m.nameMy})</span>
                </button>
              );
            })}
          </div>

          {/* 3. Active Context Notice Banner */}
          <div className="px-3 sm:px-4 py-1.5 bg-primary/5 border-b border-border flex flex-wrap items-center justify-between text-[11px] text-foreground">
            <div className="flex items-center space-x-2 truncate">
              <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-semibold">{level} {selectedLessonId.toUpperCase()}:</span>
              <span className="truncate">
                {lessonPack?.title ? `${lessonPack.title}` : 'Loading lesson pack...'}
              </span>
              {lessonPack && (
                <span className="text-muted-foreground text-[10px] hidden sm:inline">
                  ({lessonPack.grammars?.length || 0} Grammar, {lessonPack.vocabularies?.length || 0} Vocab, {lessonPack.kanjis?.length || 0} Kanji)
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachContext}
                  onChange={(e) => setAttachContext(e.target.checked)}
                  className="rounded text-primary focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[10px] font-medium">Attach Lesson Context</span>
              </label>

              {onOpenLesson && lessonPack && (
                <button
                  onClick={() => onOpenLesson(selectedLessonId)}
                  className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  Open Lesson &rarr;
                </button>
              )}
            </div>
          </div>

          {/* 4. Offline Warning Banner */}
          {isOffline && (
            <div className="p-2.5 bg-warning/10 border-b border-warning/30 text-foreground text-xs flex items-center space-x-2">
              <WifiOff className="w-4 h-4 shrink-0 text-warning" />
              <span className="font-myanmar">
                အင်တာနက်လိုင်း မရှိပါ (Offline)။ AI Tutor အသုံးပြုရန် အင်တာနက်ချိတ်ဆက်မှု လိုအပ်ပါသည်။
              </span>
            </div>
          )}

          {/* 5. Chat Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-background/50">
            {messages.map((message, idx) => {
              const isUser = message.role === 'user';
              const prevMessage = idx > 0 ? messages[idx - 1] : undefined;
              const isSaved = Boolean(savedNoteMap[message.id]);

              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
                >
                  <div
                    className={`flex items-start space-x-2.5 max-w-[92%] sm:max-w-[85%] ${
                      isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Avatar Icon */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                        isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-primary border border-border'
                      }`}
                    >
                      {isUser ? <HelpCircle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>

                    {/* Message Content Bubble */}
                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs transition-all ${
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-tr-xs'
                          : 'bg-card text-card-foreground border border-border rounded-tl-xs'
                      }`}
                    >
                      {/* Message body with Markdown line breaks */}
                      <div className="whitespace-pre-wrap font-sans break-words selection:bg-primary/20">
                        {message.content}
                        {message.isStreaming && (
                          <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary animate-pulse align-middle" />
                        )}
                      </div>

                      {/* Model Message Utility Footer */}
                      {!isUser && !message.isStreaming && message.content && (
                        <div className="mt-3 pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                          <span className="font-mono">{message.timestamp}</span>

                          <div className="flex items-center space-x-2">
                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => handleCopy(message.id, message.content)}
                              className="flex items-center space-x-1 hover:text-foreground cursor-pointer transition"
                              title="Copy text"
                            >
                              {copiedId === message.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500 font-medium">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {/* Save to AI Notes button */}
                            <button
                              type="button"
                              onClick={() => handleSaveToNotes(message, prevMessage)}
                              disabled={isSaved}
                              className={`flex items-center space-x-1 cursor-pointer transition ${
                                isSaved
                                  ? 'text-emerald-500 font-semibold cursor-default'
                                  : 'hover:text-primary'
                              }`}
                              title="Save this explanation to your local AI Notes"
                            >
                              {isSaved ? (
                                <>
                                  <BookmarkCheck className="w-3 h-3" />
                                  <span>Saved to Notes</span>
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="w-3 h-3" />
                                  <span>Save to Notes</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading Spinner Indicator (Before first stream token arrives) */}
            {isLoading && (
              <div className="flex items-start space-x-2.5 max-w-[85%]">
                <div className="w-7 h-7 rounded-lg bg-card text-primary border border-border flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="p-3.5 rounded-2xl rounded-tl-xs bg-card border border-border shadow-xs flex items-center space-x-2 text-xs text-foreground">
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="font-myanmar">AI 先生 ချိတ်ဆက်စဉ်းစားနေပါသည်...</span>
                </div>
              </div>
            )}

            {/* Error Alert Banner */}
            {errorMessage && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive-foreground rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center space-x-2 min-w-0">
                  <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
                  <span className="break-words text-foreground">{errorMessage}</span>
                </div>
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || isStreaming || isOffline}
                  className="px-2.5 py-1 bg-destructive/20 text-foreground rounded-lg text-xs font-semibold hover:bg-destructive/30 shrink-0 cursor-pointer transition active:scale-95"
                >
                  Try Again
                </button>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* 6. Prompt Suggestion Chips */}
          <div className="p-2 sm:px-4 bg-card border-t border-border">
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] uppercase font-mono text-muted-foreground shrink-0 font-semibold">
                Suggested:
              </span>
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  disabled={isLoading || isStreaming || isOffline}
                  className="px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary border border-border text-foreground text-xs whitespace-nowrap transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Input Form Area with Stop Generation Button */}
          <div className="p-3 sm:p-4 bg-surface/80 border-t border-border">
            {isStreaming && (
              <div className="mb-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="flex items-center space-x-1.5 px-3 py-1 bg-muted hover:bg-destructive/10 hover:text-destructive text-foreground rounded-full text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current text-destructive" />
                  <span>ထုတ်ယူမှု ရပ်တန့်မည် (Stop Generation)</span>
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end space-x-2"
            >
              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isLoading || isStreaming || isOffline}
                  placeholder={
                    isOffline
                      ? 'အင်တာနက်လိုင်းမရှိပါ (Offline)'
                      : mode === 'quiz'
                      ? 'အဖြေ သို့မဟုတ် "Hint ပေးပါ" ဟု ရိုက်ထည့်ပါ...'
                      : mode === 'correction'
                      ? 'စစ်ဆေးလိုသော ဂျပန်စာကြောင်းကို ရိုက်ထည့်ပါ...'
                      : `${level} သင်ခန်းစာ သို့မဟုတ် ဂျပန်စာအကြောင်း မေးမြန်းပါ... (Shift+Enter for newline)`
                  }
                  maxLength={1000}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition resize-none disabled:opacity-60 shadow-xs"
                />
                <div className="absolute bottom-2 right-2 text-[10px] font-mono text-muted-foreground">
                  {input.length}/1000
                </div>
              </div>

              <button
                type="submit"
                disabled={!input.trim() || isLoading || isStreaming || isOffline}
                className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer active:scale-95 shadow-xs disabled:opacity-50 flex items-center justify-center space-x-1.5 shrink-0 h-[46px]"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
