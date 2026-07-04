import { BoardConnectors } from '@/components/BoardConnectors';
import type { BoardThemeName, BoardTheme } from '@/data/boardThemes';

/**
 * Mini, non-interactive preview of a board theme: shows the 10x10 grid with
 * snake/ladder connectors and mystery-box markers, scaled down to fit inside
 * a theme-selection card. Pure visual — no players, no cell numbers, no
 * hover states. Reuses BoardConnectors so the preview can never visually
 * drift from the real board.
 */
export const BoardThemePreview = ({
  boardTheme,
  theme,
}: {
  boardTheme: BoardThemeName;
  theme: BoardTheme;
}) => {
  const { config, visual } = theme;

  return (
    <div
      className="relative w-full aspect-square rounded-xl overflow-hidden border border-white/10"
      style={{
        background: `linear-gradient(135deg, ${visual.connectorColors.primary}22, ${visual.connectorColors.secondary}22)`,
      }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Faint grid lines so the board reads as a board even at small size */}
        <g stroke="rgba(255,255,255,0.08)" strokeWidth="0.5">
          {Array.from({ length: 11 }, (_, i) => (
            <line key={`v-${i}`} x1={i * 10} y1={0} x2={i * 10} y2={100} />
          ))}
          {Array.from({ length: 11 }, (_, i) => (
            <line key={`h-${i}`} x1={0} y1={i * 10} x2={100} y2={i * 10} />
          ))}
        </g>

        {/* Mystery box markers */}
        {config.mysteryBoxes.map((box, i) => {
          const index = box.position - 1;
          const row = Math.floor(index / 10);
          const colRaw = index % 10;
          const col = row % 2 !== 0 ? 9 - colRaw : colRaw;
          const cx = col * 10 + 5;
          const cy = (9 - row) * 10 + 5;
          return (
            <circle
              key={`box-${i}`}
              cx={cx}
              cy={cy}
              r="2"
              fill={visual.connectorColors.secondary}
              opacity="0.55"
            />
          );
        })}

        {/* Snakes + ladders, same renderer used by the live board */}
        <BoardConnectors boardTheme={boardTheme} currentBoardConfig={config} visual={visual} />
      </svg>
    </div>
  );
};