// CampusFind AI — Parametric Cellular / Voronoi Lattice Static Decor
// Renders the modern organic architectural cellular web artwork,
// seamlessly blended into canvas empty spaces via multiply blend mode and radial gradient masking.
// Zero JS runtime overhead, zero interference with interactive elements.

export default function StaticCanvasDecor() {
  return (
    <div className="static-canvas-decor cellular-canvas" aria-hidden="true">
      {/* ── Primary Cellular Lattice (Right margin architectural canopy) ── */}
      <div className="cellular-lattice-panel cellular-lattice-panel--right">
        <img
          src="/cellular-lattice.png"
          alt=""
          className="cellular-lattice-img"
        />
      </div>

      {/* ── Secondary Subtle Balance Accent (Bottom-left ambient organic node) ── */}
      <div className="cellular-lattice-panel cellular-lattice-panel--left">
        <img
          src="/cellular-lattice.png"
          alt=""
          className="cellular-lattice-img cellular-lattice-img--mirrored"
        />
      </div>
    </div>
  );
}
