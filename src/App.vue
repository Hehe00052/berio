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
  <div v-else class="name-input">
    <h2>Enter your name:</h2>
    <input v-model="playerName" @keyup.enter="startGame" placeholder="Player" />
    <button @click="startGame">Start Game</button>
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
const maxLevels = 3;
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

// Trong hàm setupLevel, giảm tốc độ enemies
const setupLevel = (level) => {
  // Reset entities
  enemies.value = [];
  coins.value = [];

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

  // Generate enemies based on level
  const numEnemies = level * 3;
  const safeZoneX = 150;
  const safeZoneY = 80;

  for (let i = 0; i < numEnemies; i++) {
    let x, y;

    // Find a safe position away from the player's spawn
    do {
      x = Math.floor(Math.random() * (SCREEN_WIDTH - 30));
      y = Math.floor(Math.random() * (SCREEN_HEIGHT - 30 - safeZoneY)) + safeZoneY;
    } while (
      x >= player.initialX - safeZoneX &&
      x <= player.initialX + safeZoneX &&
      y >= player.initialY - safeZoneX &&
      y <= player.initialY + safeZoneX
    );

    enemies.value.push({
      x,
      y,
      width: 30,
      height: 30,
      velocityX: Math.random() < 0.5 ? -1 : 1, // Giảm từ -2/2 xuống -1/1
      velocityY: Math.random() < 0.5 ? -1 : 1  // Giảm từ -2/2 xuống -1/1
    });
  }
  player.speedMultiplier = 1;
  player.hasShield = false;
  // Giữ nguyên jumpPower giữa các màn
};

// In the update() function, remove the duplicate level completion check:
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

  // Check level completion (keep only this one, remove the duplicate below)
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

// Fix the proceedToNextLevel function:
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

  if (player.hasShield && currentLevel.value === 1) {
    player.invulnerable = true;
    setTimeout(() => {
      player.invulnerable = false;
      player.hasShield = false;
    }, 10000);
  }
};

const purchaseBuff = (buff) => {
  if (score.value >= buff.cost) {
    score.value -= buff.cost;
    applyBuff(buff);
  }
};


// Thêm hàm áp dụng buff
const applyBuff = (buff) => {
  switch (buff.type) {
    case 'life':
      lives.value++;
      break;
    case 'jump':
      player.jumpPower = 1.25; // Tăng 25%
      break;
    case 'speed':
      player.speedMultiplier = 1.2; // Tăng 20%
      break;
    case 'shield':
      player.hasShield = true;
      break;
  }
};

const updateEnemies = () => {
  for (const enemy of enemies.value) {
    enemy.x += enemy.velocityX;
    enemy.y += enemy.velocityY;

    // Bounce off walls
    if (enemy.x <= 0 || enemy.x + enemy.width >= SCREEN_WIDTH) {
      enemy.velocityX *= -1;
    }

    if (enemy.y <= 80 || enemy.y + enemy.height >= SCREEN_HEIGHT) {
      enemy.velocityY *= -1;
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
      score.value += coin.value; // Sử dụng giá trị random của coin
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
      value: Math.floor(Math.random() * 15) + 5 // 5-20 điểm mỗi coin
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
      player.velocityY = -15 * (player.jumpPower || 1); // Giảm từ -20 xuống -15
      player.jumping = true;
    }
  } else if (e.code === 'ArrowLeft') {
    player.velocityX = -5 * (player.speedMultiplier || 1); // Giảm từ -8 xuống -5
  } else if (e.code === 'ArrowRight') {
    player.velocityX = 5 * (player.speedMultiplier || 1); // Giảm từ 8 xuống 5
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
  gameOver.value = false;
  setupLevel(currentLevel.value);
};

// Cleanup
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
  position: relative;
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
  width: 800px;
  justify-content: space-between;
  padding: 10px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  margin-top: 10px;
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
  width: 400px;
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