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
  const numEnemies = level * 5;
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
      velocityX: Math.random() < 0.5 ? -2 : 2,
      velocityY: Math.random() < 0.5 ? -2 : 2
    });
  }
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
  
  // Check level completion
  if (enemies.value.length === 0) {
    if (currentLevel.value < maxLevels) {
      currentLevel.value++;
      setupLevel(currentLevel.value);
    } else {
      gameOver.value = true;
      gameOverMessage.value = 'You Win! Click to play again';
    }
  }
  
  // Update effects
  if (screenShake.value > 0) screenShake.value--;
  if (deathEffect.value > 0) deathEffect.value--;
};

const updatePlayer = () => {
  // Apply gravity
  player.velocityY += 0.5;
  
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
      score.value += 10;
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
  for (let i = 0; i < 3; i++) {
    coins.value.push({
      x: enemy.x + Math.random() * 20 - 10,
      y: enemy.y + Math.random() * 20 - 10,
      width: 15,
      height: 15,
      velocityY: -10,
      velocityX: 0
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
      player.velocityY = -20;
      player.jumping = true;
    }
  } else if (e.code === 'ArrowLeft') {
    player.velocityX = -8;
  } else if (e.code === 'ArrowRight') {
    player.velocityX = 8;
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
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
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