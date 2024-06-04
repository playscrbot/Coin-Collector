import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

const PauseMenu = ({ onResume, onMainMenu, onRestart }) => (
  <div className="pause-menu">
    <button onClick={onResume}>Resume</button>
    <button onClick={onMainMenu}>Main Menu</button>
    <button onClick={onRestart}>Restart</button>
  </div>
);

const CoinCollector = () => {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const playerPosition = useRef({ x: 50, y: 50, touchStartX: 0, touchStartY: 0 });
  const scoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const [enemyScore, setEnemyScore] = useState(0);
  const [gamePaused, setGamePaused] = useState(false);
  const pauseButtonRef = useRef({ x: 300, y: 10, width: 30, height: 30 });
  const [gameOver, setGameOver] = useState(false);
  const winningScore = 100;
  const playerSize = 20;
  const numCoins = 10;
  const coinSize = 10;
  const coins = useRef([]);
  const coinTypes = [
    { 
     value: 5, 
     gradient: ctx => {
      const goldGradient = ctx.createRadialGradient(0, 0, 15, 0, 0, 30);
      goldGradient.addColorStop(0, '#ffd700'); // Bright gold
      goldGradient.addColorStop(0.5, '#ffdf00'); // Pure Gold
      goldGradient.addColorStop(1, '#ccac00'); // Dark gold color
      return goldGradient;
     },
     shadow: 'rgba(0, 0, 0, 0.5)',
     frequency: 0.1 
    }, // Rare coin
    { 
      value: 2, 
      gradient: ctx => {
        const silverGradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 20);
        silverGradient.addColorStop(0, '#c0c0c0'); // Light silver color
        silverGradient.addColorStop(0.5, '#a8a8a8'); // Silver color
        silverGradient.addColorStop(1, '#808080'); // Dark silver color
        return silverGradient;
      },
      shadow: 'rgba(128, 128, 128, 0.5)',
      frequency: 0.2 
    }, // Uncommon coin
    { 
      value: 1, 
      gradient: ctx => {
        const bronzeGradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 20);
        bronzeGradient.addColorStop(0, '#cd7f32'); // Light bronze color
        bronzeGradient.addColorStop(0.5, '#b87333'); // Bronze color
        bronzeGradient.addColorStop(1, '#8c603c'); // Dark bronze color
        return bronzeGradient;
      },
      shadow: 'rgba(140, 96, 60, 0.5)',
      frequency: 0.7 
    } // Common coin
  ];
  const obstacleSize = 30;
  const numObstacles = 5;
  const obstacles = useRef([]);
  const particles = useRef([]);

  // Enemy properties
  const enemySize = 20;
  const enemySpeed = 0.5; // Speed at which the enemy moves towards the coin
  const detectionRange = 50;
  const enemyScoreRef = useRef(0);
  const enemies = useRef([]);

  const spawnInterval = 2000; // Time in milliseconds between spawns (1000ms = 1 second)
  let lastSpawnTime = Date.now(); // Initialize the last spawn time

  const generateCoins = useCallback(() => {
    return Array.from({ length: numCoins }, () => ({
      x: Math.random() * (canvasRef.current.width - coinSize),
      y: Math.random() * (canvasRef.current.height - coinSize),
      typeIndex: Math.floor(Math.random() * coinTypes.length), // Assign a random type index
    }));
  }, [numCoins, coinSize, coinTypes]);

  const generateObstacles = useCallback(() => {
    let newObstacles = [];
    while (newObstacles.length < numObstacles) {
      let newObstacle = {
        x: Math.random() * (canvasRef.current.width - obstacleSize),
        y: Math.random() * (canvasRef.current.height - obstacleSize),
      };

      // Check for collisions with coins and other obstacles
      let collision = coins.current.some(coin => checkCollision(newObstacle, coin, obstacleSize, coinSize)) ||
                      newObstacles.some(obstacle => checkCollision(newObstacle, obstacle, obstacleSize, obstacleSize));

      if (!collision) {
        newObstacles.push(newObstacle);
      }
    }
    return newObstacles;
  }, [numObstacles, obstacleSize]);

  const checkCollision = (obj1, obj2, size1, size2) => {
    return (
      obj1.x < obj2.x + size2 &&
      obj1.x + size1 > obj2.x &&
      obj1.y < obj2.y + size2 &&
      obj1.y + size1 > obj2.y
    );
  };

  function createParticles(x, y) {
    const newParticles = Array.from({ length: 10 }, () => ({
      x: x,
      y: y,
      velocityX: (Math.random() - 0.5) * 2,
      velocityY: (Math.random() - 0.5) * 2,
      lifespan: 1000, // 1 second
      lastUpdate: Date.now()
    }));
    particles.current.push(...newParticles);
  }

  function updateEnemies() {
    enemies.current.forEach((enemy, index) => {
      let closestCoin = null;
      let closestDistance = Infinity;

      // Find the closest coin
      coins.current.forEach(coin => {
        const distance = Math.sqrt(
          Math.pow(enemy.x - coin.x, 2) + Math.pow(enemy.y - coin.y, 2));
        if (distance < closestDistance) {
          closestCoin = coin;
          closestDistance = distance;
        }
      });

      // Move enemy towards the closest coin
      if (closestCoin && closestDistance < detectionRange) {
        const directionX = closestCoin.x - enemy.x;
        const directionY = closestCoin.y - enemy.y;
        const magnitude = Math.sqrt(directionX * directionX + directionY * directionY);
        enemy.x += (directionX / magnitude) * enemySpeed;
        enemy.y += (directionY / magnitude) * enemySpeed;
      }

      // Check for collisions with other enemies
      enemies.current.forEach((otherEnemy, otherIndex) => {
        if (index !== otherIndex && checkCollision(enemy, otherEnemy, enemySize, enemySize)) {
          // Simple collision response
          enemy.x -= (Math.random() - 0.5) * 2;
          enemy.y -= (Math.random() - 0.5) * 2;
        }
      });

      // Check for collisions with obstacles
      obstacles.current.forEach(obstacle => {
        if (checkCollision(enemy, obstacle, enemySize, obstacleSize)) {
          // Simple collision response
          enemy.x -= (Math.random() - 0.5) * 2;
          enemy.y -= (Math.random() - 0.5) * 2;
        }
      });

      // Check for collisions with the player
      if (checkCollision(enemy, playerPosition.current, enemySize, playerSize)) {
        // Implement flee behavior or other response
      }

      // Collect coin if collided
      if (closestCoin && checkCollision(enemy, closestCoin, enemySize, coinSize)) {
        coins.current = coins.current.filter(coin => coin !== closestCoin);
        enemyScoreRef.current += coinTypes[closestCoin.typeIndex].value;
        createParticles(closestCoin.x, closestCoin.y);
      }
    });

    // Batch state update outside the loop
    setEnemyScore(enemyScoreRef.current);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function drawPlayer() {
      ctx.fillStyle = 'blue';
      ctx.fillRect(playerPosition.current.x, playerPosition.current.y, playerSize, playerSize);
    }

    function drawCoins() {
      coins.current.forEach((coin) => {
        const coinType = coinTypes[coin.typeIndex];
        const radius = coinSize;

        ctx.save(); // Save the current state

        // Move the context to the coin's location
        ctx.translate(coin.x + radius, coin.y + radius);

        // Set the shadow properties
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.shadowBlur = 6;
        ctx.shadowColor = coinType.shadow;

        // Create the gradient
        const gradient = coinType.gradient(ctx);

        // Draw the coin
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore(); // Restore the original state
      });
    }

    function drawObstacles() {
      ctx.fillStyle = 'black';
      obstacles.current.forEach(obstacle => {
        ctx.fillRect(obstacle.x, obstacle.y, obstacleSize, obstacleSize);
      });
    }

    function updateParticles() {
      const currentTime = Date.now();
      particles.current.forEach(particle => {
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        particle.lifespan -= currentTime - particle.lastUpdate;
        particle.lastUpdate = currentTime;
      });
      particles.current = particles.current.filter(particle => particle.lifespan > 0);
    }

    function drawParticles() {
      particles.current.forEach(particle => {
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (particle.lifespan / 1000) + ')';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // Add a new function to draw the pause button
    function drawPauseButton() {
      ctx.fillStyle = 'grey';
      ctx.fillRect(pauseButtonRef.current.x, pauseButtonRef.current.y, pauseButtonRef.current.width, pauseButtonRef.current.height);
      ctx.fillStyle = 'white';
      ctx.fillText('||', pauseButtonRef.current.x + 10, pauseButtonRef.current.y + 20);
    }

    // Enemy spawning logic
    function spawnEnemies() {
      enemies.current = Array.from({ length: 3 }, () => ({
        x: Math.random() * (canvasRef.current.width - enemySize),
        y: Math.random() * (canvasRef.current.height - enemySize),
      }));
    }

    
    function drawEnemies() {
      enemies.current.forEach(enemy => {
        ctx.fillStyle = 'red';
        ctx.fillRect(enemy.x, enemy.y, enemySize, enemySize);
      })
    }

    // Warning system when enemies are about to win
    function checkEnemyScore() {
      if (enemyScoreRef.current >= 80) {
        // Visual indication
        ctx.fillStyle = 'red';
        ctx.font = '12px Arial';
        ctx.fillText('Hurry Up!', canvas.width / 2 - 25, canvas.height / 2 - 30);
      }
    }

    function gameLoop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPlayer();
      drawCoins();
      drawEnemies();
      drawObstacles();
      updateParticles();
      drawParticles();
      drawPauseButton();
      checkEnemyScore();
      
      const currentTime = Date.now();
      
      // Check if it's time to spawn a new enemy
      if (!gamePaused && currentTime - lastSpawnTime >= spawnInterval) {
          spawnEnemies(); // Spawn a single enemy
          updateEnemies();
          lastSpawnTime = currentTime; // Update the last spawn time
      }

      // Filter out collected coins and update the score
      coins.current = coins.current.filter((coin) => {
        if (checkCollision(playerPosition.current, coin, playerSize, coinSize)) {        
          scoreRef.current += coinTypes[coin.typeIndex].value;
          setScore(scoreRef.current);
          createParticles(coin.x, coin.y);
          return false; // Coin is collected, remove it from the array
        }
        return true; // Coin is not collected, keep it
      });

      if (coins.current.length === 0) {
        coins.current = generateCoins(); // Generate new coins when all are collected
        obstacles.current = generateObstacles();
      }

      // Check for collisions with obstacles
      if (obstacles.current.some(obstacle => checkCollision(playerPosition.current, obstacle, playerSize, obstacleSize))) {
        setGameOver(true);
        ctx.fillStyle = 'black';
        ctx.font = '24px Arial';
        ctx.fillText('Game Over', canvas.width / 2 - 60, canvas.height / 2);
        ctx.fillText('Score:' + scoreRef.current, canvas.width / 2 - 50, canvas.height / 2 + 30);
        return;
      }

      if (scoreRef.current >= winningScore) {
        setGameOver(true);
        ctx.fillStyle = 'black';
        ctx.font = '24px Arial';
        ctx.fillText('You Win', canvas.width / 2 - 50, canvas.height / 2);
        return;
      }

      if (enemyScoreRef.current >= winningScore) {
        setGameOver(true);
        ctx.fillStyle = 'red';
        ctx.font = '24px Arial';
        ctx.fillText('You lost!', canvas.width / 2 - 50, canvas.height / 2);
        return;
      }

      requestAnimationFrame(gameLoop);
    }

    function handleTouchStart(e) {
      if (gamePaused) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      const touchY = e.touches[0].clientY - rect.top;
      
      // Check if the pause button is touched
      if (
        touchX >= pauseButtonRef.current.x &&
        touchX <= pauseButtonRef.current.x + pauseButtonRef.current.width &&
        touchY >= pauseButtonRef.current.y &&
        touchY <= pauseButtonRef.current.y + pauseButtonRef.current.height
      ) {
        setGamePaused(prev => !prev);
      } else {
        playerPosition.current.touchStartX = touchX;
        playerPosition.current.touchStartY = touchY;
      }
    }

    function handleTouchMove(e) {
      if (gamePaused) {
        return;
      }
      
      const rect = canvas.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      const touchY = e.touches[0].clientY - rect.top;
      const dx = touchX - playerPosition.current.touchStartX;
      const dy = touchY - playerPosition.current.touchStartY;

      playerPosition.current.x += dx;
      playerPosition.current.y += dy;

      playerPosition.current.touchStartX = touchX;
      playerPosition.current.touchStartY = touchY;
    }

    function handleTouchEnd() {
      // Touch end logic can be added here if needed
      console.log('Touch end event processed!');
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    gameLoop();

    // Cleanup event listeners on unmount
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [generateCoins, generateObstacles, checkCollision]);

  const handleResume = () => {
    setGamePaused(false);
  };

  const handleMainMenu = () => {
    setGameOver(false);
    setGamePaused(false);
    navigate('/');
  };

  const handleRestart = () => {
    scoreRef.current = 0;
    setScore(0);
    enemyScoreRef.current = 0;
    setEnemyScore(0);

    setGameOver(false);
    setGamePaused(false);

    coins.current = generateCoins();
    obstacles.current = generateObstacles();

    // Optionally, reset the player's position and other states
    playerPosition.current = { x: 50, y: 50, touchStartX: 0, touchStartY: 0 };
  }

  return (
    <>
      {gamePaused && <PauseMenu onResume={handleResume} onMainMenu={handleMainMenu} onRestart={handleRestart} />}
      <canvas
        ref={canvasRef}
        width={340}
        height={430}
        style={{ border: '1px solid black' }}
      />
      {!gamePaused && <p className="game-message">Score: {score} | Enemy Score: {enemyScore}</p>}
    </>
  );
};

export default CoinCollector;