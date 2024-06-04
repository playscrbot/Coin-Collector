import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import CoinCollector from './CoinCollector';
import './App.css';

const StartScreen = () => {
  const navigate = useNavigate();
  const handleStart = () => {
    navigate('/game');
  };

  return (
    <>
      <div className="start-screen">
        <h1>Coin Collector</h1>
        <button onClick={handleStart}>Start Game</button>
      </div>
    </>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/game" element={<CoinCollector />} />
      </Routes>
    </Router>
  );
};

export default App;