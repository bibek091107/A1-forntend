import React, { useEffect, useRef, useState } from 'react';

const NGL_CDN = 'https://cdn.jsdelivr.net/npm/ngl@2.0.0-dev.38/dist/ngl.js';

function loadNGL() {
  return new Promise((resolve, reject) => {
    if (window.NGL) return resolve(window.NGL);
    const script = document.createElement('script');
    script.src = NGL_CDN;
    script.onload = () => resolve(window.NGL);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * 3D Protein Viewer using NGL Viewer (CDN).
 * Props: pdbId, representation ('cartoon' | 'surface' | 'ball+stick' | 'licorice')
 */
const ProteinViewer = ({ pdbId, representation = 'cartoon' }) => {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const componentRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load new structure when pdbId changes
  useEffect(() => {
    if (!pdbId || !containerRef.current) return;

    let stage = null;
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      componentRef.current = null;

      // Dispose previous stage and clear DOM
      if (stageRef.current) {
        stageRef.current.dispose();
        stageRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      try {
        const NGL = await loadNGL();
        if (cancelled) return;

        stage = new NGL.Stage(containerRef.current, {
          backgroundColor: '#0d1117',
          quality: 'high',
          sampleLevel: 1,
        });
        stageRef.current = stage;

        const handleResize = () => stage.handleResize();
        window.addEventListener('resize', handleResize);

        const pdbUrl = `https://files.rcsb.org/download/${pdbId}.pdb`;
        const comp = await stage.loadFile(pdbUrl, { ext: 'pdb', defaultRepresentation: false });
        if (cancelled) return;

        componentRef.current = comp;
        comp.addRepresentation(representation, { color: 'chainname', smoothSheet: true, quality: 'high' });
        stage.autoView(500);
        setLoading(false);

        return () => window.removeEventListener('resize', handleResize);
      } catch (err) {
        if (!cancelled) {
          console.error('NGL error:', err);
          setError('Failed to load 3D structure. Please try again.');
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (stageRef.current) { stageRef.current.dispose(); stageRef.current = null; }
    };
  }, [pdbId]);

  // Change representation without reloading the structure
  useEffect(() => {
    const comp = componentRef.current;
    if (!comp) return;
    comp.removeAllRepresentations();
    comp.addRepresentation(representation, { color: 'chainname', smoothSheet: true, quality: 'high' });
    if (stageRef.current) stageRef.current.autoView(500);
  }, [representation]);

  if (!pdbId) {
    return (
      <div className="viewer-container glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '4rem' }}>🧬</div>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Select a protein to visualize its 3D structure</p>
      </div>
    );
  }

  return (
    <div className="viewer-container glass" style={{ position: 'relative', background: '#0d1117' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'rgba(13,17,23,0.85)', zIndex: 10, borderRadius: '16px' }}>
          <div style={{ width: '52px', height: '52px', border: '4px solid rgba(34,211,238,0.2)', borderTop: '4px solid #22d3ee', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#22d3ee', fontWeight: 600 }}>Rendering <strong>{pdbId}</strong>…</p>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Fetching from RCSB Protein Data Bank</p>
        </div>
      )}

      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: 'rgba(13,17,23,0.9)', zIndex: 10, borderRadius: '16px' }}>
          <div style={{ fontSize: '2.5rem' }}>⚠️</div>
          <p style={{ color: '#f87171', fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', padding: '6px 14px', fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', zIndex: 5 }}>
          🖱️ Drag to rotate · Scroll to zoom · Right-drag to pan
        </div>
      )}
    </div>
  );
};

export default ProteinViewer;
