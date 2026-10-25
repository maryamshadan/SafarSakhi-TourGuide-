import { Language } from "../types";

export interface LandmarkResult {
  identified?: boolean;
  name: string;
  description?: string;
  architecture?: string;
  history?: string;
  visitorGuidance?: string;
  safetyTip: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  fallback?: boolean;
}

export interface AICategorizationResult {
  category: 'LIGHTING' | 'HARASSMENT' | 'ISOLATED' | 'PATHWAY' | 'TRANSPORT' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  neutralSummary: string;
  suggestedAction: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  fallback?: boolean;
}

// AI-Assisted Safety Hazard Triage (via server-side Gemini endpoint)
export const categorizeSafetyReport = async (
  text: string,
  reportedCategory?: string
): Promise<AICategorizationResult> => {
  try {
    const response = await fetch('/api/gemini/categorize-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, reportedCategory }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data: AICategorizationResult = await response.json();
    return data;
  } catch (error) {
    console.warn("AI categorization client fallback:", error);
    // Instant client-side deterministic fallback
    const lower = text.toLowerCase();
    let category: AICategorizationResult['category'] = 'OTHER';
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (lower.includes('light') || lower.includes('dark')) {
      category = 'LIGHTING';
      severity = 'MEDIUM';
    } else if (lower.includes('harass') || lower.includes('stalk') || lower.includes('follow') || lower.includes('catcall')) {
      category = 'HARASSMENT';
      severity = 'HIGH';
    } else if (lower.includes('alone') || lower.includes('deserted') || lower.includes('isolated')) {
      category = 'ISOLATED';
      severity = 'MEDIUM';
    }
    return {
      category,
      severity,
      neutralSummary: text.slice(0, 80),
      suggestedAction: 'Stay alert and prefer main arterial roads with active commercial activity.',
      confidence: 'MEDIUM',
      fallback: true
    };
  }
};

// AI Landmark Recognition (Vision-to-Text via server-side Gemini API)
export const identifyLandmark = async (base64Image: string, lang: Language = 'en'): Promise<LandmarkResult> => {
  try {
    const response = await fetch('/api/gemini/identify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64Image, lang }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Landmark ID Error:", error);
    throw error;
  }
};

// AI Chat Guide (via server-side Gemini API)
export const getChatResponse = async (
  history: { role: string; text: string }[],
  message: string,
  lang: Language = 'en'
): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ history, message, lang }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with ${response.status}`);
    }

    const data = await response.json();
    return data.text || "I'm sorry, I'm having trouble processing that right now.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm having trouble connecting to the heritage network. Please try again later.";
  }
};

// Streaming Chat Helper (via server-side SSE)
export const getChatStream = async (
  history: { role: string; text: string }[],
  message: string,
  lang: Language = 'en',
  onChunk: (text: string) => void
): Promise<void> => {
  const response = await fetch('/api/gemini/chat-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ history, message, lang }),
  });

  if (!response.ok || !response.body) {
    throw new Error('Failed to start chat stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.replace(/^data:\s*/, '');
      if (dataStr === '[DONE]') return;
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.text) {
          onChunk(parsed.text);
        }
      } catch (e) {
        // ignore parse error
      }
    }
  }
};

// --- Journey & Safe Tracking Client API ---
export interface StartJourneyPayload {
  userName: string;
  originName: string;
  destinationName: string;
  routeName: string;
  originCoords: [number, number];
  destinationCoords: [number, number];
  contacts: any[];
}

export const startLiveJourney = async (payload: StartJourneyPayload) => {
  const res = await fetch('/api/journey/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to start journey');
  return res.json();
};

export const checkInLiveJourney = async (
  journeyId: string, 
  currentLocation?: { lat: number; lon: number }, 
  contacts?: any[], 
  isSOS = false
) => {
  const res = await fetch('/api/journey/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ journeyId, currentLocation, contacts, isSOS }),
  });
  if (!res.ok) throw new Error('Check-in failed');
  return res.json();
};

export const endLiveJourney = async (journeyId: string) => {
  const res = await fetch('/api/journey/end', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ journeyId }),
  });
  if (!res.ok) throw new Error('End journey failed');
  return res.json();
};

export const updateLiveJourneyLocation = async (
  journeyId: string,
  currentLocation: { lat: number; lon: number }
) => {
  const res = await fetch('/api/journey/update-location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ journeyId, currentLocation }),
  });
  if (!res.ok) throw new Error('Update location failed');
  return res.json();
};

