// --- AI Service (Gemini + Ollama + Smart Fallback) ---

/**
 * Call Google Gemini API (using native fetch)
 */
const callGeminiAPI = async (prompt, systemInstruction = '') => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  // Using gemini-1.5-flash for high speed, low latency, and low token footprint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidate) throw new Error('Empty response from Gemini API');
  return candidate;
};

/**
 * Call Local Ollama Instance (using native fetch)
 */
const callOllamaAPI = async (prompt, systemInstruction = '') => {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3';

  const fullPrompt = systemInstruction ? `[SYSTEM]: ${systemInstruction}\n\n[USER]: ${prompt}` : prompt;

  const response = await fetch(`${host}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: fullPrompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error (${response.status})`);
  }

  const data = await response.json();
  return data?.response;
};

/**
 * Smart Heuristic Fallback Generator
 * Ensures zero failure / zero crash even if offline or quota depleted
 */
const getHeuristicTasks = (title, description, count = 5) => {
  const desc = (description || title || 'project').toLowerCase();
  
  const library = [
    { title: 'Project Requirements & Scope Definition', description: 'Document core deliverables, acceptance criteria, and stakeholder requirements.', priority: 'high' },
    { title: 'System Architecture & Data Modeling', description: 'Design database schemas, entity relationships, and API contract specifications.', priority: 'urgent' },
    { title: 'UI/UX Wireframes & Component Design', description: 'Create responsive interface mockups, user journey flows, and design system tokens.', priority: 'medium' },
    { title: 'Core Backend API & Logic Implementation', description: 'Develop RESTful endpoints, data validation, and database operations.', priority: 'urgent' },
    { title: 'Frontend Interface & State Integration', description: 'Build interactive UI components, state stores, and connect API services.', priority: 'high' },
    { title: 'Authentication, Security & Access Control', description: 'Implement secure user authorization, token validation, and input sanitization.', priority: 'high' },
    { title: 'Unit & Integration Testing Suite', description: 'Write automated test cases for edge cases, API endpoints, and user flows.', priority: 'medium' },
    { title: 'Deployment, CI/CD & Environment Setup', description: 'Configure build pipeline, environment secrets, and cloud hosting deployment.', priority: 'low' },
    { title: 'User Documentation & Release Notes', description: 'Prepare README guides, API documentation, and changelog release notes.', priority: 'low' },
  ];

  // Specific keyword enhancements
  if (desc.includes('ecommerce') || desc.includes('shop') || desc.includes('store')) {
    library.unshift(
      { title: 'Product Catalog & Category Schema', description: 'Build catalog database, product filtering, and search indexing.', priority: 'high' },
      { title: 'Cart & Stripe Payment Gateway Integration', description: 'Implement checkout workflow, webhook handlers, and order invoicing.', priority: 'urgent' }
    );
  } else if (desc.includes('mobile') || desc.includes('app') || desc.includes('ios') || desc.includes('android')) {
    library.unshift(
      { title: 'Mobile Navigation & Screen Router', description: 'Setup tab bars, stack navigation, and safe-area responsive layouts.', priority: 'high' },
      { title: 'Offline Storage & Push Notifications', description: 'Implement local caching, sync queue, and push messaging listeners.', priority: 'urgent' }
    );
  } else if (desc.includes('ai') || desc.includes('ml') || desc.includes('machine learning')) {
    library.unshift(
      { title: 'Data Preprocessing & Feature Pipeline', description: 'Clean training dataset, handle missing values, and normalize features.', priority: 'high' },
      { title: 'Model Inference Endpoint & Prompt Engineering', description: 'Deploy prediction service with token limits and fallback handlers.', priority: 'urgent' }
    );
  }

  const selected = library.slice(0, count);
  const now = new Date();

  return selected.map((task, i) => {
    const due = new Date(now);
    due.setDate(due.getDate() + (i + 1) * 3);
    return {
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: 'todo',
      dueDate: due.toISOString().split('T')[0],
    };
  });
};

const getHeuristicSummary = (title, stats, tasks) => {
  const total = stats.totalTasks || 0;
  const completed = stats.completedTasks || 0;
  const overdue = stats.overdueTasks || 0;
  const inProgress = stats.inProgressTasks || 0;

  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  let healthScore = 100 - (overdue * 15) - (total === 0 ? 50 : 0);
  if (healthScore < 20) healthScore = 20;
  if (healthScore > 100) healthScore = 100;

  const statusVerdict =
    overdue > 0
      ? 'Needs Attention'
      : rate > 75
      ? 'Excellent / Near Completion'
      : rate > 40
      ? 'Healthy & On Track'
      : 'In Initial Phases';

  return {
    healthScore,
    statusVerdict,
    executiveSummary: `The project "${title}" is currently at ${rate}% completion with ${completed} of ${total} tasks finished. ${inProgress} tasks are actively in development. ${overdue > 0 ? `There are ${overdue} overdue items requiring immediate resolution.` : 'Milestones are progressing on schedule without critical delays.'}`,
    bottlenecks: overdue > 0
      ? [`${overdue} tasks have exceeded their due dates and should be re-prioritized or reassigned.`, 'Check dependencies between in-progress and blocked deliverables.']
      : ['No immediate blockers detected. Monitor sprint velocity.'],
    recommendations: [
      inProgress > 0 ? `Focus team focus on finalizing the ${inProgress} tasks currently in progress.` : 'Begin picking up pending backlog tasks.',
      overdue > 0 ? 'Reschedule overdue milestones to align with realistic sprint timelines.' : 'Ensure automated testing is updated alongside completed deliverables.',
      'Maintain continuous review cycles before final project sign-off.',
    ],
  };
};

/**
 * Main Service Methods
 */

const generateTasks = async ({ title, description, count = 5 }) => {
  const targetCount = Number(count) || 5;

  // 1. Try Gemini or Ollama if configured
  try {
    const systemPrompt = `You are an expert Agile Project Manager. Generate exactly ${targetCount} actionable tasks for the given project. Return ONLY a valid JSON array of objects with the following keys: "title" (concise string), "description" (1-2 sentences), "priority" (one of: "urgent", "high", "medium", "low"), "daysFromNow" (number between 1 and 30 indicating suggested due date deadline). Do not include markdown code block formatting, just pure JSON.`;
    const userPrompt = `Project Title: ${title}\nDescription: ${description || 'General software project'}\nTask Count: ${targetCount}`;

    let responseText = '';
    if (process.env.AI_PROVIDER === 'ollama') {
      responseText = await callOllamaAPI(userPrompt, systemPrompt);
    } else if (process.env.GEMINI_API_KEY) {
      responseText = await callGeminiAPI(userPrompt, systemPrompt);
    }

    if (responseText) {
      // Clean JSON output (remove ```json wrappers if present)
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const now = new Date();
        return parsed.map((item, idx) => {
          const days = Number(item.daysFromNow) || (idx + 1) * 3;
          const due = new Date(now);
          due.setDate(due.getDate() + days);

          return {
            title: item.title || `Task ${idx + 1}`,
            description: item.description || '',
            priority: ['urgent', 'high', 'medium', 'low'].includes(item.priority?.toLowerCase())
              ? item.priority.toLowerCase()
              : 'medium',
            status: 'todo',
            dueDate: due.toISOString().split('T')[0],
          };
        });
      }
    }
  } catch (error) {
    console.warn(`[AI Service Provider notice]: Using intelligent fallback generator (${error.message})`);
  }

  // 2. Fallback to smart heuristic generator
  return getHeuristicTasks(title, description, targetCount);
};

const summarizeProgress = async ({ title, description, stats, tasks }) => {
  try {
    const systemPrompt = `You are a Senior Project Management Consultant. Given a project's metrics and task list, output an executive project health audit in ONLY pure JSON format with these exact keys:
"healthScore" (number 0-100),
"statusVerdict" (short string like "On Track", "Needs Attention", "Ahead of Schedule"),
"executiveSummary" (2-3 sentences overview of project state),
"bottlenecks" (array of 1-3 strings identifying risks or delays),
"recommendations" (array of 2-4 actionable suggestions).
Do not output markdown code blocks.`;

    const userPrompt = `Project: ${title}\nDescription: ${description}\nMetrics: Total Tasks: ${stats.totalTasks}, Completed: ${stats.completedTasks}, In-Progress: ${stats.inProgressTasks}, Overdue: ${stats.overdueTasks}\nTasks:\n${tasks.map((t) => `- [${t.status}] ${t.title} (Priority: ${t.priority}, Due: ${t.dueDate || 'none'})`).join('\n')}`;

    let responseText = '';
    if (process.env.AI_PROVIDER === 'ollama') {
      responseText = await callOllamaAPI(userPrompt, systemPrompt);
    } else if (process.env.GEMINI_API_KEY) {
      responseText = await callGeminiAPI(userPrompt, systemPrompt);
    }

    if (responseText) {
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.healthScore !== undefined) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn(`[AI Service Provider notice]: Using heuristic summary (${error.message})`);
  }

  return getHeuristicSummary(title, stats, tasks);
};

const chat = async ({ message, context = {} }) => {
  try {
    const systemPrompt = `You are ProjectAI Assistant, a friendly and experienced agile project manager advisor. Help the user with task management, sprint planning, prioritization, and resolving bottlenecks. Keep responses concise, clear, structured with bullet points where appropriate, and actionable.`;

    const contextText = context.projectTitle
      ? `[Current Project: "${context.projectTitle}", Description: "${context.projectDescription || ''}"]\n\n`
      : '';

    const userPrompt = `${contextText}User Question: ${message}`;

    if (process.env.AI_PROVIDER === 'ollama') {
      return await callOllamaAPI(userPrompt, systemPrompt);
    } else if (process.env.GEMINI_API_KEY) {
      return await callGeminiAPI(userPrompt, systemPrompt);
    }
  } catch (error) {
    console.warn(`[AI Service notice]: Using intelligent chat fallback (${error.message})`);
  }

  // Smart fallback chat responses
  const q = message.toLowerCase();
  if (q.includes('overdue') || q.includes('delay') || q.includes('late')) {
    return `### 🚨 Strategy for Overdue Tasks:\n1. **Triage & Categorize:** Identify if delays are due to unclear requirements or technical blockers.\n2. **Break Down:** Split complex tasks into smaller sub-tasks achievable within 1–2 days.\n3. **Reassign Workload:** Shift high-priority overdue tasks to available team members.\n4. **Update Due Dates:** Adjust deadlines with realistic buffers to prevent team burnout.`;
  }
  if (q.includes('priorit') || q.includes('urgent') || q.includes('important')) {
    return `### 🎯 Prioritization Framework (Eisenhower Matrix):\n- **Urgent & Important:** Core APIs, security fixes, and blocker bugs (Do First).\n- **Important, Not Urgent:** Architecture refactoring, automated tests, UI polish (Schedule).\n- **Urgent, Not Important:** Minor routine tasks (Delegate or batch together).\n- **Neither:** Feature bloat and scope creep (Eliminate).`;
  }
  if (q.includes('sprint') || q.includes('agile') || q.includes('scrum')) {
    return `### 🏃‍♂️ Sprint Planning Best Practices:\n- Limit work-in-progress (WIP) to no more than 2 active tasks per developer.\n- Hold quick 5-minute daily standups to identify blockers early.\n- Keep sprint goals concise and measurable.`;
  }

  return `### 💡 Project Assistant Advice:\nFor project **${context.projectTitle || 'Management'}**, focus on keeping tasks small and measurable. Ensure all team members have clear next deliverables on the **Kanban Board** and track completion rates daily on your **Dashboard**. Feel free to ask for task breakdowns or risk mitigation strategies!`;
};

module.exports = {
  generateTasks,
  summarizeProgress,
  chat,
};
