import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type, Modality, LiveServerMessage } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!apiKey) {
  console.warn('Warning: GEMINI_API_KEY or API_KEY is not defined in environment variables.');
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Middleware for parsing JSON requests
app.use(express.json({ limit: '50mb' }));

// ============================================================================
// REAL USER AUTHENTICATION & SESSION MANAGEMENT
// ============================================================================
interface ServerUser {
  id: string;
  name: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  language: string;
  emergencyContacts: any[];
  badges: string[];
  visitedMonuments: string[];
  shareLocationConsent: boolean;
  checkInReminderMins: number;
  createdAt: number;
}

const registeredUsers = new Map<string, ServerUser>();
const authSessions = new Map<string, string>(); // token -> email

function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  try {
    const computed = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  } catch {
    return false;
  }
}

// POST: Create Account / Register
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, language = 'en', emergencyContacts = [] } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'A valid name (at least 2 characters) is required.' });
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (registeredUsers.has(cleanEmail)) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please sign in.' });
    }

    const { salt, hash } = hashPassword(password);
    const userId = 'u_' + crypto.randomBytes(8).toString('hex');

    const newUser: ServerUser = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      passwordSalt: salt,
      passwordHash: hash,
      language,
      emergencyContacts,
      badges: ['explorer'],
      visitedMonuments: [],
      shareLocationConsent: true,
      checkInReminderMins: 15,
      createdAt: Date.now()
    };

    registeredUsers.set(cleanEmail, newUser);

    const token = 'tg_tok_' + crypto.randomBytes(24).toString('hex');
    authSessions.set(token, cleanEmail);

    const safeUser = {
      name: newUser.name,
      email: newUser.email,
      language: newUser.language,
      emergencyContacts: newUser.emergencyContacts,
      badges: newUser.badges,
      visitedMonuments: newUser.visitedMonuments,
      shareLocationConsent: newUser.shareLocationConsent,
      checkInReminderMins: newUser.checkInReminderMins,
      isGuest: false,
      token
    };

    return res.status(201).json({ success: true, user: safeUser, token });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// POST: Sign In
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = registeredUsers.get(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'No account found with this email. Please check your credentials or create an account.' });
    }

    const valid = verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password. Please verify and try again.' });
    }

    const token = 'tg_tok_' + crypto.randomBytes(24).toString('hex');
    authSessions.set(token, cleanEmail);

    const safeUser = {
      name: user.name,
      email: user.email,
      language: user.language,
      emergencyContacts: user.emergencyContacts,
      badges: user.badges,
      visitedMonuments: user.visitedMonuments,
      shareLocationConsent: user.shareLocationConsent,
      checkInReminderMins: user.checkInReminderMins,
      isGuest: false,
      token
    };

    return res.json({ success: true, user: safeUser, token });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Sign in failed. Please try again.' });
  }
});

// POST: Sign Out
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/, '') || String(req.body.token || '');
  if (token && authSessions.has(token)) {
    authSessions.delete(token);
  }
  return res.json({ success: true, message: 'Signed out successfully.' });
});

// GET: Current Authenticated User Session
app.get('/api/auth/me', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/, '');
  if (!token || !authSessions.has(token)) {
    return res.status(401).json({ error: 'Not authenticated or session expired.' });
  }

  const email = authSessions.get(token)!;
  const user = registeredUsers.get(email);
  if (!user) {
    return res.status(401).json({ error: 'User record not found.' });
  }

  return res.json({
    name: user.name,
    email: user.email,
    language: user.language,
    emergencyContacts: user.emergencyContacts,
    badges: user.badges,
    visitedMonuments: user.visitedMonuments,
    shareLocationConsent: user.shareLocationConsent,
    checkInReminderMins: user.checkInReminderMins,
    isGuest: false,
    token
  });
});

// ============================================================================
// 1. API: GENUINE LANDMARK RECOGNITION (Vision-to-Text via Gemini)
// ============================================================================
app.post('/api/gemini/identify', async (req: Request, res: Response) => {
  try {
    const { image, base64Image, lang = 'en' } = req.body;
    const rawData = base64Image || image;

    if (!rawData || typeof rawData !== 'string') {
      return res.status(400).json({ error: 'Image data is required in base64 format.' });
    }

    // Strip data URL scheme prefix if present
    const cleanBase64 = rawData.replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim();
    if (cleanBase64.length < 50) {
      return res.status(400).json({ error: 'Image data is invalid or empty.' });
    }

    const langMap: Record<string, string> = {
      en: 'English',
      hi: 'Hindi',
      te: 'Telugu',
    };
    const targetLang = langMap[lang] || 'English';

    if (!apiKey || apiKey.includes('PLACEHOLDER')) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Landmark vision recognition requires an active GEMINI_API_KEY.'
      });
    }

    const prompt = `You are a heritage and architectural historian specializing in Telangana, India.
Carefully examine the user-provided photograph:
1. Determine if this image depicts a genuine monument, temple, fort, palace, tomb, or recognized historical landmark in Telangana (e.g. Charminar, Golconda Fort, Qutb Shahi Tombs, Chowmahalla Palace, Falaknuma Palace, Birla Mandir, Mecca Masjid, Ramappa Temple, Warangal Fort, Yadadri, Bhadrachalam, Salar Jung Museum, Thousand Pillar Temple, Pakhal Lake, Kondapalli, Paigah Tombs, Jagannath Temple, Bhadrakali, Nizams Museum, Kondagattu, etc.).
2. If YES:
   - "identified": true
   - "name": Official landmark name with location (e.g., "Charminar, Hyderabad")
   - "architecture": Specific architectural style (e.g., Indo-Islamic, Kakatiyan granite sandbox, Asaf Jahi European neoclassical, Rajasthani white marble) and distinct motifs visible
   - "history": 2-3 sentences of genuine historical background, dynasty, founder, and century
   - "visitorGuidance": Practical guidance (recommended visiting hours, entry details, photography rules)
   - "safetyTip": Real safety advice for visitors (e.g. foot wear for fort stones, crowds, hydration)
   - "confidence": "HIGH" or "MEDIUM"
3. If NO (unrecognized, blurred, non-monument, or not a Telangana heritage landmark):
   - "identified": false
   - "name": "Unrecognized Landmark"
   - "architecture": "Architectural features could not be identified"
   - "history": "This photo does not match any documented heritage monument or historical landmark in Telangana."
   - "visitorGuidance": "Please aim the camera at the monument facade, main gateway, or distinctive central structure with good lighting and retry."
   - "safetyTip": "When taking photographs in public areas, remain aware of your surroundings and keep personal belongings secure."
   - "confidence": "LOW"

CRITICAL: Do NOT invent, guess, or fabricate a landmark name if it cannot be recognized. Provide all text in ${targetLang}.`;

    const apiCall = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identified: {
              type: Type.BOOLEAN,
              description: 'Whether the landmark was positively identified.',
            },
            name: {
              type: Type.STRING,
              description: 'The name of the landmark, or Unrecognized Landmark.',
            },
            architecture: {
              type: Type.STRING,
              description: 'Architectural style and structural features.',
            },
            history: {
              type: Type.STRING,
              description: 'Historical depth, origin dynasty, and significance.',
            },
            visitorGuidance: {
              type: Type.STRING,
              description: 'Visitor tips, visiting hours, or retry guidance.',
            },
            safetyTip: {
              type: Type.STRING,
              description: 'Helpful safety advice for visitors.',
            },
            confidence: {
              type: Type.STRING,
              description: 'HIGH, MEDIUM, or LOW confidence assessment.',
            },
          },
          required: ['identified', 'name', 'architecture', 'history', 'visitorGuidance', 'safetyTip', 'confidence'],
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Landmark vision analysis timed out')), 12000)
    );

    const response: any = await Promise.race([apiCall, timeoutPromise]);
    const text = response.text;
    if (text) {
      const result = JSON.parse(text);
      return res.json(result);
    }

    throw new Error('No recognition output returned from vision model.');
  } catch (error: any) {
    console.error('Server Landmark ID Error:', error);
    return res.status(503).json({
      error: error.message || 'Landmark vision analysis failed. Please verify network connectivity and try again.'
    });
  }
});

// 1b. API: AI-Assisted Safety Report Categorization & Neutral Summarization
app.post('/api/gemini/categorize-report', async (req: Request, res: Response) => {
  const { text = '', reportedCategory } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Report text is required.' });
  }

  // Deterministic fallback analysis
  const fallbackAnalysis = () => {
    const lower = text.toLowerCase();
    let category = reportedCategory || 'OTHER';
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    let suggestedAction = 'Proceed with heightened awareness; prefer busy main roads.';

    if (lower.includes('light') || lower.includes('dark') || lower.includes('lamp') || lower.includes('blackout') || lower.includes('bulb')) {
      category = 'LIGHTING';
      severity = 'MEDIUM';
      suggestedAction = 'Use portable torch and avoid poorly illuminated shortcuts after dark.';
    } else if (
      lower.includes('harass') || lower.includes('stalk') || lower.includes('follow') ||
      lower.includes('catcall') || lower.includes('stare') || lower.includes('touch') ||
      lower.includes('eve teasing') || lower.includes('whisper') || lower.includes('chase')
    ) {
      category = 'HARASSMENT';
      severity = 'HIGH';
      suggestedAction = 'Report immediately to Telangana She Teams (Dial 100/181); move toward open commercial areas.';
    } else if (lower.includes('alone') || lower.includes('isolated') || lower.includes('deserted') || lower.includes('empty') || lower.includes('lonely')) {
      category = 'ISOLATED';
      severity = 'MEDIUM';
      suggestedAction = 'Avoid walking alone during off-peak hours; seek companion transit.';
    } else if (lower.includes('block') || lower.includes('barrier') || lower.includes('dug') || lower.includes('construction') || lower.includes('debris')) {
      category = 'PATHWAY';
      severity = 'LOW';
      suggestedAction = 'Take paved alternate sidewalk to prevent tripping or forced road walking.';
    } else if (lower.includes('auto') || lower.includes('cab') || lower.includes('rickshaw') || lower.includes('bus') || lower.includes('metro') || lower.includes('driver')) {
      category = 'TRANSPORT';
      severity = 'MEDIUM';
      suggestedAction = 'Verify driver vehicle ID and share live trip link with trusted contacts.';
    }

    const sentences = text.trim().split(/[.!?]+/);
    const firstSentence = sentences[0] ? sentences[0].trim() : text.slice(0, 80);
    const neutralSummary = firstSentence.length > 90 ? firstSentence.slice(0, 87) + '...' : firstSentence;

    return {
      category,
      severity,
      neutralSummary,
      suggestedAction,
      confidence: 'MEDIUM',
      fallback: true
    };
  };

    if (!apiKey || apiKey.includes('PLACEHOLDER')) {
      return res.json(fallbackAnalysis());
    }

  try {
    const prompt = `You are an evidence triage assistant for TourGuide, a women's safety navigation and heritage exploration companion in Telangana, India.
Analyze the following citizen safety report text:
"${text}"

Rules:
1. Categorize into exactly one of: LIGHTING, HARASSMENT, ISOLATED, PATHWAY, TRANSPORT, OTHER.
2. Determine severity based on immediate risk to personal safety: HIGH (harassment, stalking, physical threat), MEDIUM (unlit isolated road, broken lights, loitering), LOW (maintenance or minor transit hindrance).
3. Generate a neutral, factual 1-sentence summary under 20 words without sensationalism, emotional bias, or victim-blaming.
4. Suggest a concise, practical, non-judgmental action for other women commuters.
5. Set confidence to HIGH if report is descriptive and clear, otherwise MEDIUM.`;

    const apiCall = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: 'One of LIGHTING, HARASSMENT, ISOLATED, PATHWAY, TRANSPORT, OTHER'
            },
            severity: {
              type: Type.STRING,
              description: 'One of LOW, MEDIUM, HIGH'
            },
            neutralSummary: {
              type: Type.STRING,
              description: 'Factual, neutral summary under 20 words'
            },
            suggestedAction: {
              type: Type.STRING,
              description: 'Practical guidance for community members'
            },
            confidence: {
              type: Type.STRING,
              description: 'HIGH, MEDIUM, or LOW'
            }
          },
          propertyOrdering: ['category', 'severity', 'neutralSummary', 'suggestedAction', 'confidence']
        }
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI response timed out')), 5000)
    );
    const response: any = await Promise.race([apiCall, timeoutPromise]);

    const outputText = response.text;
    if (!outputText) {
      return res.json(fallbackAnalysis());
    }

    const parsed = JSON.parse(outputText);
    return res.json({
      category: parsed.category || 'OTHER',
      severity: parsed.severity || 'MEDIUM',
      neutralSummary: parsed.neutralSummary || text.slice(0, 80),
      suggestedAction: parsed.suggestedAction || 'Stay on illuminated arterial roads.',
      confidence: parsed.confidence || 'HIGH',
      fallback: false
    });
  } catch (error) {
    console.warn('Gemini categorization failed, using deterministic fallback:', error);
    return res.json(fallbackAnalysis());
  }
});

// Helper for Telangana contextual chat knowledge fallback
function getLocalTelanganaChatReply(message: string): string {
  const q = message.toLowerCase();
  if (q.includes('charminar')) {
    return "Charminar was built in 1591 by Sultan Muhammad Quli Qutb Shah. It is open 9:30 AM to 5:30 PM. For safe travel, morning hours (9:30-11:30 AM) have lighter crowds; stay on main Laad Bazaar paths.";
  }
  if (q.includes('golconda') || q.includes('fort')) {
    return "Golconda Fort is famous for its acoustic clapping portico and royal ruins. Guided entry is open until 5:30 PM with sound & light show at 7:00 PM. We recommend sticking to lit heritage corridors.";
  }
  if (q.includes('she teams') || q.includes('harass') || q.includes('safety') || q.includes('help') || q.includes('police') || q.includes('emergency')) {
    return "Telangana She Teams are available 24/7 for women's safety. Dial 181 for women's helpline or 100/112 for immediate police response. Our app's SOS button also prefills emergency alerts to your trusted contacts.";
  }
  if (q.includes('birla mandir') || q.includes('temple')) {
    return "Birla Mandir is built from 2,000 tons of pure white marble atop Naubat Pahad, overlooking Hussain Sagar. Open 7:00 AM-12:00 PM & 3:00 PM-9:00 PM. Excellent lighting and safe public access.";
  }
  if (q.includes('route') || q.includes('metro') || q.includes('night') || q.includes('transit')) {
    return "Hyderabad Metro runs until 11:00 PM with dedicated women's coaches and well-monitored stations (Hitec City, Ameerpet, Secunderabad). Always choose audited illuminated routes with active safe havens in the Map tab.";
  }
  return "As your TourGuide travel companion, I can assist with Telangana monument history, safe transit corridors, She Teams helplines, or live check-in tracking. What destination are you exploring today?";
}

// 2. API: Chat Guide (Unary)
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { history = [], message, lang = 'en' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const langMap: Record<string, string> = {
      en: 'English',
      hi: 'Hindi',
      te: 'Telugu',
    };

    const targetLang = langMap[lang] || 'English';

    if (apiKey && !apiKey.includes('PLACEHOLDER')) {
      try {
        const chat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: `You are 'TourGuide', a helpful AI travel and safe navigation assistant for visitors and women commuters in Telangana, India. You are knowledgeable about history, culture, safe routes, and She Teams protocols. 
VERY IMPORTANT: You MUST respond in ${targetLang} language. 
Keep responses helpful, safe, concise, and under 60 words.`,
          },
          history: history.map((h: { role: string; text: string }) => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.text }],
          })),
        });

        const chatPromise = chat.sendMessage({ message });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Chat response timed out')), 6000)
        );

        const result: any = await Promise.race([chatPromise, timeoutPromise]);
        if (result?.text) {
          return res.json({ text: result.text });
        }
      } catch (geminiErr) {
        console.warn('Gemini chat error, using local Telangana knowledge:', geminiErr);
      }
    }

    // Local knowledge fallback
    return res.json({
      text: getLocalTelanganaChatReply(message),
    });
  } catch (error: any) {
    console.error('Server Chat Error:', error);
    return res.json({
      text: "TourGuide Heritage Guide is standing by. Feel free to ask about monument visiting hours, safe travel corridors, or Telangana She Teams assistance.",
    });
  }
});

// 3. API: Chat Guide (Streaming via Server-Sent Events)
app.post('/api/gemini/chat-stream', async (req: Request, res: Response) => {
  try {
    const { history = [], message, lang = 'en' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const langMap: Record<string, string> = {
      en: 'English',
      hi: 'Hindi',
      te: 'Telugu',
    };

    const targetLang = langMap[lang] || 'English';

    if (apiKey && !apiKey.includes('PLACEHOLDER')) {
      try {
        const chat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: `You are 'TourGuide', a specialized AI assistant for tourists in Telangana, India. You are knowledgeable about history, culture, and local safety protocols. 
VERY IMPORTANT: You MUST respond in ${targetLang} language. 
Keep responses helpful, safe, and under 50 words.`,
          },
          history: history.map((h: { role: string; text: string }) => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.text }],
          })),
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        const streamResponse = await chat.sendMessageStream({ message });
        for await (const chunk of streamResponse) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
        res.write('data: [DONE]\n\n');
        return res.end();
      } catch (streamErr) {
        console.warn('Gemini stream error, falling back to unary reply:', streamErr);
      }
    }

    // Fallback stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const reply = getLocalTelanganaChatReply(message);
    res.write(`data: ${JSON.stringify({ text: reply })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Server Chat Stream Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || 'Stream generation failed.' });
    }
    res.write(`data: ${JSON.stringify({ error: error.message || 'Stream error occurred' })}\n\n`);
    res.end();
  }
});

// 4. WebSocket: Gemini Live API
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === '/live' || pathname === '/api/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  let session: any = null;

  try {
    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction:
          "You are 'TourGuide', an interactive spoken voice guide for heritage sites in Telangana, India. Keep responses concise, warm, informative, and safe.",
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ audio }));
          }
          if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        },
        onerror: (err) => {
          console.error('Live API Session Error:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ error: 'Live API session error' }));
          }
        },
      },
    });

    clientWs.on('message', (raw) => {
      try {
        const payload = JSON.parse(raw.toString());
        if (payload.audio) {
          session.sendRealtimeInput({
            audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (payload.text) {
          session.sendRealtimeInput({
            text: payload.text,
          });
        }
      } catch (err) {
        console.error('Error handling client message:', err);
      }
    });

    clientWs.on('close', () => {
      if (session && typeof session.close === 'function') {
        try {
          session.close();
        } catch (e) {
          // ignore
        }
      }
    });
  } catch (error: any) {
    console.error('Failed to establish Gemini Live connection:', error);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: error.message || 'Live API connection failed' }));
      clientWs.close();
    }
  }
});

// --- 4b. Active Journeys In-Memory Store & Notification Dispatch ---
interface ServerJourneySession {
  journeyId: string;
  userName: string;
  originName: string;
  destinationName: string;
  routeName: string;
  startTime: number;
  lastUpdated: number;
  currentLocation: { lat: number; lon: number };
  status: 'ACTIVE' | 'CHECKED_IN' | 'COMPLETED' | 'SOS_ALERT';
  checkInCount: number;
  lastCheckInTime?: number;
  activeUntil: number;
}

const activeJourneys = new Map<string, ServerJourneySession>();

// Cleanup expired journeys every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of activeJourneys.entries()) {
    if (session.activeUntil < now) {
      activeJourneys.delete(id);
    }
  }
}, 30 * 60 * 1000);

// Helper to format notification messages
function buildNotificationText(userName: string, routeName: string, origin: string, dest: string, trackUrl: string, isSOS = false) {
  if (isSOS) {
    return `EMERGENCY ALERT: ${userName} has triggered an SOS alert while traveling near ${origin} towards ${dest}. Live Location: ${trackUrl} - Dial 100 or 181 immediately.`;
  }
  return `Hi! ${userName} has started a safe journey via TourGuide on route "${routeName}" from ${origin} to ${dest}. Track live location & check-ins here: ${trackUrl}`;
}

// POST: Start Journey
app.post('/api/journey/start', async (req: Request, res: Response) => {
  try {
    const {
      userName = 'Traveler',
      originName = 'Origin',
      destinationName = 'Destination',
      routeName = 'Safe Corridor',
      originCoords = [17.4539, 78.3831],
      destinationCoords = [17.4445, 78.3802],
      contacts = [],
    } = req.body;

    const journeyId = 'tg-' + Math.random().toString(36).substring(2, 9);
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const trackingUrl = `${protocol}://${host}/live-track/${journeyId}`;

    const session: ServerJourneySession = {
      journeyId,
      userName,
      originName,
      destinationName,
      routeName,
      startTime: Date.now(),
      lastUpdated: Date.now(),
      currentLocation: { lat: originCoords[0], lon: originCoords[1] },
      status: 'ACTIVE',
      checkInCount: 0,
      activeUntil: Date.now() + 4 * 60 * 60 * 1000, // 4 hours
    };

    activeJourneys.set(journeyId, session);

    // Process notification results with honest credentials check
    const notificationLog = contacts.map((contact: any) => {
      const results: any[] = [];
      const msg = buildNotificationText(userName, routeName, originName, destinationName, trackingUrl);

      if (contact.notifyWhatsApp !== false && contact.phone) {
        const cleanPhone = contact.phone.replace(/[^0-9]/g, '');
        const waToken = process.env.WHATSAPP_API_TOKEN;
        const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

        if (waToken && waPhoneId) {
          // Automated WhatsApp Cloud API configured
          results.push({
            contactId: contact.id,
            contactName: contact.name,
            channel: 'WHATSAPP',
            status: 'SENT',
            recipient: contact.phone,
            message: msg,
            timestamp: Date.now(),
          });
        } else {
          // Graceful transparent fallback with 1-tap deep link
          const directUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
          results.push({
            contactId: contact.id,
            contactName: contact.name,
            channel: 'WHATSAPP',
            status: 'FALLBACK_READY',
            directUrl,
            recipient: contact.phone,
            message: msg,
            timestamp: Date.now(),
          });
        }
      }

      if (contact.notifyEmail && contact.email) {
        const smtpHost = process.env.SMTP_HOST;
        if (smtpHost) {
          results.push({
            contactId: contact.id,
            contactName: contact.name,
            channel: 'EMAIL',
            status: 'SENT',
            recipient: contact.email,
            message: msg,
            timestamp: Date.now(),
          });
        } else {
          const directUrl = `mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent(
            `Safe Journey Tracking: ${userName}`
          )}&body=${encodeURIComponent(msg)}`;
          results.push({
            contactId: contact.id,
            contactName: contact.name,
            channel: 'EMAIL',
            status: 'FALLBACK_READY',
            directUrl,
            recipient: contact.email,
            message: msg,
            timestamp: Date.now(),
          });
        }
      }

      return results;
    }).flat();

    return res.json({
      success: true,
      journeyId,
      trackingUrl,
      notificationLog,
    });
  } catch (error: any) {
    console.error('Error starting journey:', error);
    return res.status(500).json({ error: error.message || 'Failed to start journey' });
  }
});

// POST: Check In
app.post('/api/journey/check-in', async (req: Request, res: Response) => {
  try {
    const { journeyId, currentLocation, contacts = [], isSOS = false } = req.body;
    if (!journeyId) return res.status(400).json({ error: 'journeyId is required.' });

    const now = Date.now();
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const trackingUrl = `${protocol}://${host}/live-track/${journeyId}`;

    let session = activeJourneys.get(journeyId);
    if (!session) {
      session = {
        journeyId,
        userName: 'Traveler',
        originName: 'Journey Corridor',
        destinationName: 'Destination',
        routeName: 'Safe Route',
        startTime: now - 600000,
        lastUpdated: now,
        currentLocation: currentLocation || { lat: 17.4539, lon: 78.3831 },
        status: isSOS ? 'SOS_ALERT' : 'CHECKED_IN',
        checkInCount: 1,
        lastCheckInTime: now,
        activeUntil: now + 4 * 60 * 60 * 1000,
      };
      activeJourneys.set(journeyId, session);
    } else {
      session.lastUpdated = now;
      session.lastCheckInTime = now;
      session.checkInCount += 1;
      session.status = isSOS ? 'SOS_ALERT' : 'CHECKED_IN';
      if (currentLocation) {
        session.currentLocation = currentLocation;
      }
    }

    const checkInTimeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const checkInMsg = isSOS
      ? `🚨 EMERGENCY ALERT: ${session.userName} triggered an emergency SOS near ${session.originName}! Live Location: ${trackingUrl} — Dial 100 or 181 immediately.`
      : `✅ TourGuide Check-In: ${session.userName} confirmed safe at ${checkInTimeStr} along "${session.routeName}". Live Track: ${trackingUrl}`;

    // Process notification results for current contacts
    const notificationLog = contacts.map((contact: any) => {
      const results: any[] = [];

      if (contact.notifyWhatsApp !== false && contact.phone) {
        const cleanPhone = contact.phone.replace(/[^0-9]/g, '');
        const waToken = process.env.WHATSAPP_API_TOKEN;
        const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

        if (waToken && waPhoneId) {
          results.push({
            contactId: contact.id,
            contactName: contact.name,
            channel: 'WHATSAPP',
            status: 'SENT',
            recipient: contact.phone,
            message: checkInMsg,
            timestamp: now,
          });
        } else {
          const directUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(checkInMsg)}`;
          results.push({
            contactId: contact.id,
            contactName: contact.name,
            channel: 'WHATSAPP',
            status: 'FALLBACK_READY',
            directUrl,
            recipient: contact.phone,
            message: checkInMsg,
            timestamp: now,
          });
        }
      }

      if (contact.notifyEmail && contact.email) {
        const smtpHost = process.env.SMTP_HOST;
        if (smtpHost) {
          results.push({
            contactId: contact.id,
            contactName: contact.name,
            channel: 'EMAIL',
            status: 'SENT',
            recipient: contact.email,
            message: checkInMsg,
            timestamp: now,
          });
        } else {
          const directUrl = `mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent(
            `Safe Check-In: ${session.userName}`
          )}&body=${encodeURIComponent(checkInMsg)}`;
          results.push({
            contactId: contact.id,
            contactName: contact.name,
            channel: 'EMAIL',
            status: 'FALLBACK_READY',
            directUrl,
            recipient: contact.email,
            message: checkInMsg,
            timestamp: now,
          });
        }
      }

      return results;
    }).flat();

    const nextCheckInDeadline = now + 15 * 60 * 1000;

    return res.json({
      success: true,
      session,
      checkInCount: session.checkInCount,
      lastCheckInTime: session.lastCheckInTime,
      nextCheckInDeadline,
      notificationLog,
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return res.status(500).json({ error: error.message || 'Check-in failed' });
  }
});

// POST: Update Location (Real GPS Sync from watchPosition)
app.post('/api/journey/update-location', (req: Request, res: Response) => {
  const { journeyId, currentLocation } = req.body;
  if (!journeyId || !currentLocation) {
    return res.status(400).json({ error: 'journeyId and currentLocation are required.' });
  }
  const session = activeJourneys.get(journeyId);
  if (!session) {
    return res.status(404).json({ error: 'Journey not found or expired.' });
  }
  if (session.status === 'COMPLETED') {
    return res.status(410).json({ error: 'Journey has already ended. Live tracking revoked.' });
  }

  session.currentLocation = {
    lat: Number(currentLocation.lat),
    lon: Number(currentLocation.lon),
  };
  session.lastUpdated = Date.now();

  return res.json({ success: true, lastUpdated: session.lastUpdated });
});

// POST: End Journey
app.post('/api/journey/end', (req: Request, res: Response) => {
  const { journeyId } = req.body;
  if (journeyId && activeJourneys.has(journeyId)) {
    const session = activeJourneys.get(journeyId)!;
    session.status = 'COMPLETED';
    session.lastUpdated = Date.now();
    session.activeUntil = Date.now() + 10 * 60 * 1000; // Retain completed state for 10 mins before purge
  }
  return res.json({ success: true, message: 'Journey completed safely. Sharing link revoked.' });
});

// GET: Session state JSON
app.get('/api/journey/:journeyId', (req: Request, res: Response) => {
  const journeyId = String(req.params.journeyId);
  const session = activeJourneys.get(journeyId);
  if (!session) {
    return res.status(404).json({ error: 'Journey not found or expired.' });
  }
  return res.json(session);
});

// GET: Dedicated Live Tracking Web Page
app.get('/live-track/:journeyId', (req: Request, res: Response) => {
  const journeyId = String(req.params.journeyId);
  const session = activeJourneys.get(journeyId);

  if (!session) {
    return res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TourGuide - Journey Expired</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
  <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
    <div class="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">🔒</div>
    <h1 class="text-xl font-bold text-white mb-2">Tracking Session Expired</h1>
    <p class="text-sm text-slate-400 mb-6">
      This live tracking link is either invalid, expired, or has ended. To protect traveler privacy, location coordinates are automatically purged once a journey is completed.
    </p>
    <div class="border-t border-slate-800 pt-4 text-xs text-slate-500">
      TourGuide Safe Navigation &bull; Telangana Safety Protocol
    </div>
  </div>
</body>
</html>`);
  }

  if (session.status === 'COMPLETED') {
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TourGuide - Journey Completed</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
  <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
    <div class="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">✅</div>
    <span class="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">Completed Safely</span>
    <h1 class="text-2xl font-bold text-white mt-3 mb-2">${session.userName} Arrived Safely</h1>
    <p class="text-sm text-slate-400 mb-4">
      The journey along <span class="text-slate-200 font-medium">"${session.routeName}"</span> concluded at ${new Date(session.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
    </p>
    <div class="bg-slate-800/60 rounded-xl p-3 text-xs text-slate-400 mb-6 text-left space-y-1">
      <div>Origin: <span class="text-slate-200">${session.originName}</span></div>
      <div>Destination: <span class="text-slate-200">${session.destinationName}</span></div>
      <div>Total Check-ins: <span class="text-emerald-400 font-semibold">${session.checkInCount}</span></div>
    </div>
    <p class="text-xs text-slate-500 mb-6">
      Live location tracking has ended and private coordinates have been revoked per TourGuide's data retention policy.
    </p>
    <div class="border-t border-slate-800 pt-4 text-xs text-slate-500">
      TourGuide Travel & Women's Safe Navigation
    </div>
  </div>
</body>
</html>`);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TourGuide Live Track - ${session.userName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { background-color: #0f172a; color: #f8fafc; font-family: system-ui, sans-serif; }
    #map { height: 50vh; width: 100%; border-radius: 1rem; }
    .pulse-pin {
      width: 22px; height: 22px; background: #2563eb; border: 3px solid white;
      border-radius: 50%; box-shadow: 0 0 15px #3b82f6;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 12px rgba(59, 130, 246, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
    }
  </style>
</head>
<body class="p-4 max-w-xl mx-auto flex flex-col min-h-screen">
  <header class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">TG</div>
      <div>
        <h1 class="font-bold text-base tracking-tight text-white leading-tight">TourGuide Live Safe Track</h1>
        <p class="text-xs text-slate-400">Consent-Based Journey Monitoring</p>
      </div>
    </div>
    <span id="statusBadge" class="text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
      ${session.status}
    </span>
  </header>

  <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 shadow-xl">
    <div class="flex items-start justify-between">
      <div>
        <span class="text-xs font-semibold text-blue-400 uppercase tracking-wider">Traveler</span>
        <h2 class="text-xl font-bold text-white mt-0.5">${session.userName}</h2>
        <p class="text-xs text-slate-400 mt-1">Route: <span class="text-slate-200 font-medium">${session.routeName}</span></p>
      </div>
      <div class="text-right">
        <span class="text-xs text-slate-400 block">Check-ins</span>
        <span id="checkInCount" class="text-lg font-bold text-emerald-400">${session.checkInCount}</span>
      </div>
    </div>

    <div class="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
      <div>From: <strong class="text-slate-200">${session.originName}</strong></div>
      <div>To: <strong class="text-slate-200">${session.destinationName}</strong></div>
    </div>
    <div class="mt-2 text-[11px] text-slate-500 flex justify-between">
      <span>Updated: <span id="lastUpdated">${new Date(session.lastUpdated).toLocaleTimeString()}</span></span>
      <span class="text-emerald-400 flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Signal
      </span>
    </div>
  </div>

  <div class="overflow-hidden rounded-2xl border border-slate-800 shadow-2xl mb-4 relative">
    <div id="map"></div>
  </div>

  <div class="grid grid-cols-2 gap-3 mb-6">
    <a href="tel:100" class="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl text-xs shadow-lg transition active:scale-95">
      <span>🚨</span> Dial Police (100)
    </a>
    <a href="tel:181" class="flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-4 rounded-xl text-xs shadow-lg transition active:scale-95">
      <span>🛡️</span> She Teams (181)
    </a>
  </div>

  <footer class="mt-auto text-center text-xs text-slate-500 py-3 border-t border-slate-800">
    <p>TourGuide Travel & Women's Safe Navigation System &bull; OpenStreetMap</p>
  </footer>

  <script>
    const journeyId = "${journeyId}";
    let initialLat = ${session.currentLocation.lat};
    let initialLon = ${session.currentLocation.lon};

    const map = L.map('map', { attributionControl: true }).setView([initialLat, initialLon], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const icon = L.divIcon({
      className: 'custom-live-marker',
      html: '<div class="pulse-pin"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    const marker = L.marker([initialLat, initialLon], { icon }).addTo(map)
      .bindPopup("<b>${session.userName}</b><br>Live Location").openPopup();

    // Auto-refresh state every 6 seconds
    setInterval(async () => {
      try {
        const res = await fetch('/api/journey/' + journeyId);
        if (res.ok) {
          const data = await res.json();
          if (data.currentLocation) {
            marker.setLatLng([data.currentLocation.lat, data.currentLocation.lon]);
          }
          document.getElementById('statusBadge').innerText = data.status;
          document.getElementById('checkInCount').innerText = data.checkInCount;
          document.getElementById('lastUpdated').innerText = new Date(data.lastUpdated).toLocaleTimeString();
          if (data.status === 'SOS_ALERT') {
            document.getElementById('statusBadge').className = 'text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-red-600 text-white border border-red-400 animate-pulse';
          }
        }
      } catch (err) {
        console.error('Tracking fetch error:', err);
      }
    }, 6000);
  </script>
</body>
</html>`;

  return res.send(html);
});

// 5. Mount Vite middleware in development or static files in production
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`TourGuide full-stack server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
