import React from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  PhoneOff,
  PhoneOutgoing,
  Mic,
  MicOff,
  PauseCircle,
  ShieldCheck,
  Lightbulb,
  TimerReset,
  ClipboardList,
  User2,
  Building2,
  Mail,
  Hash,
  Waves,
} from "lucide-react";

// Brand tokens (Vistio-inspired)
const BRAND = {
  navy: "#0B2545",
  red: "#E94B4B",
};

// Bubble
const ChatBubble = ({ role, text }: { role: "agent" | "customer"; text: string }) => (
  <div className={`flex ${role === "agent" ? "justify-end" : "justify-start"}`}>
    <div
      className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
        role === "agent"
          ? "bg-[var(--brand-red)] text-white rounded-br-none"
          : "bg-white border rounded-bl-none"
      }`}
      style={{
        // enable CSS var usage in Tailwind env
        //@ts-ignore
        "--brand-red": BRAND.red,
      }}
    >
      {text}
    </div>
  </div>
);

// Tiny pill
const StatusPill = ({ label, tone = "neutral" as "neutral" | "good" | "warn" | "bad" }) => {
  const map: any = {
    neutral: "bg-white/10 text-white",
    good: "bg-emerald-500/20 text-white",
    warn: "bg-amber-500/20 text-white",
    bad: "bg-red-500/20 text-white",
  };
  return <span className={`text-xs px-2 py-1 rounded-full ${map[tone]}`}>{label}</span>;
};

// Voice meter (dummy)
const VoiceMeter = ({ strength = 60 }: { strength?: number }) => (
  <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
    <div className="h-full rounded-full" style={{ width: `${strength}%`, background: "white" }} />
  </div>
);

export default function AgentSimulationView() {
  return (
    <div className="h-screen w-full bg-gradient-to-b from-[rgba(11,37,69,0.05)] to-slate-50 text-slate-900">
      {/* Header */}
      <div
        className="sticky top-0 z-10"
        style={{ backgroundColor: BRAND.navy, color: "white" }}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5" />
            <div className="text-sm opacity-80">Live Simulation</div>
            <Separator orientation="vertical" className="mx-1 h-5 bg-white/20" />
            <div className="text-sm font-semibold">Address Change</div>
            <StatusPill label="In Call" />
            <StatusPill label="Recording" tone="warn" />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs">
              <TimerReset className="h-4 w-4 opacity-80" />
              <span className="font-mono">00:07:42</span>
            </div>
            <Button size="sm" className="rounded-xl bg-white/10 hover:bg-white/20 text-white">
              <Mic className="h-4 w-4 mr-2" /> Mute
            </Button>
            <Button size="sm" className="rounded-xl bg-white/10 hover:bg-white/20 text-white">
              <PauseCircle className="h-4 w-4 mr-2" /> Hold
            </Button>
            <Button size="sm" className="rounded-xl bg-white/10 hover:bg-white/20 text-white">
              <PhoneOutgoing className="h-4 w-4 mr-2" /> Transfer
            </Button>
            <Button size="sm" className="rounded-xl" style={{ backgroundColor: BRAND.red, color: "white" }}>
              <PhoneOff className="h-4 w-4 mr-2" /> End
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://i.pravatar.cc/64?img=9" alt="User" />
              <AvatarFallback>AG</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-7xl p-4 grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Left rail: Customer / Knowledge */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Customer</CardTitle>
              <CardDescription>Profile & verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="https://i.pravatar.cc/64?img=21" />
                  <AvatarFallback>VM</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">Valerie Moore</div>
                  <div className="text-xs text-muted-foreground">Member since 2019</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2"><User2 className="h-3.5 w-3.5" /><span>Verified (2FA)</span></div>
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span>valerie@example.com</span></div>
                <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /><span>Chicago, IL</span></div>
                <div className="flex items-center gap-2"><Hash className="h-3.5 w-3.5" /><span>Acct •• 4821</span></div>
              </div>
              <Separator />
              <div>
                <div className="text-xs text-muted-foreground">Sentiment</div>
                <Progress value={78} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Knowledge</CardTitle>
              <CardDescription>Top results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {["Change of Address Policy","Address Validation with USPS","Proof of Residency Checklist"].map((k, i) => (
                <div key={i} className="rounded-xl border p-3 hover:bg-muted/40 cursor-pointer">
                  <div className="font-medium">{k}</div>
                  <div className="text-xs text-muted-foreground">Opens in side panel</div>
                </div>
              ))}
              <Button variant="ghost" className="w-full rounded-xl">Open KB</Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Script Hints</CardTitle>
              <CardDescription>AI guidance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 mt-0.5 text-amber-500" />
                <p>Use empathetic acknowledgement: “I can help get this updated quickly for you.”</p>
              </div>
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 mt-0.5 text-amber-500" />
                <p>Confirm email & send one-time code before modifying address.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center: Conversation */}
        <div className="xl:col-span-2 space-y-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Conversation</CardTitle>
                  <CardDescription>Voice with live transcript</CardDescription>
                </div>
                <div className="text-xs text-muted-foreground">Session ID: 7f3a-221b</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[360px] rounded-2xl border bg-white p-3 space-y-2 overflow-auto">
                <ChatBubble role="customer" text="Hi, I need to update my address after moving." />
                <ChatBubble role="agent" text="I can help with that. Could you confirm your account email?" />
                <ChatBubble role="customer" text="valerie@example.com" />
                <ChatBubble role="agent" text="Thanks. I just sent a 6‑digit code to that address—what do you see?" />
                <ChatBubble role="customer" text="287394" />
                <ChatBubble role="agent" text="Perfect. What's the new street address and ZIP?" />
              </div>
              <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2 flex items-center gap-2">
                  <Input placeholder="Type your reply… (press Enter to send)" className="rounded-xl" />
                  <Button className="rounded-xl" style={{ backgroundColor: BRAND.red, color: "white" }}>Send</Button>
                </div>
                <div className="rounded-2xl border p-3">
                  <div className="text-xs text-muted-foreground">Mic level</div>
                  <VoiceMeter strength={62} />
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <Mic className="h-4 w-4 text-slate-600" />
                    <span>Open mic • Noise filter on</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notes</CardTitle>
              <CardDescription>Visible to reviewers</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea className="w-full min-h-[100px] rounded-xl border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[rgba(233,75,75,0.3)]" placeholder="(Optional) Add case notes here…" />
              <div className="mt-2 flex items-center justify-end gap-2">
                <Button variant="ghost" className="rounded-xl">Insert Macro</Button>
                <Button className="rounded-xl" style={{ backgroundColor: BRAND.red, color: "white" }}>Save Notes</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right rail: Compliance & Next Best Action */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Policy Compliance</CardTitle>
              <CardDescription>Live scoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { name: "ID Verification", score: 80, max: 100 },
                { name: "Empathy", score: 72, max: 100 },
                { name: "PCI Hygiene", score: 100, max: 100 },
              ].map((c, i) => (
                <div key={i} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{c.name}</div>
                    <Badge variant={c.score >= 90 ? "default" : c.score >= 80 ? "secondary" : "outline"}>{c.score}%</Badge>
                  </div>
                  <Progress className="mt-2" value={(100 * c.score) / c.max} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Next Best Action</CardTitle>
              <CardDescription>Real‑time guidance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5" />
                <p>Confirm last 4 digits of ID and read disclosure before saving new address.</p>
              </div>
              <div className="flex items-start gap-2">
                <ClipboardList className="h-4 w-4 text-sky-600 mt-0.5" />
                <p>Create a follow‑up ticket for mailed confirmation letter.</p>
              </div>
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5" />
                <p>Offer to update paperless preferences while you’re there.</p>
              </div>
              <div className="pt-1">
                <Button className="w-full rounded-xl" style={{ backgroundColor: BRAND.red, color: "white" }}>Apply Actions</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Wrap‑Up</CardTitle>
              <CardDescription>After call ends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <select className="w-full rounded-xl border bg-white p-2 text-sm">
                <option>Disposition: Address Change</option>
                <option>Disposition: Billing Question</option>
                <option>Disposition: Payment Plan</option>
              </select>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="survey" className="h-4 w-4" />
                <label htmlFor="survey">Send post‑call survey</label>
              </div>
              <Button className="w-full rounded-xl" style={{ backgroundColor: BRAND.red, color: "white" }}>Complete</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
