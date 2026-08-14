import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generatePostSchema } from "@/lib/validation/marketing";

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp Status/Broadcast",
  TIKTOK: "TikTok",
  X: "X (Twitter)",
  OTHER: "social media",
};

export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI generator haijawekwa. Admin anahitaji kuweka ANTHROPIC_API_KEY kwenye environment variables.",
        notConfigured: true,
      },
      { status: 503 }
    );
  }

  const body = await req.json();
  const parsed = generatePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const { topic, audience, platform, tone } = parsed.data;
  const platformLabel = PLATFORM_LABELS[platform] ?? "social media";

  const prompt = `Andika post fupi ya ${platformLabel} kwa ajili ya Afya Nyumbani Home Care Services Ltd, kampuni ya huduma za afya nyumbani (home healthcare) Tanzania.

Mada: ${topic}
${audience ? `Walengwa: ${audience}` : ""}
${tone ? `Mtindo: ${tone}` : "Mtindo: wa kirafiki, wa kitaalamu, unaovutia"}

Andika kwa Kiswahili, kifupi (maneno 40-90), na maliza na call-to-action inayofaa. Usiongeze hashtags nyingi kupita kiasi (max 3). Toa MAUDHUI TU ya post, bila maelezo mengine, bila utangulizi kama "Hapa kuna..." au vichwa vya habari.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `AI generator imeshindwa: ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const content: string =
      json.content?.[0]?.type === "text" ? json.content[0].text.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "AI haikutoa jibu. Jaribu tena." },
        { status: 502 }
      );
    }

    return NextResponse.json({ content });
  } catch {
    return NextResponse.json(
      { error: "Imeshindwa kuwasiliana na AI generator." },
      { status: 502 }
    );
  }
}
