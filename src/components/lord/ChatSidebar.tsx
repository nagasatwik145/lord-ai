import { useState, useEffect } from "react";
import { Plus, MessageSquare, Trash2, Edit2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getConversationsFn,
  deleteConversationFn,
  updateConversationTitleFn,
} from "@/lib/chat-history.functions";

interface ChatSidebarProps {
  currentId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}

type ConversationListItem = {
  id: string;
  title: string;
  updatedAt?: string;
};

export function ChatSidebar({ currentId, onSelect, onNew }: ChatSidebarProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const load = async () => {
    try {
      const data = await getConversationsFn();
      setConversations(Array.isArray(data) ? data : (data?.conversations ?? []));
      setHistoryError(
        Array.isArray(data) || data?.persistenceAvailable !== false ? null : data.error,
      );
    } catch (error) {
      console.error("[chat-sidebar] Failed to load conversations:", error);
      setConversations([]);
      setHistoryError("Chat history is unavailable right now.");
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this conversation?")) {
      try {
        await deleteConversationFn({ data: id });
        load();
        if (currentId === id) onNew();
      } catch (error) {
        console.error("[chat-sidebar] Failed to delete conversation:", error);
        setHistoryError("Unable to delete chat history right now.");
      }
    }
  };

  const startEdit = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const saveEdit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateConversationTitleFn({ data: { id, title: editTitle } });
      setEditingId(null);
      load();
    } catch (error) {
      console.error("[chat-sidebar] Failed to rename conversation:", error);
      setHistoryError("Unable to rename chat history right now.");
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <button
        onClick={onNew}
        className="flex w-full items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm font-medium text-primary transition hover:bg-primary/10"
      >
        <Plus className="h-4 w-4" />
        New Chat
      </button>

      {historyError ? (
        <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
          Chat history unavailable. New messages still work, but saved conversations cannot be
          loaded.
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-1">
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                currentId === c.id
                  ? "bg-primary/15 text-primary shadow-[0_0_12px_var(--hud)]"
                  : "text-muted-foreground hover:bg-background/40 hover:text-foreground",
              )}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />

              {editingId === c.id ? (
                <div className="flex flex-1 items-center gap-1">
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-transparent outline-none"
                  />
                  <Check
                    className="h-3.5 w-3.5 cursor-pointer hover:text-primary"
                    onClick={(e) => saveEdit(c.id, e)}
                  />
                  <X
                    className="h-3.5 w-3.5 cursor-pointer hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(null);
                    }}
                  />
                </div>
              ) : (
                <span className="flex-1 truncate">{c.title}</span>
              )}

              <div className="absolute right-2 hidden items-center gap-1 group-hover:flex">
                <Edit2
                  className="h-3.5 w-3.5 cursor-pointer hover:text-primary"
                  onClick={(e) => startEdit(c.id, c.title, e)}
                />
                <Trash2
                  className="h-3.5 w-3.5 cursor-pointer hover:text-destructive"
                  onClick={(e) => handleDelete(c.id, e)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
