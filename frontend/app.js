/**
 * ============================================
 * 销售专家团 — 前端交互逻辑
 * ============================================
 */

// ---- State ----
const state = {
  experts: [],
  selectedExpert: null, // null = 智能路由
  sessionId: null,
  isProcessing: false,
};

// ---- DOM References ----
const expertButtons = document.getElementById('expert-buttons');
const autoRouteBtn = document.getElementById('auto-route-btn');
const messagesEl = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const thinkingEl = document.getElementById('agent-thinking');
const thinkingText = document.getElementById('thinking-text');
const expertIcon = document.getElementById('expert-icon');
const expertName = document.getElementById('expert-name');
const expertListDisplay = document.getElementById('expert-list-display');
const tokenCount = document.getElementById('token-count');
const industryInput = document.getElementById('industry-input');
const roleInput = document.getElementById('role-input');
const scenarioInput = document.getElementById('scenario-input');

// ---- Icons for each expert ----
const EXPERT_ICONS = {
  sales_coach: '🎯',
  question_designer: '❓',
  story_creator: '📖',
  proposal_designer: '📄',
  strategy_advisor: '🧭',
  insight_designer: '💡',
  performance_feedback: '📊',
  process_designer: '🔄',
  compensation_assistant: '💰',
  talent_profile_builder: '👤',
  behavioral_interview: '🗣️',
  ad_designer: '📢',
  structured_interview: '📋',
  onboarding_designer: '🚀',
};
const DEFAULT_ICON = '🤖';

// ---- Init ----
async function init() {
  await loadExperts();
  setupEventListeners();
  loadSession();
}

async function loadExperts() {
  try {
    const res = await fetch('/api/experts');
    const data = await res.json();
    state.experts = data.experts;
    renderExpertButtons();
  } catch (err) {
    console.error('加载专家列表失败:', err);
  }
}

function renderExpertButtons() {
  expertButtons.innerHTML = state.experts
    .map(
      (ex) => `
      <button class="expert-btn" data-expert="${ex.name}">
        <span class="expert-btn-icon">${EXPERT_ICONS[ex.name] || DEFAULT_ICON}</span>
        <span class="expert-btn-label">${ex.label}</span>
      </button>
    `
    )
    .join('');
}

function setupEventListeners() {
  // 专家按钮点击
  expertButtons.addEventListener('click', (e) => {
    const btn = e.target.closest('.expert-btn');
    if (!btn) return;
    selectExpert(btn.dataset.expert);
  });

  // 智能路由
  autoRouteBtn.addEventListener('click', () => {
    selectExpert(null);
  });

  // 发送消息
  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // 示例问题
  messagesEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.example-btn');
    if (!btn) return;
    messageInput.value = btn.dataset.msg;
    sendMessage();
  });
}

// ---- Expert Selection ----
function selectExpert(expertName) {
  state.selectedExpert = expertName;

  // 更新按钮状态
  document.querySelectorAll('.expert-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.expert === expertName);
  });
  autoRouteBtn.classList.toggle('active', !expertName);

  // 更新头部显示
  if (expertName) {
    const expert = state.experts.find((e) => e.name === expertName);
    expertIcon.textContent = EXPERT_ICONS[expertName] || DEFAULT_ICON;
    expertName.textContent = expert ? expert.label : expertName;
  } else {
    expertIcon.textContent = '🤖';
    expertName.textContent = '智能路由（自动匹配）';
  }
}

// ---- Send Message ----
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || state.isProcessing) return;

  messageInput.value = '';
  addMessage('user', text);

  // 去除欢迎界面
  const welcome = messagesEl.querySelector('.welcome-message');
  if (welcome) welcome.remove();

  state.isProcessing = true;
  showThinking('分析中...');

  try {
    const context = {
      industry: industryInput.value.trim(),
      role: roleInput.value.trim(),
      scenario: scenarioInput.value.trim(),
    };

    let endpoint = '/api/chat';
    if (state.selectedExpert) {
      endpoint = `/api/chat/${state.selectedExpert}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        context,
        sessionId: state.sessionId,
      }),
    });

    const data = await res.json();

    if (data.error) {
      addMessage('error', `出错了: ${data.error}`);
      return;
    }

    state.sessionId = data.sessionId;
    saveSession();

    // 显示使用的专家
    if (data.experts && data.experts.length > 0) {
      const expertLabels = data.experts
        .map((name) => {
          const ex = state.experts.find((e) => e.name === name);
          const icon = EXPERT_ICONS[name] || DEFAULT_ICON;
          return `${icon} ${ex ? ex.label : name}`;
        })
        .join(' + ');

      // 如果不是指定专家模式，自动切换显示
      if (!state.selectedExpert && data.experts.length > 0) {
        expertIcon.textContent = EXPERT_ICONS[data.experts[0]] || DEFAULT_ICON;
        expertName.textContent = expertLabels;
      }
    }

    // 显示专家输出
    if (data.agentOutputs) {
      for (const [name, output] of Object.entries(data.agentOutputs)) {
        if (output.status === 'done' || output.status === undefined) {
          const ex = state.experts.find((e) => e.name === name);
          const icon = EXPERT_ICONS[name] || DEFAULT_ICON;
          const label = ex ? ex.label : name;
          addMessage('agent', output.output, {
            agentName: name,
            agentLabel: label,
            agentIcon: icon,
          });
        }
      }
    } else if (data.output) {
      addMessage('assistant', data.output);
    }
  } catch (err) {
    addMessage('error', `网络错误: ${err.message}`);
  } finally {
    state.isProcessing = false;
    hideThinking();
  }
}

// ---- UI Helpers ----
function addMessage(role, content, extra = {}) {
  const div = document.createElement('div');
  div.className = `message ${role}-message`;

  let headerHtml = '';
  if (role === 'agent') {
    const { agentIcon, agentLabel } = extra;
    headerHtml = `
      <div class="message-agent-header">
        <span class="agent-icon">${agentIcon || DEFAULT_ICON}</span>
        <span class="agent-label">${agentLabel || '专家'}</span>
      </div>
    `;
  }

  div.innerHTML = `
    ${headerHtml}
    <div class="message-content">${formatContent(content)}</div>
  `;

  messagesEl.appendChild(div);
  scrollToBottom();
}

function formatContent(text) {
  if (!text) return '';
  // 简单支持换行和加粗
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/### (.*?)(?:\n|$)/g, '<h3>$1</h3>')
    .replace(/## (.*?)(?:\n|$)/g, '<h2>$1</h2>')
    .replace(/^- (.*?)(?:\n|$)/gm, '<li>$1</li>')
    .replace(/(<li>.*?<\/li>)/gs, (match) => `<ul>${match}</ul>`)
    .replace(/<\/ul>\s*<ul>/g, '');
}

function showThinking(text) {
  thinkingText.textContent = text || '专家思考中...';
  thinkingEl.classList.remove('hidden');
  scrollToBottom();
}

function hideThinking() {
  thinkingEl.classList.add('hidden');
}

function scrollToBottom() {
  setTimeout(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }, 50);
}

// ---- Session Persistence ----
function saveSession() {
  try {
    localStorage.setItem(
      'sales-agent-session',
      JSON.stringify({
        sessionId: state.sessionId,
        selectedExpert: state.selectedExpert,
      })
    );
  } catch {}
}

function loadSession() {
  try {
    const saved = localStorage.getItem('sales-agent-session');
    if (saved) {
      const data = JSON.parse(saved);
      state.sessionId = data.sessionId;
      if (data.selectedExpert) {
        selectExpert(data.selectedExpert);
      }
    }
  } catch {}
}

// ---- Start ----
init();
