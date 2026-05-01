import { useState, useCallback } from "react";
import type { Chat, ChatMessage, ChatBranch, BookmarkedMessage, BookmarkCollection, Folder, InterfaceMode, ThoughtEntry } from "@/types/chat";

const DEMO_CHATS: Chat[] = [
  { id: "1", title: "TCGA-BRCA outcomes", messages: [], branches: [], createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(Date.now() - 86400000) },
  { id: "2", title: "RNA-seq Analysis", messages: [], branches: [], createdAt: new Date(Date.now() - 172800000), updatedAt: new Date(Date.now() - 172800000) },
  { id: "3", title: "Gene enrichment", messages: [], branches: [], createdAt: new Date(Date.now() - 259200000), updatedAt: new Date(Date.now() - 259200000) },
  { id: "4", title: "TP53 Mutation Impact Analysis", messages: [], branches: [], createdAt: new Date(Date.now() - 345600000), updatedAt: new Date(Date.now() - 345600000) },
  { id: "5", title: "BRCA1 Functional Annotation", messages: [], branches: [], createdAt: new Date(Date.now() - 432000000), updatedAt: new Date(Date.now() - 432000000) },
];

const DEMO_FOLDERS: Folder[] = [
  { id: "f1", name: "Pan-Cancer RNA-seq Expression Atlas", chatIds: ["1", "2"], datasetCount: 12, updatedAt: new Date(Date.now() - 7200000) },
  { id: "f2", name: "CRISPR Screen Analysis — Drug Resistance", chatIds: ["3"], datasetCount: 4, updatedAt: new Date(Date.now() - 18000000) },
];

export function useChatStore() {
  const [chats, setChats] = useState<Chat[]>(DEMO_CHATS);
  const [folders, setFolders] = useState<Folder[]>(DEMO_FOLDERS);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [mode, setMode] = useState<InterfaceMode>("conversation");
  const [bookmarkedMessages, setBookmarkedMessages] = useState<BookmarkedMessage[]>([]);
  const [bookmarkCollections, setBookmarkCollections] = useState<BookmarkCollection[]>([
    { id: "col-1", name: "Methods & Protocols", color: "#0070C0", createdAt: new Date() },
    { id: "col-2", name: "Key Findings", color: "#636FCE", createdAt: new Date() },
    { id: "col-3", name: "Datasets", color: "#F69553", createdAt: new Date() },
  ]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const activeBranch = activeChat?.branches.find((b) => b.id === activeBranchId) ?? null;

  const createChat = useCallback((options?: { title?: string; messages?: Omit<ChatMessage, "id" | "timestamp">[] }) => {
    const now = new Date();
    const messages: ChatMessage[] = (options?.messages || []).map((m) => ({
      ...m, id: crypto.randomUUID(), timestamp: now,
    }));
    const newChat: Chat = {
      id: crypto.randomUUID(), title: options?.title || "New Chat",
      messages, branches: [], createdAt: now, updatedAt: now,
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setActiveBranchId(null);
    return newChat;
  }, []);

  const renameChat = useCallback((chatId: string, newTitle: string) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c)));
  }, []);

  const addMessage = useCallback(
    (chatId: string, message: Omit<ChatMessage, "id" | "timestamp">, branchId?: string | null) => {
      const msg: ChatMessage = { ...message, id: crypto.randomUUID(), timestamp: new Date() };
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          if (branchId) {
            return {
              ...c,
              branches: c.branches.map((b) =>
                b.id === branchId ? { ...b, messages: [...b.messages, msg] } : b
              ),
              updatedAt: new Date(),
            };
          }
          return { ...c, messages: [...c.messages, msg], updatedAt: new Date() };
        })
      );
      return msg;
    },
    []
  );

  const removeMessage = useCallback((chatId: string, messageId: string) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, messages: c.messages.filter((m) => m.id !== messageId) } : c
      )
    );
  }, []);

  const updateMessageMetadata = useCallback(
    (chatId: string, messageId: string, metadata: ChatMessage["metadata"]) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, messages: c.messages.map((m) => m.id === messageId ? { ...m, metadata } : m) }
            : c
        )
      );
    },
    []
  );

  const updateExecutionStep = useCallback(
    (chatId: string, messageId: string, stepId: string, status: "pending" | "running" | "complete", duration?: string) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId && m.metadata?.executionSteps
                    ? {
                        ...m,
                        metadata: {
                          ...m.metadata,
                          executionSteps: m.metadata.executionSteps.map((s) =>
                            s.id === stepId ? { ...s, status, duration } : s
                          ),
                        },
                      }
                    : m
                ),
              }
            : c
        )
      );
    },
    []
  );

  const addThoughtEntry = useCallback(
    (chatId: string, messageId: string, entry: ThoughtEntry) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId && m.metadata
                    ? { ...m, metadata: { ...m.metadata, thoughtProcess: [...(m.metadata.thoughtProcess || []), entry] } }
                    : m
                ),
              }
            : c
        )
      );
    },
    []
  );

  /**
   * Find a message anywhere in the chat (main thread or any branch) by id.
   */
  function findMessageById(chat: Chat, messageId: string): ChatMessage | null {
    const onMain = chat.messages.find((m) => m.id === messageId);
    if (onMain) return onMain;
    for (const b of chat.branches) {
      const onBranch = b.messages.find((m) => m.id === messageId);
      if (onBranch) return onBranch;
    }
    return null;
  }

  /**
   * Create a branch within the current chat, forking from a specific message.
   * The branch starts empty — the user can then send messages into it.
   * `parentMessageId` must refer to a message on the main thread or an existing branch.
   */
  const branchChat = useCallback(
    (chatId: string, parentMessageId: string) => {
      const source = chats.find((c) => c.id === chatId);
      if (!source) return null;

      const parentMessage = findMessageById(source, parentMessageId);
      if (!parentMessage) return null;

      const branch: ChatBranch = {
        id: crypto.randomUUID(),
        label: `Path ${source.branches.length + 1}`,
        parentMessageId: parentMessage.id,
        messages: [],
        createdAt: new Date(),
      };

      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, branches: [...c.branches, branch], updatedAt: new Date() }
            : c
        )
      );
      setActiveBranchId(branch.id);
      return branch;
    },
    [chats]
  );

  const switchToBranch = useCallback((branchId: string | null) => {
    setActiveBranchId(branchId);
  }, []);

  const mergeBranch = useCallback(
    (chatId: string, branchId: string) => {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          const branch = c.branches.find((b) => b.id === branchId);
          if (!branch) return c;

          const lastMainBefore = c.messages[c.messages.length - 1];
          const mergedAtMessageId = lastMainBefore?.id;

          const toAppend = branch.messages;
          const newMainMessages =
            toAppend.length > 0 ? [...c.messages, ...toAppend] : c.messages;

          return {
            ...c,
            messages: newMainMessages,
            branches: c.branches.map((b) =>
              b.id === branchId
                ? { ...b, merged: true, mergedAtMessageId, messages: [] }
                : b
            ),
            updatedAt: new Date(),
          };
        })
      );
      setActiveBranchId(null);
    },
    []
  );

  const toggleBookmark = useCallback(
    (chatId: string, messageId: string) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, messages: c.messages.map((m) => m.id === messageId ? { ...m, bookmarked: !m.bookmarked } : m) }
            : c
        )
      );
      setBookmarkedMessages((prev) => {
        const exists = prev.find((b) => b.messageId === messageId);
        if (exists) return prev.filter((b) => b.messageId !== messageId);
        const chat = chats.find((c) => c.id === chatId);
        const message = chat?.messages.find((m) => m.id === messageId);
        if (!chat || !message) return prev;
        return [{ messageId, chatId, chatTitle: chat.title, content: message.content, bookmarkedAt: new Date() }, ...prev];
      });
    },
    [chats]
  );

  const toggleBookmarkCollection = useCallback(
    (chatId: string, messageId: string, collectionId: string) => {
      // Ensure message is bookmarked
      const chat = chats.find((c) => c.id === chatId);
      const message = chat?.messages.find((m) => m.id === messageId);
      if (!chat || !message) return;

      setBookmarkedMessages((prev) => {
        const existing = prev.find((b) => b.messageId === messageId && b.collectionId === collectionId);
        if (existing) {
          // Remove from this collection
          const updated = prev.filter((b) => !(b.messageId === messageId && b.collectionId === collectionId));
          // If no more bookmarks for this message, un-bookmark it
          if (!updated.some((b) => b.messageId === messageId)) {
            setChats((pc) =>
              pc.map((c) =>
                c.id === chatId
                  ? { ...c, messages: c.messages.map((m) => m.id === messageId ? { ...m, bookmarked: false } : m) }
                  : c
              )
            );
          }
          return updated;
        }
        // Add to this collection
        setChats((pc) =>
          pc.map((c) =>
            c.id === chatId
              ? { ...c, messages: c.messages.map((m) => m.id === messageId ? { ...m, bookmarked: true } : m) }
              : c
          )
        );
        return [
          ...prev,
          { messageId, chatId, chatTitle: chat.title, content: message.content, bookmarkedAt: new Date(), collectionId },
        ];
      });
    },
    [chats]
  );

  const createBookmarkCollection = useCallback((name: string) => {
    const colors = ["#80D494", "#E06C75", "#56B6C2", "#C678DD"];
    setBookmarkCollections((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        color: colors[prev.length % colors.length],
        createdAt: new Date(),
      },
    ]);
  }, []);

  const getCollectionIdsForMessage = useCallback(
    (messageId: string) => {
      return bookmarkedMessages
        .filter((b) => b.messageId === messageId && b.collectionId)
        .map((b) => b.collectionId!);
    },
    [bookmarkedMessages]
  );

  return {
    chats, folders, activeChatId, activeChat, activeBranchId, activeBranch,
    mode, bookmarkedMessages, bookmarkCollections,
    setMode, setActiveChatId, createChat, renameChat, addMessage, removeMessage,
    updateMessageMetadata, updateExecutionStep, addThoughtEntry,
    branchChat, switchToBranch, mergeBranch, toggleBookmark,
    toggleBookmarkCollection, createBookmarkCollection, getCollectionIdsForMessage,
  };
}
