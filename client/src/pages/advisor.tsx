import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Plus, Trash2, MessageSquare, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Layout from "@/components/layout";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  tempId?: string; // Temporary ID for optimistic messages
}

interface Conversation {
  id: number;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface ChatResponse {
  conversationId: number;
  message: string;
  title: string;
}

export default function AdvisorPage() {
  const [message, setMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  const { data: conversations = [], isLoading: loadingConversations, refetch: refetchConversations } = useQuery<Conversation[]>({
    queryKey: ['/api/advisor/conversations'],
  });

  // Find the current conversation from the conversations list
  const currentConversation = conversations.find(c => c.id === currentConversationId);

  const chatMutation = useMutation<ChatResponse, Error, { message: string; conversationId?: number }>({
    mutationFn: async ({ message, conversationId }) => {
      // Capture the message count BEFORE adding optimistic messages
      const messageCount = currentConversation?.messages.length || 0;
      setPreSendMessageCount(messageCount);
      console.log('[ADVISOR] Pre-send message count:', messageCount, 'conversationId:', conversationId);
      
      // Add user message optimistically with a temporary ID
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      setOptimisticMessages(prev => {
        const newMessages = [...prev, { role: 'user', content: message, tempId }];
        console.log('[ADVISOR] Added optimistic user message, total optimistic:', newMessages.length);
        return newMessages;
      });
      
      const response = await apiRequest('POST', '/api/advisor/chat', { message, conversationId });
      const data = await response.json() as ChatResponse;
      console.log('[ADVISOR] API response:', data);
      return data;
    },
    onSuccess: async (data) => {
      console.log('[ADVISOR] onSuccess - conversationId:', data.conversationId);
      
      // Add AI response optimistically with a temporary ID
      if (data.message) {
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        setOptimisticMessages(prev => {
          const newMessages = [...prev, { role: 'assistant', content: data.message, tempId }];
          console.log('[ADVISOR] Added optimistic AI message, total optimistic:', newMessages.length);
          return newMessages;
        });
      }
      
      setMessage("");
      
      // Set the conversation ID immediately (before refetch)
      if (data.conversationId) {
        console.log('[ADVISOR] Setting currentConversationId to:', data.conversationId);
        setCurrentConversationId(data.conversationId);
      }
      
      // Refetch conversations to get the updated messages
      console.log('[ADVISOR] Refetching conversations...');
      await refetchConversations();
      console.log('[ADVISOR] Conversations refetched');
      
      // Don't clear optimistic messages - let them stay visible
      // They will be replaced by the actual messages from the conversation
      // This prevents the page from appearing empty during the transition
    },
    onError: (error: any) => {
      // Clear optimistic messages on error
      setOptimisticMessages([]);
      toast({
        title: "Hata",
        description: error.message || "Bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      await apiRequest('DELETE', `/api/advisor/conversations/${conversationId}`);
    },
    onSuccess: async (_, deletedId) => {
      // Clear current conversation if it's the one being deleted
      if (currentConversationId === deletedId) {
        setCurrentConversationId(null);
      }
      // Immediately refetch conversations to update UI
      await refetchConversations();
      toast({
        title: "Başarılı",
        description: "Konuşma silindi",
      });
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    chatMutation.mutate({ message, conversationId: currentConversationId || undefined });
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessage("");
    setOptimisticMessages([]);
  };

  const selectConversation = (conversationId: number) => {
    setCurrentConversationId(conversationId);
    setOptimisticMessages([]);
  };

  // Track the conversation message count before sending (set in mutationFn)
  const [preSendMessageCount, setPreSendMessageCount] = useState<number>(0);

  // Clear optimistic messages once the conversation has grown to include them
  useEffect(() => {
    if (optimisticMessages.length > 0 && currentConversation && !chatMutation.isPending) {
      const expectedLength = preSendMessageCount + optimisticMessages.length;
      
      console.log('[ADVISOR] Clearing check:', {
        optimisticCount: optimisticMessages.length,
        conversationId: currentConversation.id,
        conversationMessageCount: currentConversation.messages.length,
        preSendCount: preSendMessageCount,
        expectedLength,
        shouldClear: currentConversation.messages.length >= expectedLength
      });
      
      // For new conversations (preSendMessageCount === 0), wait longer before clearing
      // For existing conversations, clear once messages are persisted
      if (currentConversation.messages.length >= expectedLength) {
        const delay = preSendMessageCount === 0 ? 500 : 150; // Longer delay for new conversations
        const timer = setTimeout(() => {
          console.log('[ADVISOR] Clearing optimistic messages after', delay, 'ms delay');
          setOptimisticMessages([]);
        }, delay);
        
        return () => clearTimeout(timer);
      }
    }
  }, [currentConversation, optimisticMessages, chatMutation.isPending, preSendMessageCount]);

  // Use optimistic messages when we have them
  // Optimistic messages have tempIds, so they won't duplicate with conversation messages
  const messages = (() => {
    const conversationMessages = currentConversation?.messages || [];
    const result = [...conversationMessages, ...optimisticMessages];
    
    console.log('[ADVISOR] Messages display:', {
      conversationId: currentConversationId,
      conversationMessageCount: conversationMessages.length,
      optimisticMessageCount: optimisticMessages.length,
      totalMessages: result.length,
      hasCurrentConversation: !!currentConversation
    });
    
    // Simply append optimistic messages - they have tempIds so they're always unique
    return result;
  })();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Layout>
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-blue-600" />
          AI Satış Danışmanı
        </h1>
        <p className="text-muted-foreground mt-2">
          Ürünleriniz için paketleme ve satış kanalları hakkında uzman tavsiyeleri alın
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Konuşmalar</CardTitle>
              <Button size="sm" onClick={startNewConversation} data-testid="button-new-conversation">
                <Plus className="h-4 w-4 mr-1" />
                Yeni
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {loadingConversations ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center p-4">
                  Henüz konuşma yok. Yeni bir konuşma başlatın!
                </p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        currentConversationId === conv.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => selectConversation(conv.id)}
                      data-testid={`conversation-${conv.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{conv.title}</p>
                          <p className="text-xs opacity-75 mt-1">
                            {format(new Date(conv.updatedAt), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(conv.id);
                          }}
                          data-testid={`button-delete-conversation-${conv.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {currentConversation ? currentConversation.title : 'Yeni Konuşma'}
            </CardTitle>
            <CardDescription>
              Ürünleriniz hakkında bilgi verin ve satış stratejileri için tavsiye alın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] mb-4 pr-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Danışmanınıza Hoş Geldiniz!</h3>
                  <p className="text-muted-foreground max-w-md">
                    Ürününüz hakkında bilgi verin. Size en uygun paketleme yöntemleri ve satış kanalları
                    hakkında Türkçe tavsiyeler vereceğim.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      data-testid={`message-${msg.role}-${index}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {chatMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-lg p-4 bg-muted">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <p className="text-sm text-muted-foreground">AI düşünüyor...</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2">
              <Textarea
                placeholder="Ürününüz hakkında bilgi verin... Örneğin: 'El yapımı seramik bardaklar satıyorum, hangi platformlarda satmalıyım?'"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="min-h-[100px]"
                data-testid="textarea-message"
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || chatMutation.isPending}
                className="self-end"
                data-testid="button-send"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </Layout>
  );
}
