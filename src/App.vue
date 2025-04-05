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

<script>
export default {
  name: 'MarioGame',
  data() {
    return {
      gameStarted: false,
      playerName: 'Player',
      canvas: null,
      ctx: null,
      gameOver: false,
      gameOverMessage: '',
      score: 0,
      lives: 3,
      currentLevel: 1,
      maxLevels: 3,
      screenShake: 0,
      deathEffect: 0,
      
      // Game entities
      player: null,
      enemies: [],
      coins: [],
      
      // Game loop
      animationFrameId: null,
      lastTime: 0,
      
      // Constants
      SCREEN_WIDTH: 800,
      SCREEN_HEIGHT: 600,
      COLORS: {
        WHITE: '#FFFFFF',
        BLUE: '#0000FF',
        RED: '#FF0000',
        BLACK: '#000000',
        GOLD: '#FFD700'
      }
    }
  },
  
  methods: {
    startGame() {
      this.gameStarted = true;
      this.$nextTick(() => {
        this.initGame();
      });
    },
    
    initGame() {
      this.canvas = this.$refs.gameCanvas;
      this.ctx = this.canvas.getContext('2d');
      
      this.score = 0;
      this.lives = 3;
      this.currentLevel = 1;
      this.gameOver = false;
      
      this.setupLevel(this.currentLevel);
      this.gameLoop();
      
      // Setup keyboard controls
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
    },
    
    setupLevel(level) {
      // Reset entities
      this.enemies = [];
      this.coins = [];
      
      // Reset player
      this.player = {
        name: this.playerName,
        width: 30,
        height: 60,
        x: 50,
        y: this.SCREEN_HEIGHT - 120,
        initialX: 50,
        initialY: this.SCREEN_HEIGHT - 120,
        velocityX: 0,
        velocityY: 0,
        jumping: false,
        invulnerable: false,
        invulnerableTimer: 0
      };
      
      // Generate enemies based on level
      const numEnemies = level * 5;
      const safeZoneX = 150;
      const safeZoneY = 80;
      
      for (let i = 0; i < numEnemies; i++) {
        let x, y;
        
        // Find a safe position away from the player's spawn
        do {
          x = Math.floor(Math.random() * (this.SCREEN_WIDTH - 30));
          y = Math.floor(Math.random() * (this.SCREEN_HEIGHT - 30 - safeZoneY)) + safeZoneY;
        } while (
          x >= this.player.initialX - safeZoneX && 
          x <= this.player.initialX + safeZoneX &&
          y >= this.player.initialY - safeZoneX && 
          y <= this.player.initialY + safeZoneX
        );
        
        this.enemies.push({
          x,
          y,
          width: 30,
          height: 30,
          velocityX: Math.random() < 0.5 ? -2 : 2,
          velocityY: Math.random() < 0.5 ? -2 : 2
        });
      }
    },
    
    gameLoop(timestamp) {
      if (!this.lastTime) this.lastTime = timestamp;
      const deltaTime = timestamp - this.lastTime;
      this.lastTime = timestamp;
      
      if (!this.gameOver) {
        this.update(deltaTime);
        this.render();
      }
      
      this.animationFrameId = requestAnimationFrame(this.gameLoop);
    },
    
    update() {
      const oldY = this.player.y;
      
      // Update player
      this.updatePlayer();
      
      // Update enemies
      this.updateEnemies();
      
      // Update coins
      this.updateCoins();
      
      // Check collisions
      this.checkCollisions(oldY);
      
      // Check level completion
      if (this.enemies.length === 0) {
        if (this.currentLevel < this.maxLevels) {
          this.currentLevel++;
          this.setupLevel(this.currentLevel);
        } else {
          this.gameOver = true;
          this.gameOverMessage = 'You Win! Click to play again';
        }
      }
      
      // Update effects
      if (this.screenShake > 0) this.screenShake--;
      if (this.deathEffect > 0) this.deathEffect--;
    },
    
    updatePlayer() {
      // Apply gravity
      this.player.velocityY += 0.5;
      
      // Apply velocity
      this.player.y += this.player.velocityY;
      this.player.x += this.player.velocityX;
      
      // Check boundaries
      if (this.player.y + this.player.height > this.SCREEN_HEIGHT) {
        this.player.y = this.SCREEN_HEIGHT - this.player.height;
        this.player.jumping = false;
        this.player.velocityY = 0;
      }
      
      if (this.player.y < 0) {
        this.player.y = 0;
        this.player.velocityY = 0;
      }
      
      if (this.player.x < 0) {
        this.player.x = 0;
      }
      
      if (this.player.x + this.player.width > this.SCREEN_WIDTH) {
        this.player.x = this.SCREEN_WIDTH - this.player.width;
      }
      
      // Update invulnerability
      if (this.player.invulnerable) {
        this.player.invulnerableTimer++;
        if (this.player.invulnerableTimer > 60) {
          this.player.invulnerable = false;
          this.player.invulnerableTimer = 0;
        }
      }
    },
    
    updateEnemies() {
      for (const enemy of this.enemies) {
        enemy.x += enemy.velocityX;
        enemy.y += enemy.velocityY;
        
        // Bounce off walls
        if (enemy.x <= 0 || enemy.x + enemy.width >= this.SCREEN_WIDTH) {
          enemy.velocityX *= -1;
        }
        
        if (enemy.y <= 80 || enemy.y + enemy.height >= this.SCREEN_HEIGHT) {
          enemy.velocityY *= -1;
        }
      }
    },
    
    updateCoins() {
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i];
        
        // Apply gravity
        coin.velocityY += 0.5;
        coin.y += coin.velocityY;
        
        // Check floor
        if (coin.y + coin.height > this.SCREEN_HEIGHT) {
          coin.y = this.SCREEN_HEIGHT - coin.height;
          coin.velocityY = 0;
        }
      }
    },
    
    checkCollisions(oldY) {
      // Check coin collisions
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i];
        if (this.checkRectCollision(this.player, coin)) {
          this.coins.splice(i, 1);
          this.score += 10;
        }
      }
      
      // Check enemy collisions
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (this.checkRectCollision(this.player, enemy)) {
          // Check if player is jumping on enemy
          if (oldY + this.player.height <= enemy.y + 10 && 
              this.player.y + this.player.height >= enemy.y) {
            // Convert enemy to coins
            this.convertEnemyToCoins(enemy);
            this.enemies.splice(i, 1);
            this.player.velocityY = -10; // Bounce up
          } else if (!this.player.invulnerable) {
            // Player hit by enemy
            this.playerDie();
          }
        }
      }
    },
    
    convertEnemyToCoins(enemy) {
      for (let i = 0; i < 3; i++) {
        this.coins.push({
          x: enemy.x + Math.random() * 20 - 10,
          y: enemy.y + Math.random() * 20 - 10,
          width: 15,
          height: 15,
          velocityY: -10,
          velocityX: 0
        });
      }
    },
    
    playerDie() {
      this.lives--;
      this.player.x = this.player.initialX;
      this.player.y = this.player.initialY;
      this.player.invulnerable = true;
      this.screenShake = 30;
      this.deathEffect = 60;
      
      if (this.lives <= 0) {
        this.gameOver = true;
        this.gameOverMessage = 'Game Over! Click to restart';
      }
    },
    
    render() {
      // Clear canvas
      if (this.deathEffect > 0) {
        this.ctx.fillStyle = this.COLORS.RED;
        this.ctx.fillRect(0, 0, this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
      } else {
        this.ctx.fillStyle = this.COLORS.WHITE;
        this.ctx.fillRect(0, 0, this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
      }
      
      // Apply screen shake
      if (this.screenShake > 0) {
        const offsetX = Math.floor(Math.random() * 10 - 5);
        const offsetY = Math.floor(Math.random() * 10 - 5);
        this.ctx.save();
        this.ctx.translate(offsetX, offsetY);
      }
      
      // Draw player - blinking when invulnerable
      if (!this.player.invulnerable || Math.floor(Date.now() / 100) % 2) {
        this.ctx.fillStyle = this.COLORS.BLUE;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
      }
      
      // Draw enemies
      this.ctx.fillStyle = this.COLORS.RED;
      for (const enemy of this.enemies) {
        this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
      
      // Draw coins
      this.ctx.fillStyle = this.COLORS.GOLD;
      for (const coin of this.coins) {
        this.ctx.fillRect(coin.x, coin.y, coin.width, coin.height);
      }
      
      // Reset transform if screen shake was applied
      if (this.screenShake > 0) {
        this.ctx.restore();
      }
    },
    
    checkRectCollision(rectA, rectB) {
      return (
        rectA.x < rectB.x + rectB.width &&
        rectA.x + rectA.width > rectB.x &&
        rectA.y < rectB.y + rectB.height &&
        rectA.y + rectA.height > rectB.y
      );
    },
    
    handleKeyDown(e) {
      if (e.code === 'Space') {
        if (!this.player.jumping) {
          this.player.velocityY = -20;
          this.player.jumping = true;
        }
      } else if (e.code === 'ArrowLeft') {
        this.player.velocityX = -8;
      } else if (e.code === 'ArrowRight') {
        this.player.velocityX = 8;
      } else if (e.code === 'KeyR' && this.gameOver) {
        this.restartGame();
      }
    },
    
    handleKeyUp(e) {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        this.player.velocityX = 0;
      }
    },
    
    restartGame() {
      // Reset game state
      this.score = 0;
      this.lives = 3;
      this.currentLevel = 1;
      this.gameOver = false;
      this.setupLevel(this.currentLevel);
    }
  },
  
  beforeUnmount() {
    // Clean up event listeners
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    cancelAnimationFrame(this.animationFrameId);
  }
}
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