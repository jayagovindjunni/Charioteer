import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  GraduationCap,
  ListChecks,
  Mic,
  PlaySquare,
  RefreshCw,
  Target,
  Trophy
} from 'lucide-react';
import './styles.css';
import { BrandNav } from './BrandNav.jsx';

const STORAGE_KEY = 'charioteer-curriculum-v2';

const intakeDefaults = {
  topic: '',
  currentLevel: 'beginner',
  preferredLanguage: 'english',
  purpose: 'skill-up',
  targetLevel: 'intermediate',
  durationValue: 30,
  durationUnit: 'days',
  hoursPerDay: 1
};

const levelOrder = ['beginner', 'intermediate', 'advanced'];

const purposeLabels = {
  college: 'College / exams',
  'skill-up': 'Skill up',
  job: 'Job / interview',
  project: 'Build a project',
  curiosity: 'Curiosity'
};

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTotalDays(intake) {
  const value = Number(intake.durationValue) || 1;
  return intake.durationUnit === 'months' ? value * 30 : value;
}

function getLevels(currentLevel, targetLevel) {
  const start = levelOrder.indexOf(currentLevel);
  const end = levelOrder.indexOf(targetLevel);
  return levelOrder.slice(Math.min(start, end), end + 1 || 1);
}

function getLevelForDay(day, totalDays, levels) {
  const chunk = Math.ceil(totalDays / levels.length);
  return levels[Math.min(levels.length - 1, Math.floor((day - 1) / chunk))];
}

function makeCurriculum(intake, journal = []) {
  const totalDays = getTotalDays(intake);
  const levels = getLevels(intake.currentLevel, intake.targetLevel);
  const lowEnergy = journal[0]?.energy && Number(journal[0].energy) <= 2;
  const missedYesterday = journal[0]?.followed === 'no';
  const adjustment = lowEnergy || missedYesterday ? 'slower' : journal.length >= 2 ? 'active' : 'new';

  return Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const level = getLevelForDay(day, totalDays, levels);
    const moduleName = topicModules[index % topicModules.length];
    const isTestDay = day % 7 === 0 || day === totalDays;
    const reviewDay = adjustment === 'slower' && day <= 3;
    const minutes = clamp(Math.round(Number(intake.hoursPerDay) * 60), 30, 360);

    return {
      id: `day-${day}`,
      day,
      level,
      title: reviewDay ? `Review: ${moduleName}` : moduleName,
      outcome: isTestDay
        ? `Take a short ${level} checkpoint and revise weak areas.`
        : `Learn ${moduleName.toLowerCase()} for ${intake.topic || 'your topic'} at ${level} level.`,
      videoQuery: `${intake.topic || 'topic'} ${level} ${moduleName} tutorial ${intake.preferredLanguage || 'english'}`,
      videoReason:
        level === 'beginner'
          ? 'Pick videos that explain from zero and avoid unexplained jargon.'
          : level === 'intermediate'
            ? 'Pick videos with worked examples and practical exercises.'
            : 'Pick videos that compare tradeoffs, edge cases, and expert reasoning.',
      tasks: [
        `Watch curated video segment (${Math.min(45, minutes)} min)`,
        `Write 5 bullet notes in your own words`,
        isTestDay ? 'Complete checkpoint test' : 'Do one small practice task'
      ],
      isTestDay
    };
  });
}

function App() {
  const [appState, setAppState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved
      ? JSON.parse(saved)
      : {
          intake: intakeDefaults,
          generated: false,
          curriculum: [],
          completed: [],
          journal: [],
          scores: []
        };
  });
  const [screen, setScreen] = useState(appState.generated ? 'curriculum' : 'intake');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingVideosFor, setLoadingVideosFor] = useState('');
  const [generationStatus, setGenerationStatus] = useState('');
  const [journalDraft, setJournalDraft] = useState({
    followed: 'yes',
    learned: '',
    skipped: '',
    confused: '',
    energy: 3
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  const fallbackCurriculum = useMemo(
    () => makeCurriculum(appState.intake, appState.journal),
    [appState.intake, appState.journal]
  );
  const curriculum = appState.curriculum?.length ? appState.curriculum : fallbackCurriculum;
  const totalDays = getTotalDays(appState.intake);
  const completedCount = appState.completed.length;
  const progress = clamp(Math.round((completedCount / totalDays) * 100), 0, 100);
  const nextTest = curriculum.find((day) => day.isTestDay && !appState.scores.some((score) => score.day === day.day));

  function updateIntake(field, value) {
    setAppState((current) => ({
      ...current,
      intake: { ...current.intake, [field]: value }
    }));
  }

  async function requestCurriculum(endpoint, journal = []) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake: appState.intake, journal })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed.' }));
      throw new Error(error.error || 'Request failed.');
    }

    return response.json();
  }

  async function generatePlan(event) {
    event.preventDefault();
    if (!appState.intake.topic.trim()) return;
    setIsGenerating(true);
    setGenerationStatus('Generating curriculum...');

    try {
      const result = await requestCurriculum('/api/generate-plan');
      setAppState((current) => ({
        ...current,
        generated: true,
        curriculum: result.curriculum || makeCurriculum(current.intake, []),
        completed: [],
        scores: []
      }));
      setGenerationStatus(
        result.source === 'gemini' || result.source === 'openai'
          ? 'Powered by AI with structured learning.'
          : result.source === 'ai-error-fallback'
            ? `AI unavailable: ${result.error || 'unknown issue'}. Local draft was created.`
            : 'Generated with local fallback. Add your Gemini API key to .env for AI planning.'
      );
      setScreen('curriculum');
    } catch (error) {
      setAppState((current) => ({
        ...current,
        generated: true,
        curriculum: makeCurriculum(current.intake, []),
        completed: [],
        scores: []
      }));
      setGenerationStatus(`Backend unavailable, generated local draft. ${error.message}`);
      setScreen('curriculum');
    } finally {
      setIsGenerating(false);
    }
  }

  function markDone(id) {
    setAppState((current) => {
      const exists = current.completed.includes(id);
      return {
        ...current,
        completed: exists ? current.completed.filter((item) => item !== id) : [...current.completed, id]
      };
    });
  }

  async function curateVideos(day) {
    setLoadingVideosFor(day.id);
    setGenerationStatus(`Refreshing video fit for Day ${day.day}...`);

    try {
      const response = await fetch('/api/curate-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, preferredLanguage: appState.intake.preferredLanguage })
      });
      const result = await response.json();
      if (!result.videoPlan?.videoId) {
        setGenerationStatus(`Could not refresh video for Day ${day.day}.`);
        return;
      }
      const updatedDay = {
        ...day,
        ...(result.dayPatch || {}),
        videoPlan: result.videoPlan
      };
      setAppState((current) => ({
        ...current,
        curriculum: (current.curriculum || []).map((item) => (item.id === day.id ? updatedDay : item))
      }));
      setGenerationStatus(`Video and day plan synced for Day ${day.day}.`);
    } catch (error) {
      setGenerationStatus(`Could not fetch videos for Day ${day.day}: ${error.message}`);
    } finally {
      setLoadingVideosFor('');
    }
  }

  async function saveJournal() {
    if (!journalDraft.learned.trim() && !journalDraft.confused.trim() && !journalDraft.skipped.trim()) return;
    const newJournal = [
      {
        ...journalDraft,
        date: new Date().toLocaleDateString(),
        planVersion: appState.journal.length + 2
      },
      ...appState.journal
    ];

    setIsGenerating(true);
    setGenerationStatus('Recalculating from journal...');

    try {
      const result = await requestCurriculum('/api/recalculate-plan', newJournal);
      setAppState((current) => ({
        ...current,
        journal: newJournal,
        curriculum: result.curriculum || makeCurriculum(current.intake, newJournal)
      }));
      setGenerationStatus(
        result.source === 'gemini' || result.source === 'openai'
          ? 'Powered by AI with structured learning.'
          : result.source === 'ai-error-fallback'
            ? `AI unavailable: ${result.error || 'unknown issue'}. Local planner updated it.`
            : 'Plan recalculated with local fallback. Add your Gemini API key to .env for AI recalculation.'
      );
    } catch (error) {
      setAppState((current) => ({
        ...current,
        journal: newJournal,
        curriculum: makeCurriculum(current.intake, newJournal)
      }));
      setGenerationStatus(`Backend unavailable, recalculated local draft. ${error.message}`);
    }

    setJournalDraft({ followed: 'yes', learned: '', skipped: '', confused: '', energy: 3 });
    setScreen('curriculum');
    setIsGenerating(false);
  }

  function resetPlan() {
    setAppState((current) => ({
      ...current,
      generated: false,
      curriculum: [],
      completed: [],
      scores: []
    }));
    setScreen('intake');
  }

  function runCheckpoint() {
    const day = nextTest?.day ?? totalDays;
    const score = clamp(55 + completedCount * 4 + appState.journal.length * 3, 45, 98);
    setAppState((current) => ({
      ...current,
      scores: [{ day, score, date: new Date().toLocaleDateString() }, ...current.scores]
    }));
  }

  if (screen === 'intake') {
    return (
      <main className="intake-page">
        <section className="intake-copy">
          <header className="intake-brand-bar" aria-label="Charioteer">
            <BrandNav variant="intake" />
          </header>
          <div className="intake-copy__body">
            <h1>Stop guessing what to learn next.</h1>
            <p className="intake-subhead">Turn any goal into a clear, structured learning path.</p>
            <p className="intake-tagline">
              Without structure, knowledge is noise. Clarity turns information into power.
            </p>
            <p className="intake-body">
              Get a personalized, day-by-day plan with lessons, practice, and checkpoints—designed for your level and
              your goal.
            </p>
          </div>
        </section>

        <form className="intake-form" onSubmit={generatePlan}>
          <label className="wide">
            What do you want to master?
            <input
              autoFocus
              placeholder="Example: Python for data analysis, machine learning, React, finance..."
              value={appState.intake.topic}
              onChange={(event) => updateIntake('topic', event.target.value)}
            />
          </label>

          <ChoiceGroup
            label="Your current level"
            value={appState.intake.currentLevel}
            options={[
              ['beginner', 'Beginner'],
              ['intermediate', 'Some basics'],
              ['advanced', 'Already strong']
            ]}
            onChange={(value) => updateIntake('currentLevel', value)}
          />

          <ChoiceGroup
            label="Preferred learning language"
            value={appState.intake.preferredLanguage}
            options={[
              ['english', 'English'],
              ['hindi', 'Hindi'],
              ['tamil', 'Tamil'],
              ['telugu', 'Telugu'],
              ['malayalam', 'Malayalam'],
              ['kannada', 'Kannada']
            ]}
            onChange={(value) => updateIntake('preferredLanguage', value)}
          />

          <ChoiceGroup
            label="Your goal"
            value={appState.intake.purpose}
            options={Object.entries(purposeLabels)}
            onChange={(value) => updateIntake('purpose', value)}
          />

          <ChoiceGroup
            label="Target level"
            value={appState.intake.targetLevel}
            options={[
              ['beginner', 'Basic understanding'],
              ['intermediate', 'Intermediate'],
              ['advanced', 'Advanced']
            ]}
            onChange={(value) => updateIntake('targetLevel', value)}
          />

          <div className="split-fields">
            <label>
              Duration
              <input
                type="number"
                min="1"
                value={appState.intake.durationValue}
                onChange={(event) => updateIntake('durationValue', Number(event.target.value))}
              />
            </label>
            <label>
              Timeframe
              <select
                value={appState.intake.durationUnit}
                onChange={(event) => updateIntake('durationUnit', event.target.value)}
              >
                <option value="days">Days</option>
                <option value="months">Months</option>
              </select>
            </label>
            <label>
              Daily study time (hours)
              <input
                type="number"
                min="0.5"
                max="8"
                step="0.5"
                value={appState.intake.hoursPerDay}
                onChange={(event) => updateIntake('hoursPerDay', Number(event.target.value))}
              />
            </label>
          </div>

          <button className="primary-action" type="submit" disabled={isGenerating}>
            <ListChecks size={19} />
            {isGenerating ? 'Generating...' : 'Create My Learning Path'}
          </button>
          {generationStatus && <p className="status-note">{generationStatus}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="curriculum-page">
      <header className="app-header">
        <div>
          <div className="app-header__brand">
            <BrandNav variant="compact" />
          </div>
          <h1>{appState.intake.topic}</h1>
          <p>
            {purposeLabels[appState.intake.purpose]} plan from {appState.intake.currentLevel} to{' '}
            {appState.intake.targetLevel}.
          </p>
        </div>
        <button className="ghost-action" onClick={resetPlan}>
          Edit intake
        </button>
      </header>
      {generationStatus && <p className="status-note page-status">{generationStatus}</p>}

      <section className="summary-row">
        <Metric icon={CalendarDays} label="Duration" value={`${totalDays} days`} />
        <Metric icon={Clock3} label="Daily study" value={`${appState.intake.hoursPerDay} hr`} />
        <Metric icon={Target} label="Progress" value={`${progress}%`} />
        <Metric icon={RefreshCw} label="Plan version" value={`v${appState.journal.length + 1}`} />
      </section>

      <nav className="tabs" aria-label="Curriculum views">
        {[
          ['curriculum', GraduationCap, 'Curriculum'],
          ['journal', Mic, 'Night check-in'],
          ['tests', ClipboardCheck, 'Tests']
        ].map(([id, Icon, label]) => (
          <button className={screen === id ? 'tab active' : 'tab'} key={id} onClick={() => setScreen(id)}>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      {screen === 'curriculum' && (
        <section className="curriculum-layout">
          <div className="timeline">
            {curriculum.map((item) => (
              <article className={item.isTestDay ? 'day-card test-day' : 'day-card'} key={item.id}>
                <div className="day-number">Day {item.day}</div>
                <div className="day-main">
                  <div className="day-title-row">
                    <span className={`level-pill ${item.level}`}>{item.level}</span>
                    <h2>{item.title}</h2>
                  </div>
                  <p>{item.outcome}</p>
                  <div className="video-box">
                    <PlaySquare size={19} />
                    <div>
                      <strong>Today&apos;s lesson segment</strong>
                      <span>
                        {item.videoPlan
                          ? `${item.videoPlan.segmentStartLabel} - ${item.videoPlan.segmentEndLabel} · ${item.videoPlan.segmentMinutes} min`
                          : 'No segment ready yet'}
                      </span>
                    </div>
                    <Clock3 size={18} />
                  </div>
                  <small>{item.videoReason}</small>
                  {item.videoPlan && (
                    <div className="selected-videos">
                      <div className="video-card video-card-inline">
                        {item.videoPlan.thumbnail && <img src={item.videoPlan.thumbnail} alt="" />}
                        <div>
                          <strong>{item.videoPlan.title}</strong>
                          <span>{item.videoPlan.channelTitle}</span>
                          <small>
                            {item.videoPlan.duration} · {item.videoPlan.fit || 'selected'} ·{' '}
                            {appState.intake.preferredLanguage}
                          </small>
                          {item.videoPlan.reason && <p>{item.videoPlan.reason}</p>}
                          <div className="video-actions-row">
                            <a href={item.videoPlan.url} target="_blank" rel="noreferrer">
                              Open on YouTube
                            </a>
                            <button
                              className="video-action"
                              onClick={() => curateVideos(item)}
                              disabled={loadingVideosFor === item.id}
                            >
                              {loadingVideosFor === item.id ? 'Refreshing...' : 'Refresh fit'}
                            </button>
                          </div>
                        </div>
                      </div>
                      <iframe
                        className="video-player"
                        src={item.videoPlan.embedUrl}
                        title={`Day ${item.day} video`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  )}
                  <ul>
                    {item.tasks.map((task) => (
                      <li key={task}>{task}</li>
                    ))}
                  </ul>
                </div>
                <button
                  className={appState.completed.includes(item.id) ? 'done-button done' : 'done-button'}
                  onClick={() => markDone(item.id)}
                  title="Mark day complete"
                >
                  <CheckCircle2 size={20} />
                </button>
              </article>
            ))}
          </div>

          <aside className="coach-panel">
            <h2>How the AI will work</h2>
            <div className="coach-step">
              <PlaySquare size={18} />
              <span>Build one connected day-by-day YouTube curriculum.</span>
            </div>
            <div className="coach-step">
              <BookOpen size={18} />
              <span>Pick videos using your level and preferred language.</span>
            </div>
            <div className="coach-step">
              <FileText size={18} />
              <span>Play only the planned timeline segment for each day.</span>
            </div>
            <div className="coach-step">
              <Trophy size={18} />
              <span>Update the next days from journal and test results.</span>
            </div>
          </aside>
        </section>
      )}

      {screen === 'journal' && (
        <section className="journal-layout">
          <div className="journal-card">
            <h2>Night check-in</h2>
            <p>Only write about the learning plan: what you followed, skipped, and did not understand.</p>
            <label>
              Did you follow today&apos;s plan?
              <select
                value={journalDraft.followed}
                onChange={(event) => setJournalDraft({ ...journalDraft, followed: event.target.value })}
              >
                <option value="yes">Yes</option>
                <option value="partial">Partially</option>
                <option value="no">No</option>
              </select>
            </label>
            <textarea
              placeholder="What did you learn today?"
              value={journalDraft.learned}
              onChange={(event) => setJournalDraft({ ...journalDraft, learned: event.target.value })}
            />
            <textarea
              placeholder="What did you skip?"
              value={journalDraft.skipped}
              onChange={(event) => setJournalDraft({ ...journalDraft, skipped: event.target.value })}
            />
            <textarea
              placeholder="What confused you?"
              value={journalDraft.confused}
              onChange={(event) => setJournalDraft({ ...journalDraft, confused: event.target.value })}
            />
            <label>
              Energy: {journalDraft.energy}/5
              <input
                type="range"
                min="1"
                max="5"
                value={journalDraft.energy}
                onChange={(event) => setJournalDraft({ ...journalDraft, energy: Number(event.target.value) })}
              />
            </label>
            <button className="primary-action" onClick={saveJournal} disabled={isGenerating}>
              <RefreshCw size={18} />
              {isGenerating ? 'Recalculating...' : 'Save and recalculate'}
            </button>
          </div>
          <div className="history-card">
            <h2>Recent updates</h2>
            {appState.journal.length === 0 && <p>No check-ins yet.</p>}
            {appState.journal.slice(0, 5).map((entry) => (
              <article key={`${entry.date}-${entry.planVersion}`}>
                <strong>{entry.date}</strong>
                <p>{entry.learned || entry.confused || entry.skipped}</p>
                <span>Plan version v{entry.planVersion}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {screen === 'tests' && (
        <section className="test-layout">
          <div className="test-card">
            <ClipboardCheck size={36} />
            <h2>{nextTest ? `Day ${nextTest.day} checkpoint` : 'Final checkpoint'}</h2>
            <p>
              After each milestone, the AI should test definitions, examples, mistakes, and practical use.
              The result feeds back into the next version of the plan.
            </p>
            <button className="primary-action" onClick={runCheckpoint}>
              Run sample test
            </button>
          </div>
          <div className="history-card">
            <h2>Scores</h2>
            {appState.scores.length === 0 && <p>No test scores yet.</p>}
            {appState.scores.map((score) => (
              <article key={`${score.day}-${score.date}`}>
                <strong>Day {score.day}</strong>
                <p>{score.score}% readiness</p>
                <span>{score.date}</span>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ChoiceGroup({ label, value, options, onChange }) {
  return (
    <fieldset className="choice-group">
      <legend>{label}</legend>
      <div>
        {options.map(([id, text]) => (
          <button
            className={value === id ? 'choice active' : 'choice'}
            key={id}
            type="button"
            onClick={() => onChange(id)}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="metric">
      <Icon size={19} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
