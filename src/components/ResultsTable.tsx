import { useMemo, useState, useRef, useCallback } from 'react';
import type { CalculationResult } from '../types';
import { getBoobyRank } from '../utils/calculation';
import './ResultsTable.css';

function formatResultsText(results: CalculationResult[], boobyRank: number | null): string {
  const lines = results.map(r => {
    let badge = '';
    if (r.rank === 1) badge = '🥇';
    else if (r.rank === 2) badge = '🥈';
    else if (r.rank === 3) badge = '🥉';
    else if (r.rank === boobyRank) badge = '🎯';
    return `${badge}${r.rank}位 ${r.playerName}  Net ${r.net.toFixed(1)} (G:${r.gross} H:${r.hdcp.toFixed(1)})`;
  });

  return `⛳ ゴルフコンペ結果\n\n${lines.join('\n')}\n\n📊 PeoriaSlider`;
}

interface ResultsTableProps {
  results: CalculationResult[];
  onSave: (name: string) => void;
}

export function ResultsTable({ results, onSave }: ResultsTableProps) {
  const [saveName, setSaveName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const shareText = useMemo(
    () => formatResultsText(results, boobyRank),
    [results, boobyRank]
  );

  const handleShareLine = useCallback(() => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://line.me/R/share?text=${encoded}`, '_blank');
  }, [shareText]);

  const handleCopyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyStatus('copied');
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyStatus('copied');
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyStatus('idle'), 2000);
    }
  }, [shareText]);

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

      {/* Share section */}
      <div className="share-section">
        <button className="btn-share-line" onClick={handleShareLine}>
          LINE で共有
        </button>
        <button
          className={`btn-copy ${copyStatus === 'copied' ? 'copied' : ''}`}
          onClick={handleCopyText}
        >
          {copyStatus === 'copied' ? 'コピーしました' : 'テキストをコピー'}
        </button>
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
