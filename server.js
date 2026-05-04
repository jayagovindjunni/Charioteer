import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = express();
const port = Number(process.env.PORT) || 8787;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: '1mb' }));

const levelOrder = ['beginner', 'intermediate', 'advanced'];
const topicModules = [
  'Foundations and vocabulary',
  'Core concepts',
  'Guided examples',
  'Hands-on practice',
  'Common mistakes',
  'Real-world use cases',
  'Mini project',
  'Revision and testing'
];
const languageToYouTubeCode = {
  english: 'en',
  hindi: 'hi',
  tamil: 'ta',
  telugu: 'te',
  malayalam: 'ml',
  kannada: 'kn'
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeIntake(intake = {}) {
  const durationValue = clamp(Number(intake.durationValue) || 30, 1, 180);
  const durationUnit = intake.durationUnit === 'months' ? 'months' : 'days';
  const totalDays = clamp(durationUnit === 'months' ? durationValue * 30 : durationValue, 1, 180);

  return {
    topic: String(intake.topic || '').trim().slice(0, 120),
    currentLevel: levelOrder.includes(intake.currentLevel) ? intake.currentLevel : 'beginner',
    targetLevel: levelOrder.includes(intake.targetLevel) ? intake.targetLevel : 'intermediate',
    preferredLanguage: Object.keys(languageToYouTubeCode).includes(String(intake.preferredLanguage || '').toLowerCase())
      ? String(intake.preferredLanguage).toLowerCase()
      : 'english',
    purpose: String(intake.purpose || 'skill-up').slice(0, 40),
    durationValue,
    durationUnit,
    hoursPerDay: clamp(Number(intake.hoursPerDay) || 1, 0.5, 8),
    totalDays
  };
}

function getLevels(currentLevel, targetLevel) {
  const start = levelOrder.indexOf(currentLevel);
  const end = levelOrder.indexOf(targetLevel);
  return levelOrder.slice(Math.min(start, end), Math.max(start, end) + 1);
}

function localCurriculum(intake, journal = []) {
  const normalized = normalizeIntake(intake);
  const levels = getLevels(normalized.currentLevel, normalized.targetLevel);
  const latest = journal[0] || {};
  const needsReview = latest.followed === 'no' || Number(latest.energy) <= 2 || Boolean(latest.confused);
  const chunk = Math.ceil(normalized.totalDays / levels.length);

  return Array.from({ length: normalized.totalDays }, (_, index) => {
    const day = index + 1;
    const level = levels[Math.min(levels.length - 1, Math.floor((day - 1) / chunk))];
    const moduleName = topicModules[index % topicModules.length];
    const isTestDay = day % 7 === 0 || day === normalized.totalDays;
    const title = needsReview && day <= 2 ? `Review and repair: ${moduleName}` : moduleName;

    return {
      id: `day-${day}`,
      day,
      level,
      title,
      outcome: isTestDay
        ? `Take a ${level} checkpoint for ${normalized.topic} and revise weak areas.`
        : `Learn ${moduleName.toLowerCase()} for ${normalized.topic} at ${level} level.`,
      videoQuery: `${normalized.topic} ${level} ${moduleName} tutorial ${normalized.preferredLanguage}`,
      videoReason:
        level === 'beginner'
          ? 'Choose videos that start from zero, define terms, and avoid hidden prerequisites.'
          : level === 'intermediate'
            ? 'Choose videos with worked examples, practice tasks, and clear sequencing.'
            : 'Choose videos with deeper tradeoffs, edge cases, projects, and expert reasoning.',
      tasks: [
        `Watch one organized YouTube lesson for ${Math.min(45, Math.round(normalized.hoursPerDay * 60))} minutes`,
        'Write short notes in your own words',
        isTestDay ? 'Complete checkpoint test' : 'Complete one practice task'
      ],
      isTestDay
    };
  });
}

function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI did not return JSON.');
    return JSON.parse(match[0]);
  }
}

function parseDuration(duration = '') {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const totalMinutes = hours * 60 + minutes + Math.round(seconds / 60);
  if (hours) return `${hours}h ${minutes}m`;
  return `${Math.max(1, totalMinutes)}m`;
}

function parseDurationSeconds(duration = '') {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function secondsToClock(totalSeconds = 0) {
  const value = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function getSegmentMinutesByLevel(day, intake) {
  const base = clamp(Math.round(Number(intake.hoursPerDay || 1) * 60), 20, 150);
  if (day.isTestDay) return clamp(Math.round(base * 0.55), 15, 60);
  if (day.level === 'beginner') return clamp(Math.round(base * 0.75), 20, 75);
  if (day.level === 'intermediate') return clamp(Math.round(base * 0.9), 25, 90);
  return clamp(base, 30, 120);
}

function scoreVideoForDay(day, video, preferredLanguage) {
  const title = `${video.title || ''} ${(video.description || '').slice(0, 180)}`.toLowerCase();
  const channel = String(video.channelTitle || '').toLowerCase();
  const durationSeconds = Number(video.durationSeconds || 0);
  const durationMinutes = durationSeconds / 60;
  let score = 0;

  if (!durationSeconds) score -= 20;
  if (durationMinutes >= 6 && durationMinutes <= 40) score += 16;
  else if (durationMinutes <= 70) score += 9;
  else if (durationMinutes > 130) score -= 14;

  if (title.includes(day.level)) score += 6;
  if (title.includes('crash course')) score -= 7;
  if (title.includes('full course') || title.includes('complete course')) score -= 12;
  if (title.includes('12 hour') || title.includes('10 hour') || title.includes('8 hour')) score -= 10;
  if (title.includes('live') || title.includes('stream')) score -= 9;
  if (title.includes('roadmap') || title.includes('what is') || title.includes('introduction')) score += 4;
  if (title.includes('project') && !day.isTestDay) score += 4;
  if (title.includes('interview questions')) score -= 4;
  if (channel.includes('official') || channel.includes('academy')) score += 3;
  if (preferredLanguage !== 'english' && title.includes(preferredLanguage)) score += 8;

  return score;
}

function buildVideoSegment(day, video, intake, segmentState, continuityKey = '') {
  if (!video?.videoId) return null;
  const stateKey = continuityKey || `${video.videoId}:${String(day.videoQuery || '').trim().toLowerCase()}`;
  const previousEnd = segmentState.get(stateKey) || 0;
  const segmentMinutes = getSegmentMinutesByLevel(day, intake);
  const durationSeconds = Math.max(60, Number(video.durationSeconds || 0));
  const segmentSeconds = Math.max(300, segmentMinutes * 60);
  const startSec = Math.min(previousEnd, Math.max(0, durationSeconds - 120));
  const endSec = Math.min(durationSeconds, startSec + segmentSeconds);
  const loops = endSec - startSec < 180;
  const finalStart = loops ? 0 : startSec;
  const finalEnd = loops ? Math.min(durationSeconds, segmentSeconds) : endSec;
  segmentState.set(stateKey, finalEnd);
  return {
    videoId: video.videoId,
    title: video.title,
    channelTitle: video.channelTitle,
    thumbnail: video.thumbnail,
    duration: video.duration,
    durationSeconds: video.durationSeconds,
    fit: video.fit || 'best',
    reason: video.reason || 'Best fit for today based on level and topic continuity.',
    segmentStartSec: finalStart,
    segmentEndSec: finalEnd,
    segmentStartLabel: secondsToClock(finalStart),
    segmentEndLabel: secondsToClock(finalEnd),
    segmentMinutes: Math.max(1, Math.round((finalEnd - finalStart) / 60)),
    url: `https://www.youtube.com/watch?v=${video.videoId}&t=${finalStart}s`,
    embedUrl: `https://www.youtube.com/embed/${video.videoId}?start=${finalStart}&end=${finalEnd}&rel=0&modestbranding=1`
  };
}

function cleanTopicFromTitle(title = '', fallback = 'the topic') {
  const normalized = String(title)
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^\)]*\)/g, '')
    .replace(/\b(full course|complete course|tutorial|beginners?|in \d+\s*hours?)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || fallback;
}

function makeDayPatchFromVideo(day, segment, strategy = 'new') {
  if (!segment) return null;
  const segmentLabel = `${segment.segmentStartLabel} to ${segment.segmentEndLabel}`;
  const continuationHint = strategy === 'continue' ? 'Continue this same video from the next segment.' : 'Start a fresh video for this day.';
  const practiceTask = day.isTestDay
    ? 'Take a short checkpoint and correct weak points from this lesson.'
    : 'Do one focused exercise based on this segment.';
  return {
    outcome: `${day.outcome} Video focus: ${segmentLabel}.`,
    videoReason: `Matches Day ${day.day} (${day.level}). ${continuationHint}`,
    tasks: [
      `Watch ${segmentLabel} (${segment.segmentMinutes} min) from "${segment.title}"`,
      `Write 5 concise notes linked to "${day.title}".`,
      practiceTask
    ]
  };
}

function fallbackProgressionSelection(days, candidatesByDay, preferredLanguage) {
  const used = new Set();
  const picks = [];
  for (const day of days) {
    const ranked = (candidatesByDay[day.id] || []).slice().sort((left, right) => {
      return scoreVideoForDay(day, right, preferredLanguage) - scoreVideoForDay(day, left, preferredLanguage);
    });
    const fresh = ranked.find((video) => !used.has(video.videoId));
    const chosen = fresh || ranked[0] || null;
    if (chosen?.videoId) used.add(chosen.videoId);
    picks.push({
      dayId: day.id,
      videoId: chosen?.videoId || '',
      strategy: fresh ? 'new' : 'continue',
      reason: fresh
        ? 'Unique video selected for progression.'
        : 'Reused with continuation because unique options were limited.'
    });
  }
  return picks;
}

async function askGeminiForVideoProgression({ days, candidatesByDay, preferredLanguage, topic }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'replace_with_your_gemini_key_here') {
    return fallbackProgressionSelection(days, candidatesByDay, preferredLanguage);
  }

  const compactDays = days.map((day) => ({
    id: day.id,
    day: day.day,
    level: day.level,
    title: day.title,
    isTestDay: Boolean(day.isTestDay),
    videoQuery: day.videoQuery
  }));
  const compactCandidates = Object.fromEntries(
    days.map((day) => [
      day.id,
      (candidatesByDay[day.id] || []).slice(0, 5).map((video) => ({
        videoId: video.videoId,
        title: video.title,
        channelTitle: video.channelTitle,
        duration: video.duration,
        durationSeconds: video.durationSeconds
      }))
    ])
  );

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const prompt = `Select one YouTube video per curriculum day with progression across this block.

Return only JSON:
{
  "selections": [
    {
      "dayId": "day-1",
      "videoId": "youtube video id",
      "strategy": "new|continue",
      "reason": "short reason"
    }
  ]
}

Block topic: ${topic}
Preferred language: ${preferredLanguage}
Days:
${JSON.stringify(compactDays, null, 2)}

Candidate videos by day:
${JSON.stringify(compactCandidates, null, 2)}

Hard rules:
- Choose exactly one video for each dayId.
- Maintain progression across the whole block (Day 1 -> Day N).
- Do not repeat the same videoId across adjacent days unless strategy is "continue".
- Prefer different videos for different concepts.
- Only use "continue" when the same video naturally extends to the next day.
- Respect each day level and test-day intent.
- Avoid very long full-course videos unless no better option exists.
- Keep reasons concrete and short.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) return fallbackProgressionSelection(days, candidatesByDay, preferredLanguage);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n');
  const parsed = extractJson(text || '{}');
  const selections = Array.isArray(parsed.selections) ? parsed.selections : [];
  if (!selections.length) return fallbackProgressionSelection(days, candidatesByDay, preferredLanguage);
  return selections;
}

function formatNumber(value) {
  const number = Number(value || 0);
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${Math.round(number / 1_000)}K`;
  return String(number);
}

function friendlyError(message) {
  if (message.includes('API_KEY_HTTP_REFERRER_BLOCKED')) {
    return 'YouTube API key is blocked by referrer restrictions. Allow http://127.0.0.1:8787/* in Google Cloud, or remove application restrictions for local testing.';
  }
  if (message.includes('API has not been used') || message.includes('SERVICE_DISABLED')) {
    return 'YouTube Data API v3 is not enabled for this Google Cloud project.';
  }
  if (message.includes('quotaExceeded')) {
    return 'YouTube API quota is exhausted for today.';
  }
  if (message.includes('RESOURCE_EXHAUSTED') || message.includes('Quota exceeded for metric')) {
    return 'Gemini quota exceeded for now. Wait for retry window or use a paid quota-enabled key.';
  }
  return message;
}

function makePrompt(intake, journal = []) {
  const normalized = normalizeIntake(intake);
  return `Create a day-by-day curriculum for a learning app.

Return only JSON with this shape:
{
  "curriculum": [
    {
      "id": "day-1",
      "day": 1,
      "level": "beginner|intermediate|advanced",
      "title": "short topic title",
      "outcome": "what learner should understand or do",
      "videoQuery": "YouTube search query",
      "videoReason": "why this video type fits the learner level",
      "tasks": ["task 1", "task 2", "task 3"],
      "isTestDay": false
    }
  ]
}

Rules:
- Topic: ${normalized.topic}
- Current level: ${normalized.currentLevel}
- Target level: ${normalized.targetLevel}
- Purpose: ${normalized.purpose}
- Preferred teaching language: ${normalized.preferredLanguage}
- Total days: ${normalized.totalDays}
- Study hours per day: ${normalized.hoursPerDay}
- Make it feel like a college curriculum, but practical.
- Every 7th day must be a test/revision day.
- YouTube queries must be specific enough to find level-appropriate videos.
- Include preferred language naturally in each videoQuery.
- Beginner days must not assume missing prerequisites.
- Use journal signals to slow down or repair gaps when needed.

Recent journal:
${JSON.stringify(journal.slice(0, 3), null, 2)}`;
}

async function callGemini(intake, journal = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'replace_with_your_gemini_key_here') {
    return {
      source: 'local-fallback',
      curriculum: localCurriculum(intake, journal)
    };
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: makePrompt(intake, journal) }]
        }
      ],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini request failed: ${message}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n');
  const parsed = extractJson(text || '');

  return {
    source: 'gemini',
    curriculum: Array.isArray(parsed.curriculum) ? parsed.curriculum : localCurriculum(intake, journal)
  };
}

async function askGeminiForVideoRanking({ day, videos }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'replace_with_your_gemini_key_here') {
    return videos.slice(0, 3).map((video, index) => ({
      ...video,
      fit: index === 0 ? 'best' : 'good',
      reason: 'Selected from YouTube search results. Add Gemini key for deeper ranking.'
    }));
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const prompt = `Rank YouTube videos for this learning-plan day.

Day:
${JSON.stringify(day, null, 2)}

Videos:
${JSON.stringify(videos, null, 2)}

Return only JSON:
{
  "videos": [
    {
      "videoId": "same id",
      "fit": "best|good|skip",
      "reason": "short reason for this learner level"
    }
  ]
}

Rules:
- Prefer videos matching the day level: ${day.level}.
- Prefer teaching language: ${day.preferredLanguage || 'english'} when possible.
- For beginner days, reject videos that assume missing prerequisites.
- Prefer clear tutorials with practical structure.
- Penalize very long "full course/complete course" videos unless they are the only relevant choice.
- Return the best 3 usable videos first.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.25,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) return videos.slice(0, 3);

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n');
  const parsed = extractJson(text || '{}');
  const rankings = Array.isArray(parsed.videos) ? parsed.videos : [];
  const rankById = new Map(rankings.map((rank) => [rank.videoId, rank]));

  return videos
    .map((video) => ({ ...video, ...(rankById.get(video.videoId) || {}) }))
    .filter((video) => video.fit !== 'skip')
    .slice(0, 3);
}

async function searchYouTubeVideos(query, preferredLanguage = 'english') {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey === 'replace_with_your_youtube_key_here') {
    throw new Error('Missing YouTube API key.');
  }

  const searchParams = new URLSearchParams({
    key: apiKey,
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: '8',
    safeSearch: 'moderate',
    relevanceLanguage: languageToYouTubeCode[preferredLanguage] || 'en',
    videoEmbeddable: 'true'
  });
  const youtubeHeaders = {
    Referer: `http://127.0.0.1:${port}/`
  };
  const searchResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`, {
    headers: youtubeHeaders
  });
  if (!searchResponse.ok) {
    const message = await searchResponse.text();
    throw new Error(`YouTube search failed: ${message}`);
  }

  const searchData = await searchResponse.json();
  const ids = (searchData.items || [])
    .map((item) => item.id?.videoId)
    .filter(Boolean);
  if (!ids.length) return [];

  const detailParams = new URLSearchParams({
    key: apiKey,
    part: 'snippet,contentDetails,statistics',
    id: ids.join(',')
  });
  const detailResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${detailParams}`, {
    headers: youtubeHeaders
  });
  if (!detailResponse.ok) {
    const message = await detailResponse.text();
    throw new Error(`YouTube details failed: ${message}`);
  }

  const detailData = await detailResponse.json();
  return (detailData.items || []).map((item) => ({
    videoId: item.id,
    title: item.snippet?.title || 'Untitled video',
    channelTitle: item.snippet?.channelTitle || 'Unknown channel',
    description: item.snippet?.description || '',
    thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
    url: `https://www.youtube.com/watch?v=${item.id}`,
    duration: parseDuration(item.contentDetails?.duration),
    durationSeconds: parseDurationSeconds(item.contentDetails?.duration),
    views: formatNumber(item.statistics?.viewCount),
    publishedAt: item.snippet?.publishedAt || ''
  }));
}

async function attachCuratedVideos(curriculum, intake) {
  const normalized = normalizeIntake(intake);
  const uniqueQueries = [...new Set(curriculum.map((day) => String(day.videoQuery || '').trim()).filter(Boolean))];
  const queryToRankedVideos = new Map();
  const segmentState = new Map();

  for (const query of uniqueQueries) {
    try {
      const candidates = await searchYouTubeVideos(query, normalized.preferredLanguage);
      queryToRankedVideos.set(query, candidates);
    } catch {
      queryToRankedVideos.set(query, []);
    }
  }

  const candidatesByDay = Object.fromEntries(
    curriculum.map((day) => {
      const query = String(day.videoQuery || '').trim();
      const raw = queryToRankedVideos.get(query) || [];
      const ranked = raw.slice().sort((left, right) => {
        return scoreVideoForDay(day, right, normalized.preferredLanguage) - scoreVideoForDay(day, left, normalized.preferredLanguage);
      });
      return [day.id, ranked.slice(0, 6)];
    })
  );

  const selectionByDay = new Map();
  const selections = await askGeminiForVideoProgression({
    days: curriculum,
    candidatesByDay,
    preferredLanguage: normalized.preferredLanguage,
    topic: normalized.topic
  }).catch(() => []);
  for (const selection of selections) {
    if (selection?.dayId) selectionByDay.set(selection.dayId, selection);
  }

  return curriculum.map((day) => {
    const ranked = candidatesByDay[day.id] || [];
    const selection = selectionByDay.get(day.id) || {};
    const chosen = ranked.find((video) => video.videoId === selection.videoId) || ranked[0] || null;
    const strategy = selection.strategy === 'continue' ? 'continue' : 'new';
    const continuityKey = strategy === 'continue' && chosen?.videoId ? `continue:${chosen.videoId}` : `day:${day.id}`;
    const segment = buildVideoSegment(day, chosen, normalized, segmentState, continuityKey);
    if (segment && selection.reason) segment.reason = selection.reason;

    const dayPatch = makeDayPatchFromVideo(day, segment, strategy);
    const tasks = Array.isArray(dayPatch?.tasks) ? dayPatch.tasks : Array.isArray(day.tasks) ? day.tasks : [];
    const timelineTask = segment
      ? `Watch video segment ${segment.segmentStartLabel} to ${segment.segmentEndLabel} (${segment.segmentMinutes} min)`
      : 'Watch one curated segment when available';
    return {
      ...day,
      ...(dayPatch || {}),
      videoPlan: segment,
      tasks: [timelineTask, ...tasks.filter((task) => !String(task || '').toLowerCase().includes('watch'))].slice(0, 4)
    };
  });
}

async function callOpenAI(intake, journal = []) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'replace_with_your_key_here' || apiKey === 'optional_openai_key_here') {
    return {
      source: 'local-fallback',
      curriculum: localCurriculum(intake, journal)
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: makePrompt(intake, journal),
      temperature: 0.4
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI request failed: ${message}`);
  }

  const data = await response.json();
  const text =
    data.output_text ||
    data.output
      ?.flatMap((item) => item.content || [])
      .map((part) => part.text || '')
      .join('\n');
  const parsed = extractJson(text || '');

  return {
    source: 'openai',
    curriculum: Array.isArray(parsed.curriculum) ? parsed.curriculum : localCurriculum(intake, journal)
  };
}

async function generateWithProvider(intake, journal = []) {
  return process.env.AI_PROVIDER === 'openai'
    ? callOpenAI(intake, journal)
    : callGemini(intake, journal);
}

async function attachVideosSafely(curriculum, intake) {
  try {
    return {
      curriculum: await attachCuratedVideos(curriculum, intake)
    };
  } catch (error) {
    return {
      curriculum,
      videoError: friendlyError(error.message)
    };
  }
}

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    provider: process.env.AI_PROVIDER || 'gemini',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'replace_with_your_gemini_key_here'),
    hasYouTubeKey: Boolean(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY !== 'replace_with_your_youtube_key_here'),
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.AI_PROVIDER === 'openai'
      ? process.env.OPENAI_MODEL || 'gpt-4.1-mini'
      : process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'
  });
});

app.post('/api/generate-plan', async (request, response) => {
  try {
    const result = await generateWithProvider(request.body.intake, []);
    const videoResult = await attachVideosSafely(result.curriculum || [], request.body.intake || {});
    response.json({ ...result, ...videoResult });
  } catch (error) {
    const draft = localCurriculum(request.body.intake, []);
    const videoResult = await attachVideosSafely(draft, request.body.intake || {});
    response.json({
      source: 'ai-error-fallback',
      error: friendlyError(error.message),
      ...videoResult
    });
  }
});

app.post('/api/recalculate-plan', async (request, response) => {
  try {
    const result = await generateWithProvider(request.body.intake, request.body.journal || []);
    const videoResult = await attachVideosSafely(result.curriculum || [], request.body.intake || {});
    response.json({ ...result, ...videoResult });
  } catch (error) {
    const draft = localCurriculum(request.body.intake, request.body.journal || []);
    const videoResult = await attachVideosSafely(draft, request.body.intake || {});
    response.json({
      source: 'ai-error-fallback',
      error: friendlyError(error.message),
      ...videoResult
    });
  }
});

app.post('/api/curate-videos', async (request, response) => {
  try {
    const day = request.body.day || {};
    const query = String(day.videoQuery || '').trim();
    if (!query) throw new Error('Missing video query.');

    const preferredLanguage = String(request.body.preferredLanguage || request.body.day?.preferredLanguage || 'english')
      .toLowerCase();
    const candidates = await searchYouTubeVideos(query, preferredLanguage);
    const videos = await askGeminiForVideoRanking({ day, videos: candidates });
    const normalizedIntake = normalizeIntake(request.body.intake || { preferredLanguage });
    const ranked = videos.slice().sort((left, right) => {
      return scoreVideoForDay(day, right, preferredLanguage) - scoreVideoForDay(day, left, preferredLanguage);
    });
    const segment = buildVideoSegment(day, ranked[0], normalizedIntake, new Map());
    const dayPatch = makeDayPatchFromVideo(day, segment);
    response.json({
      source: 'youtube-gemini',
      videos,
      videoPlan: segment,
      dayPatch
    });
  } catch (error) {
    response.json({
      source: 'video-error',
      error: friendlyError(error.message),
      videos: []
    });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.use((request, response, next) => {
  if (request.method !== 'GET' || request.path.startsWith('/api')) {
    next();
    return;
  }

  response.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Charioteer running on http://127.0.0.1:${port}`);
});
