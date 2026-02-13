#!/usr/bin/env node
/**
 * 🔥 HOTMESS Developer Dashboard
 * 
 * A visual, ADHD-friendly command center for your project.
 * Run with: npm run dash
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// COLORS & STYLING
// ═══════════════════════════════════════════════════════════════════════════
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Backgrounds
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

const WIDTH = 60;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function line(char = '─') {
  return char.repeat(WIDTH);
}

function box(title, content, color = c.cyan) {
  console.log(`\n${color}╭${'─'.repeat(WIDTH - 2)}╮${c.reset}`);
  console.log(`${color}│${c.reset} ${c.bold}${title}${c.reset}${' '.repeat(WIDTH - title.length - 4)}${color}│${c.reset}`);
  console.log(`${color}├${'─'.repeat(WIDTH - 2)}┤${c.reset}`);
  
  const lines = content.split('\n');
  lines.forEach(l => {
    const stripped = l.replace(/\x1b\[[0-9;]*m/g, '');
    const padding = Math.max(0, WIDTH - stripped.length - 4);
    console.log(`${color}│${c.reset} ${l}${' '.repeat(padding)} ${color}│${c.reset}`);
  });
  
  console.log(`${color}╰${'─'.repeat(WIDTH - 2)}╯${c.reset}`);
}

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function badge(text, bgColor, textColor = c.white) {
  return `${bgColor}${textColor}${c.bold} ${text} ${c.reset}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA COLLECTION
// ═══════════════════════════════════════════════════════════════════════════

function getGitStatus() {
  const branch = exec('git rev-parse --abbrev-ref HEAD') || 'unknown';
  const status = exec('git status --porcelain') || '';
  const changes = status.split('\n').filter(l => l.trim()).length;
  const lastCommit = exec('git log -1 --pretty=format:"%s"') || 'No commits';
  const lastCommitTime = exec('git log -1 --pretty=format:"%ar"') || '';
  
  return { branch, changes, lastCommit, lastCommitTime };
}

function getVercelStatus() {
  const deployments = exec('vercel ls --limit 1 2>/dev/null') || '';
  const hasProduction = deployments.includes('Production');
  const url = 'https://hotmess-globe-fix.vercel.app';
  return { hasProduction, url };
}

function getNodeStatus() {
  const nodeVersion = exec('node --version') || 'unknown';
  const npmVersion = exec('npm --version') || 'unknown';
  const hasNodeModules = fs.existsSync(path.join(process.cwd(), 'node_modules'));
  return { nodeVersion, npmVersion, hasNodeModules };
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

const TASKS_FILE = path.join(process.cwd(), '.hotmess-tasks.json');

function loadTasks() {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    }
  } catch {}
  return {
    tasks: [],
    notes: [],
    focus: null
  };
}

function saveTasks(data) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(data, null, 2));
}

// ═══════════════════════════════════════════════════════════════════════════
// DISPLAY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function showHeader() {
  console.clear();
  console.log(`
${c.magenta}${c.bold}
    ╦ ╦╔═╗╔╦╗╔╦╗╔═╗╔═╗╔═╗
    ╠═╣║ ║ ║ ║║║║╣ ╚═╗╚═╗
    ╩ ╩╚═╝ ╩ ╩ ╩╚═╝╚═╝╚═╝
${c.reset}${c.dim}    Developer Dashboard v1.0${c.reset}
`);
}

function showQuickStatus() {
  const git = getGitStatus();
  const node = getNodeStatus();
  
  let gitBadge = git.changes > 0 
    ? badge(`${git.changes} changes`, c.bgYellow, c.white)
    : badge('clean', c.bgGreen);
  
  let content = `
${c.cyan}Branch:${c.reset}  ${c.bold}${git.branch}${c.reset} ${gitBadge}
${c.cyan}Commit:${c.reset}  ${git.lastCommit.slice(0, 40)}
         ${c.dim}${git.lastCommitTime}${c.reset}
${c.cyan}Node:${c.reset}    ${node.nodeVersion} ${node.hasNodeModules ? '✅' : '❌ run npm install'}
`.trim();

  box('📊 Status', content, c.blue);
}

function showTasks() {
  const data = loadTasks();
  
  if (data.focus) {
    console.log(`\n${c.bgMagenta}${c.white}${c.bold} 🎯 CURRENT FOCUS ${c.reset}`);
    console.log(`   ${c.bold}${data.focus}${c.reset}\n`);
  }
  
  let content = '';
  
  if (data.tasks.length === 0) {
    content = `${c.dim}No tasks yet. Add one with:${c.reset}\n${c.yellow}npm run dash add "Your task"${c.reset}`;
  } else {
    data.tasks.forEach((task, i) => {
      const icon = task.done ? `${c.green}✓${c.reset}` : `${c.yellow}○${c.reset}`;
      const text = task.done ? `${c.dim}${task.text}${c.reset}` : task.text;
      const priority = task.priority === 'high' ? ` ${c.red}!!!${c.reset}` : '';
      content += `${icon} ${i + 1}. ${text}${priority}\n`;
    });
  }
  
  box('📋 Tasks', content.trim(), c.yellow);
}

function showNotes() {
  const data = loadTasks();
  
  if (data.notes.length === 0) {
    return;
  }
  
  let content = data.notes.map((note, i) => 
    `${c.cyan}•${c.reset} ${note}`
  ).join('\n');
  
  box('📝 Notes', content, c.magenta);
}

function showQuickCommands() {
  const content = `
${c.green}npm run dev${c.reset}          Start dev server
${c.green}npm run build${c.reset}        Build for production
${c.green}npm run test:integrations${c.reset}  Test all services
${c.green}npm run dash${c.reset}         This dashboard

${c.cyan}npm run dash add "task"${c.reset}   Add a task
${c.cyan}npm run dash done 1${c.reset}       Complete task #1
${c.cyan}npm run dash focus "x"${c.reset}    Set focus
${c.cyan}npm run dash note "x"${c.reset}     Add a note
${c.cyan}npm run dash clear${c.reset}        Clear completed
`.trim();

  box('⚡ Quick Commands', content, c.green);
}

function showLiveUrl() {
  const vercel = getVercelStatus();
  console.log(`\n${c.dim}🌐 Live:${c.reset} ${c.cyan}${c.bold}${vercel.url}${c.reset}\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function addTask(text, priority = 'normal') {
  const data = loadTasks();
  data.tasks.push({ text, done: false, priority, created: new Date().toISOString() });
  saveTasks(data);
  console.log(`${c.green}✓${c.reset} Added: ${text}`);
}

function completeTask(num) {
  const data = loadTasks();
  const idx = parseInt(num) - 1;
  if (data.tasks[idx]) {
    data.tasks[idx].done = true;
    saveTasks(data);
    console.log(`${c.green}✓${c.reset} Completed: ${data.tasks[idx].text}`);
  } else {
    console.log(`${c.red}✗${c.reset} Task #${num} not found`);
  }
}

function setFocus(text) {
  const data = loadTasks();
  data.focus = text;
  saveTasks(data);
  console.log(`${c.magenta}🎯${c.reset} Focus set: ${text}`);
}

function addNote(text) {
  const data = loadTasks();
  data.notes.push(text);
  saveTasks(data);
  console.log(`${c.cyan}📝${c.reset} Note added`);
}

function clearCompleted() {
  const data = loadTasks();
  const before = data.tasks.length;
  data.tasks = data.tasks.filter(t => !t.done);
  const cleared = before - data.tasks.length;
  saveTasks(data);
  console.log(`${c.green}✓${c.reset} Cleared ${cleared} completed tasks`);
}

function clearAll() {
  saveTasks({ tasks: [], notes: [], focus: null });
  console.log(`${c.green}✓${c.reset} All tasks and notes cleared`);
}

function highPriority(text) {
  addTask(text, 'high');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const command = args[0];
const value = args.slice(1).join(' ');

switch (command) {
  case 'add':
    addTask(value);
    break;
  case 'high':
    highPriority(value);
    break;
  case 'done':
    completeTask(value);
    break;
  case 'focus':
    setFocus(value);
    break;
  case 'note':
    addNote(value);
    break;
  case 'clear':
    clearCompleted();
    break;
  case 'reset':
    clearAll();
    break;
  default:
    // Show dashboard
    showHeader();
    showQuickStatus();
    showTasks();
    showNotes();
    showQuickCommands();
    showLiveUrl();
}
