import { useState, useRef, useCallback, memo } from 'react';
import type { Player, CompetitionConfig } from '../types';
import './PlayerInput.css';

// --- PlayerCard (memoized) ---

interface PlayerCardProps {
  player: Player;
  playerIndex: number;
  config: CompetitionConfig;
  onScoreChange: (playerId: string, holeIndex: number, score: number) => void;
  onNameChange: (playerId: string, name: string) => void;
  onRemove: (playerId: string) => void;
  registerInputRef: (playerIndex: number, holeIndex: number, el: HTMLInputElement | null) => void;
  onNavigate: (playerIndex: number, holeIndex: number) => void;
}

const PlayerCard = memo(function PlayerCard({
  player, playerIndex, config,
  onScoreChange, onNameChange, onRemove,
  registerInputRef, onNavigate
}: PlayerCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    holeIndex: number
  ) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      const nextHole = holeIndex + 1;
      if (nextHole < 18) {
        onNavigate(playerIndex, nextHole);
      } else {
        onNavigate(playerIndex + 1, 0);
      }
    }
  };

  const outTotal = player.scores.slice(0, 9).reduce((sum, s) => sum + s, 0);
  const inTotal = player.scores.slice(9, 18).reduce((sum, s) => sum + s, 0);
  const total = outTotal + inTotal;

  return (
    <div className="player-card">
      <div className="player-header">
        {isEditing ? (
          <input
            type="text"
            value={player.name}
            onChange={e => onNameChange(player.id, e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={e => e.key === 'Enter' && setIsEditing(false)}
            autoFocus
            className="player-name-edit"
          />
        ) : (
          <span
            className="player-name"
            onClick={() => setIsEditing(true)}
          >
            {player.name}
          </span>
        )}
        <button
          onClick={() => onRemove(player.id)}
          className="btn-remove"
          aria-label="削除"
        >
          ×
        </button>
      </div>

      {/* Score input grid */}
      <div className="score-grid">
        {/* OUT (holes 1-9) */}
        <div className="score-section">
          <div className="score-row header">
            <span className="section-label">OUT</span>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(h => (
              <span
                key={h}
                className={`hole-number ${config.hiddenHoles.includes(h - 1) ? 'hidden-hole' : ''}`}
              >
                {h}
              </span>
            ))}
            <span className="total-label">計</span>
          </div>
          <div className="score-row par">
            <span className="section-label">Par</span>
            {config.par.slice(0, 9).map((p, i) => (
              <span key={i} className="par-value">{p}</span>
            ))}
            <span className="total-value">{config.par.slice(0, 9).reduce((a, b) => a + b, 0)}</span>
          </div>
          <div className="score-row scores">
            <span className="section-label">打</span>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <input
                key={i}
                ref={el => { registerInputRef(playerIndex, i, el); }}
                type="number"
                min="1"
                max="15"
                value={player.scores[i] || ''}
                onChange={e => onScoreChange(player.id, i, parseInt(e.target.value) || 0)}
                onKeyDown={e => handleKeyDown(e, i)}
                className={`score-input ${config.hiddenHoles.includes(i) ? 'hidden-hole' : ''}`}
                inputMode="numeric"
              />
            ))}
            <span className="total-value">{outTotal || '-'}</span>
          </div>
        </div>

        {/* IN (holes 10-18) */}
        <div className="score-section">
          <div className="score-row header">
            <span className="section-label">IN</span>
            {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => (
              <span
                key={h}
                className={`hole-number ${config.hiddenHoles.includes(h - 1) ? 'hidden-hole' : ''}`}
              >
                {h}
              </span>
            ))}
            <span className="total-label">計</span>
          </div>
          <div className="score-row par">
            <span className="section-label">Par</span>
            {config.par.slice(9, 18).map((p, i) => (
              <span key={i} className="par-value">{p}</span>
            ))}
            <span className="total-value">{config.par.slice(9, 18).reduce((a, b) => a + b, 0)}</span>
          </div>
          <div className="score-row scores">
            <span className="section-label">打</span>
            {[9, 10, 11, 12, 13, 14, 15, 16, 17].map(i => (
              <input
                key={i}
                ref={el => { registerInputRef(playerIndex, i, el); }}
                type="number"
                min="1"
                max="15"
                value={player.scores[i] || ''}
                onChange={e => onScoreChange(player.id, i, parseInt(e.target.value) || 0)}
                onKeyDown={e => handleKeyDown(e, i)}
                className={`score-input ${config.hiddenHoles.includes(i) ? 'hidden-hole' : ''}`}
                inputMode="numeric"
              />
            ))}
            <span className="total-value">{inTotal || '-'}</span>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="player-total">
        <span>TOTAL:</span>
        <span className="total-score">{total || '-'}</span>
      </div>
    </div>
  );
});

// --- PlayerInput (parent) ---

interface PlayerInputProps {
  players: Player[];
  config: CompetitionConfig;
  onPlayersChange: (players: Player[]) => void;
}

export function PlayerInput({ players, config, onPlayersChange }: PlayerInputProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const playersRef = useRef(players);
  playersRef.current = players;

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;

    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      name: newPlayerName.trim(),
      scores: Array(18).fill(0)
    };

    onPlayersChange([...players, newPlayer]);
    setNewPlayerName('');
  };

  const handleScoreChange = useCallback((playerId: string, holeIndex: number, score: number) => {
    const updatedPlayers = playersRef.current.map(p => {
      if (p.id === playerId) {
        const newScores = [...p.scores];
        newScores[holeIndex] = score;
        return { ...p, scores: newScores };
      }
      return p;
    });
    onPlayersChange(updatedPlayers);
  }, [onPlayersChange]);

  const handleNameChange = useCallback((playerId: string, name: string) => {
    const updatedPlayers = playersRef.current.map(p => {
      if (p.id === playerId) {
        return { ...p, name };
      }
      return p;
    });
    onPlayersChange(updatedPlayers);
  }, [onPlayersChange]);

  const handleRemovePlayer = useCallback((playerId: string) => {
    onPlayersChange(playersRef.current.filter(p => p.id !== playerId));
  }, [onPlayersChange]);

  const registerInputRef = useCallback((playerIndex: number, holeIndex: number, el: HTMLInputElement | null) => {
    if (!inputRefs.current[playerIndex]) {
      inputRefs.current[playerIndex] = [];
    }
    inputRefs.current[playerIndex][holeIndex] = el;
  }, []);

  const handleNavigate = useCallback((playerIndex: number, holeIndex: number) => {
    inputRefs.current[playerIndex]?.[holeIndex]?.focus();
  }, []);

  return (
    <div className="player-input">
      <h2>プレイヤー・スコア入力</h2>

      {/* Add player form */}
      <div className="add-player-form">
        <input
          type="text"
          placeholder="プレイヤー名を入力"
          value={newPlayerName}
          onChange={e => setNewPlayerName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
          className="player-name-input"
        />
        <button onClick={handleAddPlayer} className="btn-add">
          追加
        </button>
      </div>

      {/* Player list with scores */}
      {players.length > 0 && (
        <div className="players-list">
          {players.map((player, playerIndex) => (
            <PlayerCard
              key={player.id}
              player={player}
              playerIndex={playerIndex}
              config={config}
              onScoreChange={handleScoreChange}
              onNameChange={handleNameChange}
              onRemove={handleRemovePlayer}
              registerInputRef={registerInputRef}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      )}

      {players.length === 0 && (
        <p className="no-players">プレイヤーを追加してください</p>
      )}
    </div>
  );
}
