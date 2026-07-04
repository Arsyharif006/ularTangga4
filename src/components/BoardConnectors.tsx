import { getBoardCoordinate } from '@/lib/boardUtils';
import type { BoardConfig } from '@/types/game';
import type { BoardThemeName, BoardTheme } from '@/data/boardThemes';

/**
 * Renders the snake & ladder connector layer (gradients + shapes) for a given
 * board config + visual theme. Shared by the live GameBoard and the small
 * theme-preview thumbnails in GameSetup so the two never visually drift apart.
 *
 * Must be placed inside an <svg viewBox="0 0 100 100" preserveAspectRatio="none">.
 */
export const BoardConnectors = ({
  boardTheme,
  currentBoardConfig,
  visual,
}: {
  boardTheme: BoardThemeName;
  currentBoardConfig: BoardConfig;
  visual: BoardTheme['visual'];
}) => {
  return (
    <>
      <defs>
        {currentBoardConfig.ladders.map((ladder, i) => {
          const start = getBoardCoordinate(ladder.bottom);
          const end = getBoardCoordinate(ladder.top);
          const lx1 = start.col * 10 + 5;
          const ly1 = (9 - start.row) * 10 + 5;
          const lx2 = end.col * 10 + 5;
          const ly2 = (9 - end.row) * 10 + 5;
          return (
            <linearGradient key={`ladderGradDef-${i}`} id={`ladderGrad-${boardTheme}-${i}`} gradientUnits="userSpaceOnUse" x1={lx1} y1={ly1} x2={lx2} y2={ly2}>
              <stop offset="0%" stopColor={visual.connectorColors.secondary} />
              <stop offset="100%" stopColor={visual.connectorColors.primary} />
            </linearGradient>
          );
        })}
        {currentBoardConfig.snakes.map((snake, i) => {
          const start = getBoardCoordinate(snake.head);
          const end = getBoardCoordinate(snake.tail);
          const sx1 = start.col * 10 + 5;
          const sy1 = (9 - start.row) * 10 + 5;
          const sx2 = end.col * 10 + 5;
          const sy2 = (9 - end.row) * 10 + 5;
          return (
            <linearGradient key={`snakeGradDef-${i}`} id={`snakeGrad-${boardTheme}-${i}`} gradientUnits="userSpaceOnUse" x1={sx1} y1={sy1} x2={sx2} y2={sy2}>
              <stop offset="0%" stopColor={visual.connectorColors.primary} />
              <stop offset="100%" stopColor={visual.connectorColors.secondary} />
            </linearGradient>
          );
        })}
      </defs>

      {currentBoardConfig.ladders.map((ladder, i) => {
        const start = getBoardCoordinate(ladder.bottom);
        const end = getBoardCoordinate(ladder.top);
        const x1 = start.col * 10 + 5;
        const y1 = (9 - start.row) * 10 + 5;
        const x2 = end.col * 10 + 5;
        const y2 = (9 - end.row) * 10 + 5;

        const angle = Math.atan2(y2 - y1, x2 - x1);
        const offX = Math.cos(angle - Math.PI / 2) * 1.5;
        const offY = Math.sin(angle - Math.PI / 2) * 1.5;

        const dist = Math.hypot(x2 - x1, y2 - y1);
        const rungs = Math.floor(dist / 3);
        const gradId = `ladderGrad-${boardTheme}-${i}`;
        const rungLines = [];
        for (let j = 1; j <= rungs; j++) {
          const t = j / (rungs + 1);
          const mx = x1 + (x2 - x1) * t;
          const my = y1 + (y2 - y1) * t;
          rungLines.push(
            <line
              key={`rung-${j}`}
              x1={mx + offX}
              y1={my + offY}
              x2={mx - offX}
              y2={my - offY}
              stroke={visual.connectorColors.secondary}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          );
        }

        // Forest theme: a woven liana ladder — two twisting vine rails
        // that cross over each other between rungs, with small leaf sprigs.
        if (visual.particle === 'leaf') {
          const railA: string[] = [];
          const railB: string[] = [];
          const steps = Math.max(rungs, 3);
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;
            const wobble = Math.sin(t * Math.PI * 3) * 1.4;
            railA.push(`${px + offX + wobble * Math.cos(angle)} ${py + offY + wobble * Math.sin(angle)}`);
            railB.push(`${px - offX - wobble * Math.cos(angle)} ${py - offY - wobble * Math.sin(angle)}`);
          }
          const railAD = `M ${railA.join(' L ')}`;
          const railBD = `M ${railB.join(' L ')}`;
          return (
            <g key={`ladder-${i}`}>
              <path d={railAD} fill="none" stroke={`url(#${gradId})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d={railBD} fill="none" stroke={`url(#${gradId})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              {rungLines}
              {rungLines.map((_, j) => {
                const t = (j + 1) / (rungs + 1);
                const lx = x1 + (x2 - x1) * t;
                const ly = y1 + (y2 - y1) * t;
                const side = j % 2 === 0 ? 1 : -1;
                const leafX = lx + side * offX * 2.4 + Math.cos(angle) * 1.2;
                const leafY = ly + side * offY * 2.4 + Math.sin(angle) * 1.2;
                return (
                  <ellipse
                    key={`leafsprig-${j}`}
                    cx={leafX}
                    cy={leafY}
                    rx="1.3"
                    ry="0.7"
                    fill={visual.connectorColors.secondary}
                    opacity="0.9"
                    transform={`rotate(${(angle * 180) / Math.PI + side * 35} ${leafX} ${leafY})`}
                  />
                );
              })}
              <circle cx={x1} cy={y1} r="1.4" fill={visual.connectorColors.primary} />
              <circle cx={x2} cy={y2} r="1.4" fill={visual.connectorColors.primary} />
            </g>
          );
        }

        // Winter theme: icy parallel rails with crystalline rungs
        if (visual.particle === 'snow') {
          return (
            <g key={`ladder-${i}`}>
              <line x1={x1 + offX} y1={y1 + offY} x2={x2 + offX} y2={y2 + offY} stroke={`url(#${gradId})`} strokeWidth="1.6" strokeLinecap="round" />
              <line x1={x1 - offX} y1={y1 - offY} x2={x2 - offX} y2={y2 - offY} stroke={`url(#${gradId})`} strokeWidth="1.6" strokeLinecap="round" />
              {rungLines}
            </g>
          );
        }

        // Lava theme: chunky obsidian bridge — thick dark slab rails with
        // glowing crack-seams and angular rivet rungs instead of round ones.
        if (visual.particle === 'ember') {
          return (
            <g key={`ladder-${i}`}>
              <line x1={x1 + offX * 1.6} y1={y1 + offY * 1.6} x2={x2 + offX * 1.6} y2={y2 + offY * 1.6} stroke="#1c1917" strokeWidth="2.6" strokeLinecap="round" />
              <line x1={x1 - offX * 1.6} y1={y1 - offY * 1.6} x2={x2 - offX * 1.6} y2={y2 - offY * 1.6} stroke="#1c1917" strokeWidth="2.6" strokeLinecap="round" />
              <line x1={x1 + offX * 1.6} y1={y1 + offY * 1.6} x2={x2 + offX * 1.6} y2={y2 + offY * 1.6} stroke={`url(#${gradId})`} strokeWidth="1" strokeLinecap="round" strokeDasharray="0.3 2.5" />
              <line x1={x1 - offX * 1.6} y1={y1 - offY * 1.6} x2={x2 - offX * 1.6} y2={y2 - offY * 1.6} stroke={`url(#${gradId})`} strokeWidth="1" strokeLinecap="round" strokeDasharray="0.3 2.5" />
              {rungLines.map((_, j) => {
                const t = (j + 1) / (rungs + 1);
                const mx = x1 + (x2 - x1) * t;
                const my = y1 + (y2 - y1) * t;
                return (
                  <rect
                    key={`rivet-${j}`}
                    x={mx - 0.8}
                    y={my - 0.8}
                    width="1.6"
                    height="1.6"
                    fill={visual.connectorColors.secondary}
                    opacity="0.85"
                    transform={`rotate(45 ${mx} ${my})`}
                  />
                );
              })}
            </g>
          );
        }

        // Space theme: a luminous plasma helix — two rails orbiting each
        // other in a tight double-helix, with small energy nodes at crossings.
        if (visual.particle === 'star') {
          const railA: string[] = [];
          const railB: string[] = [];
          const steps = Math.max(rungs * 2, 8);
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;
            const wobble = Math.sin(t * Math.PI * 5) * 1.6;
            railA.push(`${px + offX + wobble * Math.cos(angle)} ${py + offY + wobble * Math.sin(angle)}`);
            railB.push(`${px - offX - wobble * Math.cos(angle)} ${py - offY - wobble * Math.sin(angle)}`);
          }
          return (
            <g key={`ladder-${i}`}>
              <path d={`M ${railA.join(' L ')}`} fill="none" stroke={`url(#${gradId})`} strokeWidth="1.3" strokeLinecap="round" opacity="0.95" />
              <path d={`M ${railB.join(' L ')}`} fill="none" stroke={`url(#${gradId})`} strokeWidth="1.3" strokeLinecap="round" opacity="0.95" />
              {Array.from({ length: rungs + 2 }, (_, j) => {
                const t = j / (rungs + 1);
                const nx = x1 + (x2 - x1) * t;
                const ny = y1 + (y2 - y1) * t;
                return <circle key={`node-${j}`} cx={nx} cy={ny} r="0.9" fill={visual.connectorColors.secondary} opacity="0.9" />;
              })}
              <circle cx={x1} cy={y1} r="1.6" fill={visual.connectorColors.secondary} opacity="0.5" />
              <circle cx={x2} cy={y2} r="1.6" fill={visual.connectorColors.secondary} opacity="0.5" />
            </g>
          );
        }

        // Desert (default): rope ladder
        return (
          <g key={`ladder-${i}`}>
            <line x1={x1 + offX} y1={y1 + offY} x2={x2 + offX} y2={y2 + offY} stroke={`url(#${gradId})`} strokeWidth="1.5" strokeLinecap="round" />
            <line x1={x1 - offX} y1={y1 - offY} x2={x2 - offX} y2={y2 - offY} stroke={`url(#${gradId})`} strokeWidth="1.5" strokeLinecap="round" />
            {rungLines}
          </g>
        );
      })}

      {currentBoardConfig.snakes.map((snake, i) => {
        const start = getBoardCoordinate(snake.head);
        const end = getBoardCoordinate(snake.tail);
        const x1 = start.col * 10 + 5;
        const y1 = (9 - start.row) * 10 + 5;
        const x2 = end.col * 10 + 5;
        const y2 = (9 - end.row) * 10 + 5;
        const gradId = `snakeGrad-${boardTheme}-${i}`;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const ctrlX1 = x1 + dx / 3 + dy / 3;
        const ctrlY1 = y1 + dy / 3 - dx / 3;
        const ctrlX2 = x1 + (2 * dx) / 3 - dy / 3;
        const ctrlY2 = y1 + (2 * dy) / 3 + dx / 3;
        const pathD = `M ${x1} ${y1} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${x2} ${y2}`;

        // Winter theme: jagged glacier crack instead of a snake
        if (visual.particle === 'snow') {
          const segments = 5;
          let crackD = `M ${x1} ${y1} `;
          for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const px = x1 + dx * t;
            const py = y1 + dy * t;
            const nx = px + Math.cos(Math.atan2(dy, dx) + Math.PI / 2) * (s % 2 === 0 ? 1.8 : -1.8);
            crackD += `L ${nx} ${py} `;
          }
          crackD += `L ${x2} ${y2}`;
          return (
            <g key={`snake-${i}`}>
              <path d={crackD} fill="none" stroke={`url(#${gradId})`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d={crackD} fill="none" stroke="#ffffff" strokeWidth="0.6" strokeDasharray="1.5 2" strokeLinecap="round" opacity="0.7" />
              <circle cx={x1} cy={y1} r="2" fill="#e0f2fe" />
              <circle cx={x1} cy={y1} r="0.8" fill="#0c4a6e" />
            </g>
          );
        }

        // Forest theme: thorned vine-serpent
        if (visual.particle === 'leaf') {
          return (
            <g key={`snake-${i}`}>
              <path d={pathD} fill="none" stroke={`url(#${gradId})`} strokeWidth="2.4" strokeLinecap="round" />
              <path d={pathD} fill="none" stroke="#365314" strokeWidth="2.4" strokeDasharray="1.5 3.5" strokeLinecap="round" />
              <circle cx={x1} cy={y1} r="2.3" fill="#84cc16" />
              <circle cx={x1} cy={y1} r="0.9" fill="#1a2e05" />
            </g>
          );
        }

        // Lava theme: a glowing magma flow with a jagged molten crust edge
        if (visual.particle === 'ember') {
          return (
            <g key={`snake-${i}`}>
              <path d={pathD} fill="none" stroke="#1c1917" strokeWidth="3.4" strokeLinecap="round" />
              <path d={pathD} fill="none" stroke={`url(#${gradId})`} strokeWidth="2.2" strokeLinecap="round" />
              <path d={pathD} fill="none" stroke="#fde68a" strokeWidth="0.7" strokeDasharray="0.5 2.5" strokeLinecap="round" opacity="0.85" />
              <circle cx={x1} cy={y1} r="2.6" fill="#1c1917" />
              <circle cx={x1} cy={y1} r="1.7" fill="#f97316" />
              <circle cx={x1} cy={y1} r="0.7" fill="#fef3c7" />
            </g>
          );
        }

        // Space theme: a comet trail snake — bright core with a streaking
        // tapered tail and small star sparks along its path
        if (visual.particle === 'star') {
          return (
            <g key={`snake-${i}`}>
              <path d={pathD} fill="none" stroke={`url(#${gradId})`} strokeWidth="2.6" strokeLinecap="round" opacity="0.4" />
              <path d={pathD} fill="none" stroke={`url(#${gradId})`} strokeWidth="1.3" strokeLinecap="round" />
              {[0.2, 0.4, 0.6, 0.8].map((t, j) => {
                const px = x1 + dx * t;
                const py = y1 + dy * t;
                return <circle key={`spark-${j}`} cx={px} cy={py} r="0.55" fill="#ffffff" opacity="0.9" />;
              })}
              <circle cx={x1} cy={y1} r="2.6" fill={visual.connectorColors.secondary} opacity="0.35" />
              <circle cx={x1} cy={y1} r="1.6" fill="#ffffff" />
              <circle cx={x1} cy={y1} r="0.8" fill={visual.connectorColors.primary} />
            </g>
          );
        }

        // Desert (default): classic snake
        return (
          <g key={`snake-${i}`}>
            <path d={pathD} fill="none" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" />
            <path d={pathD} fill="none" stroke="#7c2d12" strokeWidth="2.5" strokeDasharray="2 3" strokeLinecap="round" />
            <circle cx={x1} cy={y1} r="2.5" fill="#fda4af" />
            <circle cx={x1} cy={y1} r="1" fill="#4c0519" />
          </g>
        );
      })}
    </>
  );
};