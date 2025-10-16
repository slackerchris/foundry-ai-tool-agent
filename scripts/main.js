// AI Tool Agent Connector for Foundry VTT

const TOOL_AGENT_URL = "http://192.168.100.21:8000";

class AIToolAgentConnector {
  
  constructor() {
    this.isProcessing = false;
  }
  
  async initialize() {
    console.log("AI Tool Agent Connector | Initializing...");
    
    // Check if Tool Agent is accessible
    try {
      const health = await this.checkHealth();
      console.log("AI Tool Agent | Health check:", health);
      ui.notifications.info("AI Tool Agent connected!");
    } catch (error) {
      console.error("AI Tool Agent | Connection failed:", error);
      ui.notifications.warn("AI Tool Agent connection failed - module disabled");
      return;
    }
    
    // Register chat commands
    Hooks.on('chatMessage', async (chatLog, message, chatData) => {
      if (message.startsWith('/ai ')) {
        await this.handleCommand(message.substring(4));
        return false;
      }
    });
    
    console.log("AI Tool Agent Connector | Ready! Use /ai <command>");
  }
  
  async checkHealth() {
    const response = await fetch(`${TOOL_AGENT_URL}/health`);
    return await response.json();
  }
  
  async handleCommand(command) {
    if (this.isProcessing) {
      ui.notifications.warn("AI Tool Agent is already processing a command");
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Show processing message
      await ChatMessage.create({
        content: `<div class="ai-processing">
          <i class="fas fa-spinner fa-spin"></i> 
          AI Tool Agent processing: "${command}"...
        </div>`,
        speaker: { alias: "AI Tool Agent" }
      });
      
      // Get current scene context
      const context = this.getSceneContext();
      
      // Call AI Tool Agent
      const response = await fetch(`${TOOL_AGENT_URL}/parse_command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command: command,
          context: context
        })
      });
      
      if (!response.ok) {
        throw new Error(`Tool Agent responded with ${response.status}`);
      }
      
      const result = await response.json();
      console.log("AI Tool Agent response:", result);
      
      // Display narrative
      await ChatMessage.create({
        content: `<div class="ai-narrative">
          <strong>📖 ${result.narrative}</strong>
        </div>`,
        speaker: { alias: "AI Tool Agent" }
      });
      
      // Display commands (for now, just show them - we'll execute later)
      if (result.foundry_commands && result.foundry_commands.length > 0) {
        let commandsHtml = '<div class="ai-commands"><strong>Commands to execute:</strong><ul>';
        for (const cmd of result.foundry_commands) {
          commandsHtml += `<li><code>${cmd.raw}</code></li>`;
        }
        commandsHtml += '</ul></div>';
        
        await ChatMessage.create({
          content: commandsHtml,
          speaker: { alias: "AI Tool Agent" }
        });
      }
      
    } catch (error) {
      console.error("AI Tool Agent error:", error);
      await ChatMessage.create({
        content: `<div class="ai-error">❌ Error: ${error.message}</div>`,
        speaker: { alias: "AI Tool Agent" }
      });
    } finally {
      this.isProcessing = false;
    }
  }
  
  getSceneContext() {
    const scene = canvas.scene;
    if (!scene) return {};
    
    return {
      sceneName: scene.name,
      sceneActive: true,
      tokenCount: scene.tokens.size,
      sceneSize: {
        width: scene.width,
        height: scene.height
      }
    };
  }
}

// Initialize when Foundry is ready
Hooks.once('ready', () => {
  if (!game.user.isGM) {
    console.log("AI Tool Agent | Not GM, connector disabled");
    return;
  }
  
  window.aiToolAgent = new AIToolAgentConnector();
  window.aiToolAgent.initialize();
});
