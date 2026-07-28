"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, X, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function renderMessageContent(content: string) {
  // Split by line to detect tables
  const lines = content.split('\n');
  const result: React.ReactNode[] = [];
  let currentTable: string[][] = [];
  let inTable = false;

  const flushTable = (index: number) => {
    if (currentTable.length === 0) return;
    
    // Filter out separator lines like |---|
    const filteredRows = currentTable.filter(row => !row.every(cell => cell.trim().match(/^-+$/)));
    
    if (filteredRows.length > 0) {
      result.push(
        <div key={`table-${index}`} className="my-2 border rounded-lg overflow-hidden bg-card/50">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-chart-3/10 border-b">
                {filteredRows[0].map((cell, i) => (
                  <th key={i} className="p-2 text-left font-bold border-r last:border-r-0">{cell.trim()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.slice(1).map((row, i) => (
                <tr key={i} className="border-b last:border-b-0 hover:bg-chart-3/10">
                  {row.map((cell, j) => (
                    <td key={j} className="p-2 border-r last:border-r-0 whitespace-nowrap">
                      {cell.trim().startsWith('Rp') || !isNaN(Number(cell.trim().replace(/[,.]/g, ''))) ? (
                        <span className="font-mono">{cell.trim()}</span>
                      ) : (
                        cell.trim()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
      
      // Simple bold and line break handling
      const formattedLine = line.split('**').map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="text-chart-3 font-bold">{part}</strong> : part
      );
      
      result.push(<p key={index} className={cn("min-h-[1em]", line.trim() === "" ? "my-1" : "")}>{formattedLine.length > 0 ? formattedLine : " "}</p>);
    }
  });

  if (inTable) flushTable(999);

  return result;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Halo! Saya adalah asisten AI Anda. Apa yang bisa saya bantu hari ini terkait data POS Anda?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages, { role: "user", content: userMessage }].slice(-10) // Send last 10 messages for context
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessages(prev => [...prev, { role: "assistant", content: result.message }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Maaf, terjadi kesalahan: " + result.message }]);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Maaf, tidak dapat terhubung ke pelayan." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-soft-lg bg-chart-3 hover:bg-chart-3/90 text-black border-none"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="w-[400px] h-[550px] flex flex-col shadow-soft-lg border-chart-3/20 bg-card animate-in slide-in-from-bottom-5 duration-300">
          <CardHeader className="flex flex-row items-center justify-between p-4 bg-chart-3 text-black rounded-t-xl border-none">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <CardTitle className="text-lg">POS AI Assistant</CardTitle>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0 rounded-full border-none bg-black/10 hover:bg-black/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full p-4" viewportRef={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-soft",
                      msg.role === "assistant" ? "bg-chart-3/15 text-chart-3" : "bg-primary/10 text-primary"
                    )}>
                      {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className={cn(
                      "p-3 rounded-2xl text-sm shadow-soft prose prose-sm max-w-full overflow-x-auto",
                      msg.role === "assistant"
                        ? "bg-muted text-foreground border border-transparent"
                        : "bg-primary text-primary-foreground font-medium"
                    )}>
                      {renderMessageContent(msg.content)}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-chart-3/15 text-chart-3 flex items-center justify-center animate-pulse">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="p-3 rounded-2xl bg-muted border border-transparent shadow-soft flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-chart-3" />
                      <span className="text-xs text-muted-foreground">Berfikir...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-4 border-t bg-muted/50 rounded-b-xl">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex w-full gap-2"
            >
              <Input
                placeholder="Tanyakan tentang stok atau penjualan..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
                className="flex-1 bg-card border-chart-3/20 focus-visible:ring-chart-3"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="bg-chart-3 hover:bg-chart-3/90 text-black border-none"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
