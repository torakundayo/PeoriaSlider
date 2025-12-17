import type { CompetitionConfig, Player, CalculationResult } from '../types';

/**
 * ダブルパーカットを適用したスコアを取得
 */
function applyDoubleParCut(score: number, par: number, enabled: boolean): number {
  if (!enabled) return score;
  const maxScore = par * 2;
  return Math.min(score, maxScore);
}

/**
 * 隠しホールの合計スコアを計算（ダブルパーカット適用後）
 */
function calculateHiddenTotal(
  scores: number[],
  hiddenHoles: number[],
  par: number[],
  doubleParCut: boolean
): number {
  return hiddenHoles.reduce((total, holeIndex) => {
    if (holeIndex >= 0 && holeIndex < scores.length) {
      const score = scores[holeIndex];
      const holePar = par[holeIndex];
      return total + applyDoubleParCut(score, holePar, doubleParCut);
    }
    return total;
  }, 0);
}

/**
 * コースパーの合計を計算
 */
function calculateCoursePar(par: number[]): number {
  return par.reduce((sum, p) => sum + p, 0);
}

/**
 * 端数処理を適用
 */
function applyRounding(value: number, mode: 'round' | 'floor' | 'ceil'): number {
  // 小数第二位で処理して小数第一位まで表示
  const multiplied = value * 10;
  let rounded: number;

  switch (mode) {
    case 'floor':
      rounded = Math.floor(multiplied);
      break;
    case 'ceil':
      rounded = Math.ceil(multiplied);
      break;
    case 'round':
    default:
      rounded = Math.round(multiplied);
      break;
  }

  return rounded / 10;
}

/**
 * ハンディキャップを計算
 * HDCP = (隠しホールスコア合計 × 重み - コースPar) × 係数
 */
function calculateHdcp(
  hiddenTotal: number,
  hiddenWeight: number,
  coursePar: number,
  multiplier: number,
  maxHdcp: number,
  roundingMode: 'round' | 'floor' | 'ceil'
): number {
  const rawHdcp = (hiddenTotal * hiddenWeight - coursePar) * multiplier;
  const roundedHdcp = applyRounding(rawHdcp, roundingMode);

  // HDCP上限を適用（負のHDCPは許可）
  return Math.min(roundedHdcp, maxHdcp);
}

/**
 * グロススコアの合計を計算
 */
function calculateGross(scores: number[]): number {
  return scores.reduce((sum, s) => sum + s, 0);
}

/**
 * 単一プレイヤーの計算結果を取得
 */
export function calculatePlayerResult(
  player: Player,
  config: CompetitionConfig
): Omit<CalculationResult, 'rank' | 'previousRank'> {
  const gross = calculateGross(player.scores);
  const hiddenTotal = calculateHiddenTotal(
    player.scores,
    config.hiddenHoles,
    config.par,
    config.limits.doubleParCut
  );
  const coursePar = calculateCoursePar(config.par);
  const hdcp = calculateHdcp(
    hiddenTotal,
    config.hiddenWeight,
    coursePar,
    config.multiplier,
    config.limits.maxHdcp,
    config.roundingMode
  );
  const net = gross - hdcp;

  return {
    playerId: player.id,
    playerName: player.name,
    gross,
    hiddenTotal,
    hdcp,
    net
  };
}

/**
 * 順位付けのための比較関数
 * 優先順位: 1. Net（昇順）2. HDCP（昇順）3. 年齢（降順、年長者勝ち）4. Gross（昇順）
 */
function compareResults(
  a: Omit<CalculationResult, 'rank' | 'previousRank'>,
  b: Omit<CalculationResult, 'rank' | 'previousRank'>,
  players: Player[]
): number {
  // 1. Net スコア（昇順）
  if (a.net !== b.net) {
    return a.net - b.net;
  }

  // 2. HDCP（昇順：ハンデが少ない方が実力上位）
  if (a.hdcp !== b.hdcp) {
    return a.hdcp - b.hdcp;
  }

  // 3. 年齢（降順：年長者勝ち）
  const playerA = players.find(p => p.id === a.playerId);
  const playerB = players.find(p => p.id === b.playerId);
  const ageA = playerA?.age ?? 0;
  const ageB = playerB?.age ?? 0;
  if (ageA !== ageB) {
    return ageB - ageA; // 年長者が上位
  }

  // 4. Gross スコア（昇順）
  return a.gross - b.gross;
}

/**
 * 全プレイヤーの計算結果と順位を取得
 */
export function calculateAllResults(
  players: Player[],
  config: CompetitionConfig,
  previousResults?: CalculationResult[]
): CalculationResult[] {
  // 各プレイヤーの計算結果を取得
  const results = players
    .filter(p => p.scores.length === 18 && p.scores.every(s => s > 0))
    .map(player => calculatePlayerResult(player, config));

  // ソート
  const sorted = [...results].sort((a, b) => compareResults(a, b, players));

  // 順位を付与（同点は同順位）
  let currentRank = 1;
  const rankedResults: CalculationResult[] = sorted.map((result, index) => {
    if (index > 0) {
      const prev = sorted[index - 1];
      // 完全に同じ場合のみ同順位
      if (
        result.net === prev.net &&
        result.hdcp === prev.hdcp &&
        result.gross === prev.gross
      ) {
        // 同順位を維持
      } else {
        currentRank = index + 1;
      }
    }

    // 前回の順位を取得（アニメーション用）
    const previousResult = previousResults?.find(r => r.playerId === result.playerId);

    return {
      ...result,
      rank: currentRank,
      previousRank: previousResult?.rank
    };
  });

  return rankedResults;
}

/**
 * BB賞（ブービー賞、最下位から2番目）の順位を取得
 */
export function getBoobyRank(results: CalculationResult[]): number | null {
  if (results.length < 2) return null;
  const sortedByRank = [...results].sort((a, b) => b.rank - a.rank);
  // 最下位から2番目
  return sortedByRank[1]?.rank ?? null;
}

/**
 * 隠しホールのPar合計を計算
 */
export function calculateHiddenHolesPar(hiddenHoles: number[], par: number[]): number {
  return hiddenHoles.reduce((total, holeIndex) => {
    if (holeIndex >= 0 && holeIndex < par.length) {
      return total + par[holeIndex];
    }
    return total;
  }, 0);
}

/**
 * 新ペリア推奨（合計Par48）の隠しホールをランダムに選出
 * OUT/INそれぞれで Par3:1個, Par5:1個, Par4:4個 を選出
 */
export function generateRandomHiddenHoles(par: number[]): number[] {
  // Fisher-Yates shuffle
  const shuffle = <T>(arr: T[]): T[] => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  // 指定されたParのホールをランダムに選ぶ
  const pickRandomByPar = (
    holeIndices: number[],
    targetPar: number,
    count: number
  ): number[] => {
    const candidates = holeIndices.filter(i => par[i] === targetPar);
    return shuffle(candidates).slice(0, count);
  };

  // OUT (0-8) と IN (9-17) に分割
  const outHoles = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const inHoles = [9, 10, 11, 12, 13, 14, 15, 16, 17];

  // OUT/IN それぞれで選出（Par3:1個, Par5:1個, Par4:4個）
  const selectedOut = [
    ...pickRandomByPar(outHoles, 3, 1),
    ...pickRandomByPar(outHoles, 5, 1),
    ...pickRandomByPar(outHoles, 4, 4)
  ];

  const selectedIn = [
    ...pickRandomByPar(inHoles, 3, 1),
    ...pickRandomByPar(inHoles, 5, 1),
    ...pickRandomByPar(inHoles, 4, 4)
  ];

  const allSelected = [...selectedOut, ...selectedIn];

  // 12ホール取れなかった場合（変則コース）はフォールバック
  if (allSelected.length < 12) {
    console.warn('標準的なホール構成ではないため、完全な推奨パターンで選出できませんでした。');
    // 足りない分を残りのホールからランダムに補填
    const remainingOut = outHoles.filter(h => !allSelected.includes(h));
    const remainingIn = inHoles.filter(h => !allSelected.includes(h));
    const remaining = shuffle([...remainingOut, ...remainingIn]);
    const needed = 12 - allSelected.length;
    allSelected.push(...remaining.slice(0, needed));
  }

  return allSelected.sort((a, b) => a - b);
}
