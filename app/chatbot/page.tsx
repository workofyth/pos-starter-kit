"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

function renderMessageContent(content: string | null | undefined) {
  if (!content || typeof content !== 'string') return null;
  if (content.trim().startsWith('{') && content.trim().endsWith('}')) return null;

  let cleanContent = content.replace(/<function=.*?>[\s\S]*?<\/function>/g, '').replace(/<function=.*?>/g, '').trim();
  if (!cleanContent) return null;

  const lines = cleanContent.split('\n');
  const result: React.ReactNode[] = [];
  let currentTable: string[][] = [];
  let inTable = false;

  const flushTable = (index: number) => {
    if (currentTable.length === 0) return;
    const filteredRows = currentTable.filter(row => !row.every(cell => cell.trim().match(/^-+$/)));
    
    if (filteredRows.length > 0) {
      result.push(
        <div key={`receipt-${index}`} className="my-4 overflow-hidden rounded-xl border border-border/80 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-lg receipt-card">
          <div className="bg-muted/50 px-3 py-1.5 border-b border-border/50 flex justify-between items-center bg-gradient-to-r from-muted/50 to-transparent">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-80">Order Summary</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/30 bg-muted/20">
                  {filteredRows[0].map((cell, i) => (
                    <th key={i} className="px-3 py-2 text-left font-semibold text-foreground/80 lowercase first-letter:uppercase">{cell.trim()}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {filteredRows.slice(1).map((row, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    {row.map((cell, j) => {
                      const val = cell.trim();
                      const isNumeric = val.startsWith('Rp') || !isNaN(Number(val.replace(/[,.]/g, '')));
                      return (
                        <td key={j} className={cn("px-3 py-2 text-foreground/70", isNumeric ? "font-mono font-medium text-blue-600 dark:text-blue-400" : "")}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 bg-muted/10 border-t border-border/20 flex justify-end">
             <span className="text-[9px] text-muted-foreground italic">Order generated via ChatBot Assistant</span>
          </div>
        </div>
      );
    }
    currentTable = [];
    inTable = false;
  };

  lines.forEach((line, index) => {
    const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');
    if (isTableRow) {
      const cells = line.trim().split('|').filter(c => c !== '');
      if (cells.length > 0) {
        currentTable.push(cells);
        inTable = true;
      }
    } else {
      if (inTable) flushTable(index);
      const text = line.trim();
      if (text) {
        const formattedLine = line.split('**').map((part, i) => 
          i % 2 === 1 ? <strong key={i} className="text-yellow-600 dark:text-yellow-400 font-bold">{part}</strong> : part
        );
        result.push(<p key={index} className="my-1 text-sm leading-relaxed">{formattedLine}</p>);
      } else if (line === "") {
        result.push(<div key={index} className="h-2" />);
      }
    }
  });

  if (inTable) flushTable(999);
  return result;
}

export default function ChatbotPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history from Redis on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/chatbot");
        const result = await response.json();
        if (result.success && result.messages?.length > 0) {
          // Add default timestamp for old history if missing
          const historyWithTime = result.messages.map((m: any) => ({
            ...m,
            timestamp: m.timestamp || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          }));
          setMessages(historyWithTime);
        } else {
          setMessages([{ 
            role: "assistant", 
            content: "Halo! Saya asisten AI Anda. Ada yang bisa saya bantu hari ini?",
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Suggestion feature disabled per user request
  useEffect(() => {
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const sendMessage = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage = textToSend.trim();
    if (!overrideInput) setInput("");
    else setInput(""); // Also clear if from suggestion
    
    setShowSuggestions(false);
    const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const newMessages = [...messages, { role: "user" as const, content: userMessage, timestamp: currentTime }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: userMessage }] }),
      });

      const result = await response.json();
      const responseTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      if (response.ok && result.success) {
        setMessages(prev => [...prev, { role: "assistant", content: result.message, timestamp: responseTime }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Maaf, terjadi kesalahan: " + result.message, timestamp: responseTime }]);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Maaf, tidak dapat terhubung ke pelayan." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (product: any) => {
    // Append or replace? Let's replace the last word or just append
    const words = input.trim().split(' ');
    words.pop(); // Remove the partial word
    const newInput = [...words, product.name].join(' ').trim();
    setInput(newInput);
    setShowSuggestions(false);
  };

  const clearHistory = async () => {
    try {
      const response = await fetch("/api/chatbot", { method: "DELETE" });
      if (response.ok) {
        setMessages([{ 
          role: "assistant", 
          content: "Riwayat telah dihapus secara total. Ada yang bisa saya bantu?",
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "Gagal menghapus riwayat di server, tetapi tampilan telah dibersihkan." }]);
      setMessages([{ role: "assistant", content: "Ada yang bisa saya bantu?" }]);
    }
  };

  return (
    <div className="relative flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-yellow-500" />
            AI Business Assistant
          </h1>
          <p className="text-sm text-muted-foreground">Analisis stok & manajemen pesanan real-time.</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearHistory}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Chat
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-white/50 dark:bg-gray-900/50 rounded-3xl border border-yellow-100/50 dark:border-yellow-900/20 shadow-inner overflow-hidden mb-24">
        <ScrollArea className="h-full" viewportRef={scrollRef}>
          <div className="p-6 space-y-8 pb-12">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={cn(
                  "flex gap-4 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border",
                  msg.role === "assistant" 
                    ? "bg-yellow-50 text-yellow-600 border-yellow-200" 
                    : "bg-white dark:bg-gray-800 text-gray-600 border-gray-200"
                )}>
                  {msg.role === "assistant" ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </div>
                <div className="flex flex-col gap-1">
                  <div className={cn(
                    "p-4 rounded-2xl text-[15px] shadow-sm leading-relaxed",
                    msg.role === "assistant" 
                      ? "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-yellow-50/50" 
                      : "bg-yellow-400 text-black font-medium"
                  )}>
                    {renderMessageContent(msg.content)}
                  </div>
                  {msg.timestamp && (
                    <span className={cn(
                      "text-[10px] px-2 text-gray-400",
                      msg.role === "user" ? "text-right" : "text-left"
                    )}>
                      {msg.timestamp}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 animate-pulse">
                <div className="h-9 w-9 rounded-xl bg-yellow-50 text-yellow-600 border border-yellow-200 flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-yellow-50 shadow-sm flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                  <span className="text-sm text-gray-500 font-medium">Berpikir...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Floating Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 dark:from-gray-950 via-gray-50/80 dark:via-gray-950/80 to-transparent">
        <form 
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="max-w-3xl mx-auto relative group"
        >
          {/* Product Suggestions Overlay */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-yellow-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
              <div className="p-2 border-b bg-yellow-50/50 dark:bg-yellow-900/10">
                <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest px-2">Saran Produk</p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {suggestions.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSuggestionClick(product)}
                    className="w-full flex items-center justify-between p-3 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-left transition-colors border-b last:border-0 border-gray-50 dark:border-gray-700"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{product.name}</span>
                      <span className="text-[10px] text-gray-400">SKU: {product.sku}</span>
                    </div>
                    <span className="text-xs font-bold text-green-600">Rp {Number(product.sellingPrice || 0).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative flex items-center">
            <Input 
              placeholder="Tanyakan stok, analisis penjualan, atau buat pesanan..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              className="w-full h-14 pl-6 pr-16 text-base bg-white dark:bg-gray-900 border-yellow-200/50 focus-visible:ring-yellow-400 shadow-2xl rounded-2xl transition-all"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              size="icon"
              className="absolute right-2 h-10 w-10 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl shadow-lg transition-transform active:scale-90 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-[10px] text-center text-gray-400 mt-2">
            AI dapat memberikan informasi stok dan membantu proses transaksi secara otomatis.
          </p>
        </form>
      </div>
    </div>
  );
}
