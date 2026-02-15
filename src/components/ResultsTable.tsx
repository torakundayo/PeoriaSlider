import { useMemo, useState, useRef } from 'react';
import type { CalculationResult } from '../types';
import { getBoobyRank } from '../utils/calculation';
import './ResultsTable.css';

interface ResultsTableProps {
  results: CalculationResult[];
  onSave: (name: string) => void;
}

export function ResultsTable({ results, onSave }: ResultsTableProps) {
  const [saveName, setSaveName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const boobyRank = useMemo(() => getBoobyRank(results), [results]);
  const lastRank = useMemo(() => {
    if (results.length === 0) return null;
    return Math.max(...results.map(r => r.rank));
  }, [results]);

  const getRankClass = (rank: number): string => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    if (rank === boobyRank) return 'rank-booby';
    if (rank === lastRank) return 'rank-last';
    return '';
  };

  const getRankBadge = (rank: number): string | null => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank === boobyRank) return 'BB';
    if (rank === lastRank) return '💀';
    return null;
  };

  const getRankChange = (result: CalculationResult): 'up' | 'down' | 'same' | null => {
    if (result.previousRank === undefined) return null;
    if (result.rank < result.previousRank) return 'up';
    if (result.rank > result.previousRank) return 'down';
    return 'same';
  };

  const handleSave = () => {
    const name = saveName.trim();
    if (!name) return;

    onSave(name);
    setSaveName('');
    setSaveStatus('saved');

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
  };

  if (results.length === 0) {
    return (
      <div className="results-table">
        <h2>順位表</h2>
        <p className="no-results">スコアを入力すると順位が表示されます</p>
      </div>
    );
  }

  return (
    <div className="results-table">
      <h2>順位表</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="col-rank">順位</th>
              <th className="col-name">名前</th>
              <th className="col-gross">Gross</th>
              <th className="col-hdcp">HDCP</th>
              <th className="col-net">Net</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => {
              const rankClass = getRankClass(result.rank);
              const badge = getRankBadge(result.rank);
              const rankChange = getRankChange(result);

              return (
                <tr
                  key={result.playerId}
                  className={`result-row ${rankClass}`}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <td className="col-rank">
                    <div className="rank-cell">
                      <span className="rank-number">{result.rank}</span>
                      {badge && <span className="rank-badge">{badge}</span>}
                      {rankChange && rankChange !== 'same' && (
                        <span className={`rank-change ${rankChange}`}>
                          {rankChange === 'up' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="col-name">{result.playerName}</td>
                  <td className="col-gross">{result.gross}</td>
                  <td className="col-hdcp">{result.hdcp.toFixed(1)}</td>
                  <td className="col-net">{result.net.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="legend">
        <span className="legend-item rank-1">🥇 優勝</span>
        <span className="legend-item rank-2">🥈 2位</span>
        <span className="legend-item rank-3">🥉 3位</span>
        <span className="legend-item rank-booby">BB ブービー</span>
      </div>

      {/* Save section */}
      <div className="save-section">
        <div className="save-form">
          <input
            type="text"
            placeholder="例: 2026年2月 月例会"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="save-name-input"
            disabled={saveStatus === 'saved'}
          />
          <button
            onClick={handleSave}
            className={`btn-save ${saveStatus === 'saved' ? 'saved' : ''}`}
            disabled={saveStatus === 'saved' || !saveName.trim()}
          >
            {saveStatus === 'saved' ? '保存しました' : '履歴に保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
