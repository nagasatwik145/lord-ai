import { useState, useEffect } from "react";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { HudPanel } from "./HudPanel";
import { getConversationsFn } from "@/lib/chat-history.functions";

interface ChatSidebarProps {
  currentId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export function ChatSidebar({ currentId, onSelect, onNew }: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const result = await getConversationsFn();
        if (result.conversations) {
          setConversations(result.conversations);
        }
      } catch (error) {
        console.error("Failed to load conversations:", error);
      } finally {
        setLoading(false);
      }
    };
    loadConversations();
  }, []);

  return (
    <HudPanel title="Conversations" subtitle="Chat history" className="flex flex-col gap-3 h-full">
      <button
        onClick={onNew}
        className="flex items-center gap-2 rounded-md bg-primary/15 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/25 transition"
      >
        <Plus className="h-3.5 w-3.5" />
        New Chat
      </button>

      <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
        ) : conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group rounded-md border px-2 py-1.5 text-xs cursor-pointer transition",
                currentId === conv.id
                  ? "bg-primary/20 border-primary/60"
                  : "border-border/40 bg-background/20 hover:bg-background/40"
              )}
            >
              <div onClick={() => onSelect(conv.id)} className="flex items-start gap-2 justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3 flex-shrink-0" />
                    <p className="truncate font-medium">{conv.title || "Untitled"}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </HudPanel>
  );
}
