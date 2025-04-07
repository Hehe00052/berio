<template>
  <div class="game-container">
    <div v-if="gameStarted">
      <canvas ref="gameCanvas" width="800" height="600"></canvas>
      <div class="game-info">
        <p>Player: {{ playerName }}</p>
        <p>Score: {{ score }}</p>
        <p>Lives: {{ lives }}</p>
        <p>Level: {{ currentLevel }}</p>
      </div>
      <div v-if="gameOver" class="game-over">
        <h2>{{ gameOverMessage }}</h2>
        <button @click="restartGame">Play Again</button>
      </div>
    </div>
    <div v-else class="welcome-screen">
      <div class="game-instructions">
        <h1>Game Instructions</h1>
        <div class="instructions-content">
          <h2>How to Play:</h2>
          <ul>
            <li><strong>Goal:</strong> Jump on enemies to defeat them and collect coins</li>
            <li><strong>Controls:</strong>
              <ul>
                <li><kbd>←</kbd> <kbd>→</kbd> Arrow keys to move left/right</li>
                <li><kbd>Space</kbd> to jump</li>
                <li><kbd>R</kbd> to restart when game over</li>
              </ul>
            </li>
            <li><strong>Gameplay:</strong>
              <ul>
                <li>Defeat all enemies in a level to proceed</li>
                <li>Jump on enemies from above to defeat them</li>
                <li>Collect coins to increase your score</li>
                <li>After each level, use points to buy upgrades in the shop</li>
              </ul>
            </li>
            <li><strong>Upgrades:</strong>
              <ul>
                <li>Extra Life - Get an additional life</li>
                <li>Super Jump - Jump 25% higher</li>
                <li>Speed Boost - Move 20% faster</li>
                <li>Shield - Start each level with 10 seconds of invulnerability (I'm fixing, dont buy that :3)</li>
              </ul>
            </li>
          </ul>
        </div>
        <div class="name-input">
          <h2>Enter your name:</h2>
          <input v-model="playerName" @keyup.enter="startGame" placeholder="Player" />
          <button @click="startGame">Start Game</button>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showShop" class="shop">
    <h2>Shop - Level {{ currentLevel + 1 }}</h2>
    <p>Current Score: {{ score }}</p>
    <div class="buff-list">
      <div v-for="(buff, index) in availableBuffs" :key="index" class="buff-item">
        <h3>{{ buff.name }} ({{ buff.cost }} points)</h3>
        <p>{{ buff.description }}</p>
        <button @click="purchaseBuff(buff)" :disabled="score < buff.cost">
          {{ score >= buff.cost ? 'Buy' : 'Not enough points' }}
        </button>
      </div>
    </div>
    <button @click="proceedToNextLevel" class="proceed-button">
      Proceed to Next Level
    </button>
  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted, nextTick } from 'vue';

// Reactive state
const gameStarted = ref(false);
const playerName = ref('Player');
const gameCanvas = ref(null);
let ctx = null;
const gameOver = ref(false);
const gameOverMessage = ref('');
const score = ref(0);
const lives = ref(3);
const currentLevel = ref(1);
const maxLevels = 101;
const screenShake = ref(0);
const deathEffect = ref(0);

const showShop = ref(false);
const availableBuffs = ref([
  {
    name: 'Extra Life',
    cost: 100,
    description: 'Gain an additional life',
    type: 'life'
  },
  {
    name: 'Super Jump',
    cost: 150,
    description: 'Jump 25% higher',
    type: 'jump'
  },
  {
    name: 'Speed Boost',
    cost: 200,
    description: 'Move 20% faster',
    type: 'speed'
  },
  {
    name: 'Shield',
    cost: 300,
    description: 'Become invulnerable for first 10 seconds',
    type: 'shield'
  }
]);

// Game entities
const player = reactive({
  name: playerName.value,
  width: 30,
  height: 60,
  x: 50,
  y: 0,
  initialX: 50,
  initialY: 0,
  velocityX: 0,
  velocityY: 0,
  jumping: false,
  invulnerable: false,
  invulnerableTimer: 0
});

const enemies = ref([]);
const coins = ref([]);

// Game loop
let animationFrameId = null;
let lastTime = 0;

// Constants
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const COLORS = {
  WHITE: '#FFFFFF',
  BLUE: '#0000FF',
  RED: '#FF0000',
  BLACK: '#000000',
  GOLD: '#FFD700'
};

// Methods
const startGame = () => {
  gameStarted.value = true;
  nextTick(() => {
    initGame();
  });
};

const initGame = () => {
  ctx = gameCanvas.value.getContext('2d');

  score.value = 0;
  lives.value = 3;
  currentLevel.value = 1;
  gameOver.value = false;

  setupLevel(currentLevel.value);
  gameLoop();

  // Setup keyboard controls
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
};

const setupLevel = (level) => {
  // Reset entities
  enemies.value = [];
  coins.value = [];

  // Save buff states before reset
  const savedJumpPower = player.jumpPower;
  const savedSpeedMultiplier = player.speedMultiplier;
  const savedHasShield = player.hasShield;

  // Reset player
  player.initialY = SCREEN_HEIGHT - 120;
  player.y = player.initialY;
  player.x = player.initialX;
  player.velocityX = 0;
  player.velocityY = 0;
  player.jumping = false;
  player.invulnerable = false;
  player.invulnerableTimer = 0;
  player.name = playerName.value;

  // Restore buff states
  player.jumpPower = savedJumpPower;
  player.speedMultiplier = savedSpeedMultiplier;
  player.hasShield = savedHasShield;

  // Apply shield at the beginning of each level if the player has it
  if (player.hasShield) {
    player.invulnerable = true;
    setTimeout(() => {
      player.invulnerable = false;
    }, 10000); // 10 seconds of invulnerability
  }

  // Generate enemies based on level
  const numEnemies = level * 3;

  for (let i = 0; i < numEnemies; i++) {
    const x = Math.floor(Math.random() * (SCREEN_WIDTH - 30));
    const y = Math.floor(Math.random() * (SCREEN_HEIGHT - 30));
    enemies.value.push({
      x,
      y,
      width: 30,
      height: 30,
      velocityX: Math.random() < 0.5 ? -1 : 1,
      velocityY: Math.random() < 0.5 ? -1 : 1
    });
  }

};

// Update function remains the same
const update = () => {
  const oldY = player.y;

  // Update player
  updatePlayer();

  // Update enemies
  updateEnemies();

  // Update coins
  updateCoins();

  // Check collisions
  checkCollisions(oldY);

  // Update effects
  if (screenShake.value > 0) screenShake.value--;
  if (deathEffect.value > 0) deathEffect.value--;

  // Check level completion
  if (enemies.value.length === 0) {
    if (currentLevel.value < maxLevels) {
      showShop.value = true;
      cancelAnimationFrame(animationFrameId); // Stop the game loop properly
    } else {
      gameOver.value = true;
      gameOverMessage.value = 'You Win! Click to play again';
    }
  }
};

const proceedToNextLevel = () => {
  showShop.value = false;
  currentLevel.value++;
  setupLevel(currentLevel.value);
  gameStarted.value = true; // Ensure the game is started

  // Properly restart the game loop
  lastTime = 0;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  animationFrameId = requestAnimationFrame(gameLoop);
};

const gameLoop = (timestamp) => {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  if (!gameOver.value) {
    update(deltaTime);
    render();
  }

  animationFrameId = requestAnimationFrame(gameLoop);
};

const updatePlayer = () => {
  // Apply gravity
  player.velocityY += 0.3;

  // Apply velocity
  player.y += player.velocityY;
  player.x += player.velocityX;

  // Check boundaries
  if (player.y + player.height > SCREEN_HEIGHT) {
    player.y = SCREEN_HEIGHT - player.height;
    player.jumping = false;
    player.velocityY = 0;
  }

  if (player.y < 0) {
    player.y = 0;
    player.velocityY = 0;
  }

  if (player.x < 0) {
    player.x = 0;
  }

  if (player.x + player.width > SCREEN_WIDTH) {
    player.x = SCREEN_WIDTH - player.width;
  }

  // Update invulnerability
  if (player.invulnerable) {
    player.invulnerableTimer++;
    if (player.invulnerableTimer > 60) {
      player.invulnerable = false;
      player.invulnerableTimer = 0;
    }
  }

};

const purchaseBuff = (buff) => {
  if (score.value >= buff.cost) {
    score.value -= buff.cost;
    applyBuff(buff);
  }
};

// Apply buff function
const applyBuff = (buff) => {
  switch (buff.type) {
    case 'life':
      lives.value++;
      break;
    case 'jump':
      player.jumpPower = 1.1; // Increase 25%
      break;
    case 'speed':
      player.speedMultiplier = 1.4; // Increase 40%
      break;
    case 'shield':
      player.hasShield = true;
      break;
  }
};

const updateEnemies = () => {
  for (const enemy of enemies.value) {
    // Update position
    enemy.x += enemy.velocityX;
    enemy.y += enemy.velocityY;

    // Check left boundary
    if (enemy.x < 0) {
      enemy.x = 0; // Reset position at boundary
      enemy.velocityX *= -1; // Reverse horizontal direction
      enemy.velocityY += (Math.random() - 0.5) * 0.5; // Add small deviation to vertical direction
      enemy.velocityY = Math.max(-2, Math.min(2, enemy.velocityY)); // Limit vertical velocity
    }

    // Check right boundary
    if (enemy.x + enemy.width > SCREEN_WIDTH) {
      enemy.x = SCREEN_WIDTH - enemy.width; // Reset position at boundary
      enemy.velocityX *= -1; // Reverse horizontal direction
      enemy.velocityY += (Math.random() - 0.5) * 0.5; // Add small deviation to vertical direction
      enemy.velocityY = Math.max(-2, Math.min(2, enemy.velocityY)); // Limit vertical velocity
    }

    // Check top boundary
    if (enemy.y < 0) {
      enemy.y = 0; // Reset position at boundary
      enemy.velocityY *= -1; // Reverse vertical direction
      enemy.velocityX += (Math.random() - 0.5) * 0.5; // Add small deviation to horizontal direction
      enemy.velocityX = Math.max(-2, Math.min(2, enemy.velocityX)); // Limit horizontal velocity
    }

    // Check bottom boundary
    if (enemy.y + enemy.height > SCREEN_HEIGHT) {
      enemy.y = SCREEN_HEIGHT - enemy.height; // Reset position at boundary
      enemy.velocityY *= -1; // Reverse vertical direction
      enemy.velocityX += (Math.random() - 0.5) * 0.5; // Add small deviation to horizontal direction
      enemy.velocityX = Math.max(-2, Math.min(2, enemy.velocityX)); // Limit horizontal velocity
    }
  }
};

const updateCoins = () => {
  for (let i = coins.value.length - 1; i >= 0; i--) {
    const coin = coins.value[i];

    // Apply gravity
    coin.velocityY += 0.5;
    coin.y += coin.velocityY;

    // Check floor
    if (coin.y + coin.height > SCREEN_HEIGHT) {
      coin.y = SCREEN_HEIGHT - coin.height;
      coin.velocityY = 0;
    }
  }
};

const checkCollisions = (oldY) => {
  // Check coin collisions
  for (let i = coins.value.length - 1; i >= 0; i--) {
    const coin = coins.value[i];
    if (checkRectCollision(player, coin)) {
      coins.value.splice(i, 1);
      score.value += coin.value; // Use random coin value
    }
  }

  // Check enemy collisions
  for (let i = enemies.value.length - 1; i >= 0; i--) {
    const enemy = enemies.value[i];
    if (checkRectCollision(player, enemy)) {
      // Check if player is jumping on enemy
      if (oldY + player.height <= enemy.y + 10 &&
        player.y + player.height >= enemy.y) {
        // Convert enemy to coins
        convertEnemyToCoins(enemy);
        enemies.value.splice(i, 1);
        player.velocityY = -10; // Bounce up
      } else if (!player.invulnerable) {
        // Player hit by enemy
        playerDie();
      }
    }
  }
};

const convertEnemyToCoins = (enemy) => {
  const coinCount = Math.floor(Math.random() * 3) + 2; // 2-4 coins
  for (let i = 0; i < coinCount; i++) {
    coins.value.push({
      x: enemy.x + Math.random() * 20 - 10,
      y: enemy.y + Math.random() * 20 - 10,
      width: 15,
      height: 15,
      velocityY: -10,
      velocityX: 0,
      value: Math.floor(Math.random() * 15) + 5 // 5-20 points per coin
    });
  }
};

const playerDie = () => {
  lives.value--;
  player.x = player.initialX;
  player.y = player.initialY;
  player.invulnerable = true;
  screenShake.value = 30;
  deathEffect.value = 60;

  if (lives.value <= 0) {
    gameOver.value = true;
    gameOverMessage.value = 'Game Over! Click to restart';
  }
};

const render = () => {
  // Clear canvas
  if (deathEffect.value > 0) {
    ctx.fillStyle = COLORS.RED;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  } else {
    ctx.fillStyle = COLORS.WHITE;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  // Apply screen shake
  if (screenShake.value > 0) {
    const offsetX = Math.floor(Math.random() * 10 - 5);
    const offsetY = Math.floor(Math.random() * 10 - 5);
    ctx.save();
    ctx.translate(offsetX, offsetY);
  }

  // Draw player - blinking when invulnerable
  if (!player.invulnerable || Math.floor(Date.now() / 100) % 2) {
    ctx.fillStyle = COLORS.BLUE;
    ctx.fillRect(player.x, player.y, player.width, player.height);
  }

  // Draw enemies
  ctx.fillStyle = COLORS.RED;
  for (const enemy of enemies.value) {
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  }

  // Draw coins
  ctx.fillStyle = COLORS.GOLD;
  for (const coin of coins.value) {
    ctx.fillRect(coin.x, coin.y, coin.width, coin.height);
  }

  // Reset transform if screen shake was applied
  if (screenShake.value > 0) {
    ctx.restore();
  }
};

const checkRectCollision = (rectA, rectB) => {
  return (
    rectA.x < rectB.x + rectB.width &&
    rectA.x + rectA.width > rectB.x &&
    rectA.y < rectB.y + rectB.height &&
    rectA.y + rectA.height > rectB.y
  );
};

const handleKeyDown = (e) => {
  if (e.code === 'Space') {
    if (!player.jumping) {
      player.velocityY = -15 * (player.jumpPower || 1); // Reduced from -20 to -15
      player.jumping = true;
    }
  } else if (e.code === 'ArrowLeft') {
    player.velocityX = -5 * (player.speedMultiplier || 1); // Reduced from -8 to -5
  } else if (e.code === 'ArrowRight') {
    player.velocityX = 5 * (player.speedMultiplier || 1); // Reduced from 8 to 5
  } else if (e.code === 'KeyR' && gameOver.value) {
    restartGame();
  }
};

const handleKeyUp = (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
    player.velocityX = 0;
  }
};

const restartGame = () => {
  // Reset game state
  score.value = 0;
  lives.value = 3;
  currentLevel.value = 1;
  player.jumpPower = 1;
  player.speedMultiplier = 1;
  player.hasShield = false;
  gameOver.value = false;
  setupLevel(currentLevel.value);
};

// Cleanup
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
});
</script>

<style scoped>
.game-container {
  display: flex;
  margin-top: 2%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: relative;
}

.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 800px;
}

.game-instructions {
  background-color: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  width: 100%;
}

.game-instructions h1 {
  color: #2196F3;
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 2rem;
}

.instructions-content {
  margin-bottom: 2rem;
}

.instructions-content h2 {
  color: #333;
  border-bottom: 2px solid #2196F3;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.instructions-content ul {
  padding-left: 1.5rem;
}

.instructions-content li {
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.instructions-content ul ul {
  margin-top: 0.5rem;
}

kbd {
  background-color: #f1f1f1;
  border: 1px solid #ccc;
  border-radius: 3px;
  box-shadow: 0 1px 0 rgba(0,0,0,0.2);
  color: #333;
  display: inline-block;
  font-size: 0.85rem;
  font-family: monospace;
  padding: 2px 5px;
  margin: 0 3px;
}

.shop {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  padding: 2rem;
  border-radius: 10px;
  color: white;
  text-align: center;
  z-index: 1000;
}

.buff-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 2rem 0;
}

.buff-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 8px;
}

.buff-item button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  margin-top: 0.5rem;
  cursor: pointer;
}

.buff-item button:disabled {
  background: #666;
  cursor: not-allowed;
}

.proceed-button {
  background: #2196F3;
  color: white;
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

canvas {
  border: 2px solid black;
  background-color: white;
}

.game-info {
  display: flex;
  width: 95%;
  justify-content: space-between;
  padding: 1.5%;
  background-color: #f5f5f5;
  border: 0.5% solid #ddd;
  margin-top: 2%;
  margin-left: 1%;
}

.game-info p {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
}

.game-over {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}

.game-over button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 10px;
}

.name-input {
  text-align: center;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
  width: 100%;
  margin-top: 1rem;
}

.name-input input {
  padding: 10px;
  font-size: 16px;
  width: 100%;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.name-input button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}
</style>