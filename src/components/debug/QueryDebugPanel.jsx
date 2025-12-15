import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import { queryLogBuffer, exportQueryLogs, clearQueryLogs, printQuerySummary } from "./queryLogger";

export default function QueryDebugPanel() {
  const [logs, setLogs] = useState([]);
  const [pingPongCount, setPingPongCount] = useState(0);

  const refreshLogs = () => {
    const allLogs = queryLogBuffer.getAll();
    setLogs(allLogs.slice(-50)); // Show last 50
    
    // Count ping-pong patterns
    let count = 0;
    for (let i = 1; i < allLogs.length; i++) {
      const prev = allLogs[i - 1];
      const curr = allLogs[i];
      
      if (prev.entity === curr.entity && 
          prev.entity === 'Thought' &&
          prev.filter !== curr.filter) {
        count++;
      }
    }
    setPingPongCount(count);
  };

  useEffect(() => {
    refreshLogs();
    const interval = setInterval(refreshLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            🐛 Query Debug Panel
            {pingPongCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {pingPongCount} ping-pong
              </Badge>
            )}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={refreshLogs}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={printQuerySummary}>
              Summary
            </Button>
            <Button size="sm" variant="outline" onClick={exportQueryLogs}>
              <Download className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              clearQueryLogs();
              refreshLogs();
            }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500">No queries logged yet</p>
          ) : (
            logs.map((log, i) => (
              <div 
                key={i} 
                className="text-xs border-l-2 border-slate-300 pl-3 py-1 font-mono"
                style={{
                  borderLeftColor: log.entity === 'Thought' ? '#6366f1' : '#94a3b8'
                }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <Badge variant="outline" className="text-xs">{log.entity}</Badge>
                  <code className="bg-slate-100 px-1 rounded">{log.filter}</code>
                  {log.resultCount !== undefined && (
                    <span className="text-green-600">→ {log.resultCount} results</span>
                  )}
                  {log.duration && (
                    <span className="text-slate-400">{log.duration}ms</span>
                  )}
                </div>
                {log.callsite && (
                  <div className="text-slate-400 text-[10px] mt-1 truncate">
                    📍 {log.callsite}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}