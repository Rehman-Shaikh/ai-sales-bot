# SalesPilot AI Voice Sales Agent (MERN)

A voice bot that behaves like a SaaS sales executive: it discovers needs, handles objections, recommends a plan, remembers returning customers, records the whole call (customer + AI), writes an AI summary and assigns a sales status.

**Stack (free tier):** React + Tailwind + Framer Motion, Node + Express, MongoDB Atlas, Groq + Gemini (free API keys, automatic fallback), Web Speech API (speech-to-text), Microsoft Edge neural female voices via `msedge-tts` (text-to-speech, no key).

## Quick start (about 10 minutes)

1. **MongoDB Atlas** (free): create a cluster, a database user, and under Network Access allow `0.0.0.0/0`. Copy the connection string and put `salesbot` after `.mongodb.net/`.
2. **AI keys** (at least one, both is best):
   - Groq: https://console.groq.com/keys
   - Gemini: https://aistudio.google.com/apikey
3. **Backend**
   ```bash
   cd server
   cp .env.example .env      # then open .env and fill MONGODB_URI + your key(s)
   npm install
   npm run dev
   ```
   You should see `MongoDB connected` and `API on port 5000`.
4. **Check the AI works:** open http://localhost:5000/api/chat/diagnose. At least one of `groq` / `gemini` must say `OK`.
5. **Check the voice works:** open http://localhost:5000/api/tts/test?language=hi. You should hear a female voice.
6. **Frontend** (new terminal)
   ```bash
   cd client
   npm install
   npm run dev               # http://localhost:5173
   ```
7. Open it in **Chrome or Edge**, use **headphones**, allow the microphone, enter name + phone/email, tick consent, press **Start call**.

## How it works
```
Mic -> Web Speech API (continuous) -> wait for silence (0.8-1.4s) -> POST /api/chat
   -> Groq (fallback Gemini) with sales prompt + customer memory -> reply text
   -> POST /api/tts -> mp3 -> <audio> routed into the recorder
Barge-in : user speaks while AI talks => audio stops at once, pending request is cancelled, speech is merged.
Echo guard: the mic ignores words that match what the AI just said.
Recording: mic + AI audio mixed in ONE AudioContext destination -> MediaRecorder -> /api/calls/:id/recording
End call : transcript -> AI JSON summary -> rule-checked status -> customer memory updated in MongoDB
```

## Troubleshooting
| Problem | Fix |
|---|---|
| `MONGODB_URI is missing` | `.env` must be inside `server/` and named exactly `.env` (not `.env.txt`). |
| `Could not connect to MongoDB` | Check Atlas user/password and Network Access (`0.0.0.0/0`). Avoid `@` or `#` in the password. |
| "assistant is a little busy" | Open `/api/chat/diagnose`. Read the error for each provider (401 = wrong key, 429 = quota used up, wait or use the other provider). |
| Voice is male or robotic | The server voice failed and the browser voice is being used. Open `/api/tts/test?language=en` and read the error. |
| AI keeps listening / hears itself | Use headphones. |
| Blank page | Press F12, open Console, read the red error. |
| Model "not found" | Google and Groq retire models often. The built-in list is in `server/services/gemini.js` (`GROQ_MODELS`, `GEMINI_MODELS`). You can also add names in `.env` as `GROQ_MODEL` / `GEMINI_MODEL`. |

## Environment variables (`server/.env`)
| Variable | Meaning |
|---|---|
| MONGODB_URI | Atlas connection string (required) |
| GROQ_API_KEY / GEMINI_API_KEY | At least one required. Groq is tried first, Gemini is the backup. |
| CLIENT_URL | Allowed frontend origin(s), comma separated |
| PORT | Default 5000 |
| GROQ_MODEL / GEMINI_MODEL | Optional extra model names (built-in working ones are always tried first) |

Frontend: `client/.env` has `VITE_API_URL` (leave empty locally; set to your API URL when deployed).

## API
| Method | Route | Purpose |
|---|---|---|
| POST | /api/calls/start | Create call, load memory, return greeting (needs consent) |
| POST | /api/chat | One conversation turn `{callId,text,language}` |
| GET | /api/chat/diagnose | Which AI provider works |
| POST | /api/tts, GET /api/tts/test | Text to mp3 |
| POST | /api/calls/:id/recording | Upload mixed recording (multipart `audio`) |
| POST | /api/calls/:id/end | Summary, sales status, memory update |
| GET | /api/calls, /api/calls/:id | Call history / one call |
| GET | /api/calls/analytics/summary | Totals, conversion rate, status counts |
| GET | /api/customers/lookup?identifier= | Customer memory |

## MongoDB collections
- **customers**: identifier (unique), name, profile, requirements[], budget, objections[], lastRecommendedPlan, followUpStatus, lastStatus, lastSummary, nextAction, preferredLanguage, callCount
- **calls**: customer (ref), language, consent, startedAt/endedAt, duration, transcript[], recordingUrl, status, summary{bullets, profile, requirements, budgetSignals, objections, opportunities, recommendedPlan, nextAction, followUpNotes}

## Where to change things
| Want to change | File |
|---|---|
| Sales flow, tone, answer length | server/services/prompts.js |
| Plans and pricing | server/services/product.js |
| Summary format and status rules | server/services/summary.js |
| Silence wait, barge-in, echo guard | client/src/hooks/useVoiceCall.js |
| TTS voices | server/routes/tts.js |

## Deployment
- **Backend:** Render/Railway free web service, root `server`, start `npm start`, add the env vars. Free disks are ephemeral, so recordings can disappear on restart. For permanent storage switch multer to Cloudinary (free) or MongoDB GridFS.
- **Frontend:** Vercel/Netlify, root `client`, build `npm run build`, env `VITE_API_URL=https://your-api`. Set backend `CLIENT_URL` to the frontend URL. The microphone needs HTTPS (both hosts give it).

## Known limits and roadmap
- Web Speech API works in Chrome/Edge only. Upgrade path: Deepgram free tier streaming.
- Browser fallback voice is not captured in the recording (only the server voice is).
- Hinglish is spoken by a Hindi voice, so some English words may sound slightly off.
- Roadmap: streaming replies for lower latency, follow-up call scheduler, CRM export, admin login.
