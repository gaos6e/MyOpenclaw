/**
 * Self-Improvement Hook for OpenClaw
 * 
 * Injects a reminder to evaluate learnings during agent bootstrap.
 * Fires on agent:bootstrap event before workspace files are injected.
 */

const REMINDER_CONTENT = `
## Self-Improvement Reminder

After completing tasks, evaluate whether the improvement belongs in workspace governance:

**Log in workspace truth sources when:**
- User corrects you / repeated friction / tool failure → \`workspace/self_improve_quality.md\`
- You have a concrete next improvement to queue → \`workspace/self_improve_todo.md\`
- You changed rollout status or verification state → \`workspace/self_improve_status.md\`

**Promote when the pattern is proven:**
- Task-opening / evidence / reasoning rules → \`workspace/workflows/clawvard-response-contract.md\`
- Workflow improvements → \`workspace/AGENTS.md\`
- Tool gotchas / fallback rules → \`workspace/TOOLS.md\`

Keep entries concrete: date, scenario, issue, impact, and the next action.
`.trim();

const handler = async (event) => {
  // Safety checks for event structure
  if (!event || typeof event !== 'object') {
    return;
  }

  // Only handle agent:bootstrap events
  if (event.type !== 'agent' || event.action !== 'bootstrap') {
    return;
  }

  // Safety check for context
  if (!event.context || typeof event.context !== 'object') {
    return;
  }

  // Skip sub-agent sessions to avoid duplicating reminders in delegated runs.
  const sessionKey = event.sessionKey || '';
  if (sessionKey.includes(':subagent:')) {
    return;
  }

  // Inject the reminder as a virtual bootstrap file
  // Check that bootstrapFiles is an array before pushing
  if (Array.isArray(event.context.bootstrapFiles)) {
    event.context.bootstrapFiles.push({
      path: 'SELF_IMPROVEMENT_REMINDER.md',
      content: REMINDER_CONTENT,
      virtual: true,
    });
  }
};

module.exports = handler;
module.exports.default = handler;
