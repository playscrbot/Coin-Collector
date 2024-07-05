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

// Define a function to handle the voice commands
const useVoiceCommands = (commands, onCommand) => {
  useEffect(() => {
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.trim().toLowerCase();
          if (commands[transcript]) {
            onCommand(transcript);
          }
        }
      }
    };

    recognition.start();

    return () => recognition.stop();
  }, [commands, onCommand]);
};

const CoinCollector = () => {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const [gamePaused, setGamePaused] = useState(false);
  const pauseButtonRef = useRef({ x: 300, y: 10, width: 30, height: 30 });
  const [gameOver, setGameOver] = useState(false);
  const winningScore = 100;

  // Player properties
  const playerSize = 20;
  const playerPosition = useRef({ x: 50, y: 50, touchStartX: 0, touchStartY: 0 });

  // Score Properties
  const enemyScoreRef = useRef(0);
  const scoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const [enemyScore, setEnemyScore] = useState(0);

  // Coin Properties
  const coins = useRef([]);
  const numCoins = 10;
  const coinSize = 10;
  const particles = useRef([]);

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

  // Obstacles properties 
  const obstacleSize = 30;
  const numObstacles = 5;
  const obstacles = useRef([]);

  // Enemy properties
  const enemies = useRef([]);
  const enemySize = 20;
  const enemySpeed = 0.5;
  const detectionRange = 50;
  
  const spawnInterval = 3000; // Time in milliseconds between spawns (1000ms = 1 second)
  let lastSpawnTime = Date.now();

  // Power-ups property
  const [powerUps, setPowerUps] = useState({
    magnet: { active: false, duration: 5000 },
    shield: { active: false, duration: 5000 }
  });

  // Interactive objects: Trees, Animated clouds
  const treeSize = 50;
  const trees = [
    { x: 100, y: 150 },
    { x: 250, y: 300 }
  ];
  const clouds = [
    { x: 50, y: 50, speed: 1 },
    { x: 200, y: 100, speed: 0.5 }
  ];

  // Day-night cycle
  const [isDay, setIsDay] = useState(true);

  useEffect(() => {
    // Switch to night after 25 seconds
    const dayNightTimer = setTimeout(() => {
      setIsDay(false);
    }, 25000);

    // Switch back to day after another 25 seconds
    const returnDayTimer = setTimeout(() => {
      setIsDay(true);
    }, 50000);

    // Cleanup timers
    return () => {
      clearTimeout(dayNightTimer);
      clearTimeout(returnDayTimer);
    };
  }, []);
  
  // Use useCallback to generate things
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

  // Function to activate a power-up
  const activatePowerUp = useCallback((powerUpName) => {
    setPowerUps(prev => ({
      ...prev,
      [powerUpName]: { ...prev[powerUpName], active: true }
    }));
    setTimeout(() => {
      setPowerUps(prev => ({
        ...prev,
        [powerUpName]: { ...prev[powerUpName], active: false }
      }));
    }, powerUps[powerUpName].duration);
  }, [powerUps]);

  // Voice command handlers
  const handleVoiceCommand = useCallback((command) => {
    if (command === 'attract' && !powerUps.magnet.active) {
      activatePowerUp('magnet');
    } else if (command === 'protect' && !powerUps.shield.active) {
      activatePowerUp('shield');
    }
  }, [activatePowerUp, powerUps]);

  // Use the custom hook to listen for voice commands
  useVoiceCommands({
    'attract': () => activatePowerUp('magnet'),
    'protect': () => activatePowerUp('shield')
  }, handleVoiceCommand);

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
      ctx.fillStyle = isDay ? 'black' : 'gray';
      obstacles.current.forEach(obstacle => {
        ctx.fillRect(obstacle.x, obstacle.y, obstacleSize, obstacleSize);
      });
    }

    function drawTrees() {
      trees.forEach(tree => {
        ctx.fillStyle = isDay ? 'brown' : '#8b4513';
        ctx.fillRect(tree.x, tree.y, treeSize, treeSize);
      });
    }

    function drawClouds() {
      clouds.forEach(cloud => {
        // Draw the 1st circle
        ctx.fillStyle = isDay ? 'gray' : 'white';
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, 20, 0, Math.PI * 2);
        ctx.closePath();
        
        ctx.fillStyle = '#f0f0f0';
        ctx.fill();

        // Draw the 2nd circle
        ctx.beginPath();
        ctx.arc(cloud.x + 10, cloud.y, 20, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        // Draw the 3rd circle
        ctx.beginPath();
        ctx.arc(cloud.x + 20, cloud.y, 20, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        // Draw curves connecting the circles to form the cloud shape
        ctx.beginPath();
        ctx.moveTo(cloud.x, cloud.y);
        ctx.bezierCurveTo(cloud.x - 10, cloud.y - 10, cloud.x - 20, cloud.y - 20, cloud.x + 20, cloud.y - 20);
        ctx.bezierCurveTo(cloud.x + 30, cloud.y - 10, cloud.x + 40, cloud.y, cloud.x + 40, cloud.y);
        
        ctx.closePath();
        ctx.fill();
      });
    }

    function updateClouds() {
      clouds.forEach(cloud => {
        cloud.x += cloud.speed;

        if (cloud.x > canvas.width) {
          cloud.x = -20; // Reset cloud position
        }
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

    // Warn player when enemies are about to win
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
      drawTrees();
      drawClouds();
      updateClouds();
      updateParticles();
      drawParticles();
      drawPauseButton();
      checkEnemyScore();

      const currentTime = Date.now();

      // Check if it's time to spawn a new enemy
      if (currentTime - lastSpawnTime >= spawnInterval) {
        spawnEnemies();
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

      // Shield power-up logic
      if (powerUps.shield.active) {
        // Temporarily increase the player size to simulate a shield
        const shieldedPlayerSize = playerSize * 1.5;

        obstacles.current.forEach(obstacle => {
          if (checkCollision(playerPosition.current, obstacle, shieldedPlayerSize, obstacleSize)) {
            // Bounce the player back slightly to indicate a collision
            playerPosition.current.x -= dx * 0.1;
            playerPosition.current.y -= dy * 0.1;
          }
        });
      }

      // Magnet power-up logic
      if (powerUps.magnet.active) {
        coins.current.forEach(coin => {
          const dx = playerPosition.current.x - coin.x;
          const dy = playerPosition.current.y - coin.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < detectionRange) {
            const attractionStrength = 0.05; // Adjust as needed
            coin.x += dx * attractionStrength;
            coin.y += dy * attractionStrength;
          }
        });
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

    // Add click or touch event listener to interact with trees
    function handleTreeInteraction(e) {
      const rect = canvas.getBoundingClientRect();
      const touchX = e.clientX - rect.left;
      const touchY = e.clientY - rect.top;

      // Make sure the tree is clicked, if clicked, let the leaves fall from the tree
      trees.forEach(tree => {
        if (
          touchX >= tree.x &&
          touchX <= tree.x + treeSize &&
          touchY >= tree.y &&
          touchY <= tree.y + treeSize
        ) {
          // Let the leaves fall out
        }
      });
    };

    canvas.addEventListener('touchstart', handleTouchStart, handleTreeInteraction, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    gameLoop();

    // Cleanup event listeners on unmount
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [generateCoins, generateObstacles, checkCollision, isDay]);

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
    leaves.current = generateLeaves();

    // Optionally, reset the player's position and other states
    playerPosition.current = { x: 50, y: 50, touchStartX: 0, touchStartY: 0 };
  }

  return (
    <div className={`coin-collector ${isDay ? '' : 'night-theme'}`}>
      {gamePaused && <PauseMenu onResume={handleResume} onMainMenu={handleMainMenu} onRestart={handleRestart} />}
      <canvas
        ref={canvasRef}
        width={340}
        height={430}
        style={{ border: '1px solid black' }}
      />
      {!gamePaused && <p className="game-message">Score: {score} | Enemy Score: {enemyScore}</p>}
    </div>
  );
};

export default CoinCollector;