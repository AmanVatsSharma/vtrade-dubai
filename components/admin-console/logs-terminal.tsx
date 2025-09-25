"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Terminal,
  Search,
  Download,
  Play,
  Pause,
  Trash2,
  User,
  Database,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react"

const mockLogs = [
  {
    id: 1,
    timestamp: "2024-03-15 14:30:25.123",
    level: "INFO",
    source: "AUTH_SERVICE",
    userId: "USR_001234",
    message: "User login successful",
    details: { ip: "192.168.1.100", userAgent: "Mozilla/5.0..." },
  },
  {
    id: 2,
    timestamp: "2024-03-15 14:29:18.456",
    level: "ERROR",
    source: "PAYMENT_SERVICE",
    userId: "USR_005678",
    message: "Payment processing failed",
    details: { amount: 5000, error: "Insufficient funds", transactionId: "TXN123456" },
  },
  {
    id: 3,
    timestamp: "2024-03-15 14:28:42.789",
    level: "WARN",
    source: "TRADE_ENGINE",
    userId: "USR_009876",
    message: "High frequency trading detected",
    details: { trades: 50, timeWindow: "1min", symbol: "AAPL" },
  },
  {
    id: 4,
    timestamp: "2024-03-15 14:27:15.321",
    level: "INFO",
    source: "DATABASE",
    userId: null,
    message: "Database backup completed",
    details: { size: "2.4GB", duration: "45s" },
  },
  {
    id: 5,
    timestamp: "2024-03-15 14:26:33.654",
    level: "DEBUG",
    source: "API_GATEWAY",
    userId: "USR_004321",
    message: "API rate limit warning",
    details: { endpoint: "/api/trades", requests: 95, limit: 100 },
  },
]

const mockDatabaseLogs = [
  {
    id: 1,
    timestamp: "2024-03-15 14:30:25",
    query: "SELECT * FROM users WHERE client_id = 'USR_001234'",
    duration: "12ms",
    status: "SUCCESS",
    rows: 1,
  },
  {
    id: 2,
    timestamp: "2024-03-15 14:29:18",
    query: "UPDATE accounts SET balance = balance + 5000 WHERE user_id = 'USR_005678'",
    duration: "8ms",
    status: "SUCCESS",
    rows: 1,
  },
  {
    id: 3,
    timestamp: "2024-03-15 14:28:42",
    query: "INSERT INTO trades (user_id, symbol, quantity, price) VALUES ('USR_009876', 'AAPL', 100, 150.25)",
    duration: "15ms",
    status: "SUCCESS",
    rows: 1,
  },
  {
    id: 4,
    timestamp: "2024-03-15 14:27:15",
    query: "SELECT COUNT(*) FROM active_sessions WHERE created_at > NOW() - INTERVAL 1 HOUR",
    duration: "25ms",
    status: "SUCCESS",
    rows: 1,
  },
]

export function LogsTerminal() {
  const [searchTerm, setSearchTerm] = useState("")
  const [clientIdSearch, setClientIdSearch] = useState("")
  const [logLevel, setLogLevel] = useState("all")
  const [isLiveMode, setIsLiveMode] = useState(true)
  const [terminalInput, setTerminalInput] = useState("")
  const [terminalHistory, setTerminalHistory] = useState<string[]>([])
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "Trading Admin Terminal v2.1.0",
    "Type 'help' for available commands",
    "",
  ])
  const terminalRef = useRef<HTMLDivElement>(null)

  const getLogIcon = (level: string) => {
    switch (level) {
      case "ERROR":
        return <XCircle className="w-4 h-4 text-red-400" />
      case "WARN":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case "INFO":
        return <Info className="w-4 h-4 text-blue-400" />
      case "DEBUG":
        return <Activity className="w-4 h-4 text-purple-400" />
      default:
        return <CheckCircle className="w-4 h-4 text-green-400" />
    }
  }

  const getLogBadge = (level: string) => {
    const colors = {
      ERROR: "bg-red-400/20 text-red-400 border-red-400/30",
      WARN: "bg-yellow-400/20 text-yellow-400 border-yellow-400/30",
      INFO: "bg-blue-400/20 text-blue-400 border-blue-400/30",
      DEBUG: "bg-purple-400/20 text-purple-400 border-purple-400/30",
      SUCCESS: "bg-green-400/20 text-green-400 border-green-400/30",
    }
    return <Badge className={colors[level as keyof typeof colors] || colors.INFO}>{level}</Badge>
  }

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClientId = !clientIdSearch || (log.userId && log.userId.includes(clientIdSearch))
    const matchesLevel = logLevel === "all" || log.level === logLevel
    return matchesSearch && matchesClientId && matchesLevel
  })

  const handleTerminalCommand = (command: string) => {
    const cmd = command.trim().toLowerCase()
    setTerminalHistory([...terminalHistory, command])
    setTerminalOutput((prev) => [...prev, `$ ${command}`])

    switch (cmd) {
      case "help":
        setTerminalOutput((prev) => [
          ...prev,
          "Available commands:",
          "  help          - Show this help message",
          "  clear         - Clear terminal",
          "  status        - Show system status",
          "  users         - List active users",
          "  logs [level]  - Show logs (error, warn, info, debug)",
          "  db stats      - Show database statistics",
          "  backup        - Initiate system backup",
          "",
        ])
        break
      case "clear":
        setTerminalOutput(["Trading Admin Terminal v2.1.0", "Type 'help' for available commands", ""])
        break
      case "status":
        setTerminalOutput((prev) => [
          ...prev,
          "System Status:",
          "  Server: ONLINE",
          "  Database: CONNECTED",
          "  Active Users: 1,234",
          "  Memory Usage: 67%",
          "  CPU Usage: 23%",
          "",
        ])
        break
      case "users":
        setTerminalOutput((prev) => [
          ...prev,
          "Active Users (Last 5):",
          "  USR_001234 - Alex Chen (2 min ago)",
          "  USR_005678 - Sarah Johnson (5 min ago)",
          "  USR_009876 - Mike Rodriguez (8 min ago)",
          "  USR_004321 - Emma Wilson (12 min ago)",
          "  USR_007890 - David Kim (15 min ago)",
          "",
        ])
        break
      case "db stats":
        setTerminalOutput((prev) => [
          ...prev,
          "Database Statistics:",
          "  Total Queries: 45,230",
          "  Avg Response Time: 12ms",
          "  Active Connections: 23",
          "  Cache Hit Rate: 94.2%",
          "  Storage Used: 2.4GB",
          "",
        ])
        break
      case "backup":
        setTerminalOutput((prev) => [
          ...prev,
          "Initiating system backup...",
          "Backup started at " + new Date().toLocaleTimeString(),
          "Estimated completion: 2-3 minutes",
          "",
        ])
        break
      default:
        if (cmd.startsWith("logs")) {
          const level = cmd.split(" ")[1]
          setTerminalOutput((prev) => [
            ...prev,
            `Showing ${level || "all"} logs:`,
            "Use the Logs tab for detailed log viewing",
            "",
          ])
        } else {
          setTerminalOutput((prev) => [
            ...prev,
            `Command not found: ${command}`,
            "Type 'help' for available commands",
            "",
          ])
        }
    }
    setTerminalInput("")
  }

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalOutput])

  // Simulate live logs
  useEffect(() => {
    if (!isLiveMode) return

    const interval = setInterval(() => {
      const newLog = {
        id: Date.now(),
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 23),
        level: ["INFO", "WARN", "ERROR", "DEBUG"][Math.floor(Math.random() * 4)],
        source: ["AUTH_SERVICE", "PAYMENT_SERVICE", "TRADE_ENGINE", "API_GATEWAY"][Math.floor(Math.random() * 4)],
        userId: Math.random() > 0.3 ? `USR_${Math.random().toString().slice(2, 8)}` : null,
        message: [
          "User session created",
          "Trade executed successfully",
          "Payment processed",
          "API request received",
          "Database query completed",
        ][Math.floor(Math.random() * 5)],
        details: {},
      }
      // In a real app, this would update the logs array
    }, 3000)

    return () => clearInterval(interval)
  }, [isLiveMode])

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Logs & Terminal</h1>
            <p className="text-muted-foreground">Monitor system logs and execute terminal commands</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLiveMode(!isLiveMode)}
              className={`border-primary/50 ${isLiveMode ? "text-green-400 bg-green-400/10" : "text-muted-foreground"}`}
            >
              {isLiveMode ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isLiveMode ? "Live" : "Paused"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs defaultValue="logs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-muted/30">
            <TabsTrigger
              value="logs"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Application Logs
            </TabsTrigger>
            <TabsTrigger
              value="database"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Database Logs
            </TabsTrigger>
            <TabsTrigger
              value="terminal"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Terminal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs">
            <div className="space-y-4">
              {/* Filters */}
              <Card className="bg-card/50 border-border neon-border">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-muted/50 border-border focus:border-primary"
                      />
                    </div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Client ID..."
                        value={clientIdSearch}
                        onChange={(e) => setClientIdSearch(e.target.value)}
                        className="pl-10 bg-muted/50 border-border focus:border-primary"
                      />
                    </div>
                    <Select value={logLevel} onValueChange={setLogLevel}>
                      <SelectTrigger className="bg-muted/50 border-border focus:border-primary">
                        <SelectValue placeholder="Log Level" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="ERROR">Error</SelectItem>
                        <SelectItem value="WARN">Warning</SelectItem>
                        <SelectItem value="INFO">Info</SelectItem>
                        <SelectItem value="DEBUG">Debug</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Logs Display */}
              <Card className="bg-card/50 border-border neon-border">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-primary flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Application Logs ({filteredLogs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-sm">
                    <AnimatePresence>
                      {filteredLogs.map((log, index) => (
                        <motion.div
                          key={log.id}
                          className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-200"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3, delay: index * 0.02 }}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            {getLogIcon(log.level)}
                            {getLogBadge(log.level)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                              <div className="flex items-center space-x-2">
                                <Badge className="bg-muted text-muted-foreground text-xs">{log.source}</Badge>
                                {log.userId && (
                                  <Badge className="bg-primary/20 text-primary text-xs">{log.userId}</Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-foreground">{log.message}</p>
                            {Object.keys(log.details).length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-primary">
                                  Show details
                                </summary>
                                <pre className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="database">
            <Card className="bg-card/50 border-border neon-border">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-primary flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Database Query Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-sm">
                  {mockDatabaseLogs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      className="p-3 bg-muted/30 rounded-lg border border-border/50"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                        <div className="flex items-center space-x-2">
                          {getLogBadge(log.status)}
                          <span className="text-xs text-muted-foreground">{log.duration}</span>
                          <span className="text-xs text-muted-foreground">{log.rows} rows</span>
                        </div>
                      </div>
                      <code className="text-primary text-xs bg-primary/10 p-2 rounded block overflow-x-auto">
                        {log.query}
                      </code>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terminal">
            <Card className="bg-card/50 border-border neon-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-primary flex items-center">
                    <Terminal className="w-5 h-5 mr-2" />
                    Admin Terminal
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTerminalOutput(["Trading Admin Terminal v2.1.0", "Type 'help' for available commands", ""])
                    }
                    className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-black/90 rounded-lg p-4 font-mono text-sm terminal-glow">
                  <div
                    ref={terminalRef}
                    className="h-80 overflow-y-auto space-y-1 text-green-400 scrollbar-thin scrollbar-thumb-green-400/50"
                  >
                    {terminalOutput.map((line, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.1, delay: index * 0.02 }}
                        className="whitespace-pre-wrap"
                      >
                        {line}
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex items-center mt-2 border-t border-green-400/30 pt-2">
                    <span className="text-green-400 mr-2">$</span>
                    <Input
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleTerminalCommand(terminalInput)
                        }
                      }}
                      className="bg-transparent border-none text-green-400 placeholder-green-400/50 focus:ring-0 focus:outline-none p-0"
                      placeholder="Enter command..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}
