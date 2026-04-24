import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ProteinViewer from './components/ProteinViewer';

const API_BASE_URL = 'https://a1-backend-976q.onrender.com/api/v1';
const RCSB_SEARCH_URL = 'https://search.rcsb.org/rcsbsearch/v2/query';
const REPRESENTATIONS = ['cartoon', 'surface', 'ball+stick', 'licorice', 'spacefill'];

/* ── RCSB full-text search ─────────────────────────────────────────────── */
async function searchRCSB(query) {
  const body = {
    query: { type: 'terminal', service: 'full_text', parameters: { value: query } },
    return_type: 'entry',
    request_options: { paginate: { start: 0, rows: 10 }, results_content_type: ['experimental'] },
  };
  const res = await fetch(RCSB_SEARCH_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('RCSB search failed');
  const data = await res.json();
  return (data.result_set || []).map((r) => ({
    pdb_id: r.identifier, name: r.identifier,
    related_disease: 'RCSB PDB', description: 'Live result from RCSB Protein Data Bank', is_rcsb: true,
  }));
}

/* ── Stats bar chart ───────────────────────────────────────────────────── */
function StatsPanel({ allProteins }) {
  const diseaseMap = {};
  allProteins.forEach((p) => {
    const d = p.related_disease || 'Unknown';
    diseaseMap[d] = (diseaseMap[d] || 0) + 1;
  });
  const entries = Object.entries(diseaseMap).sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] || 1;

  return (
    <div className="metadata-panel glass animate-fade">
      <h2 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>📊 Database Statistics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Proteins', value: allProteins.length, icon: '🧬' },
          { label: 'Unique Diseases', value: entries.length, icon: '🏥' },
          { label: 'PDB Entries', value: allProteins.filter(p => p.pdb_id).length, icon: '🔬' },
        ].map(s => (
          <div key={s.label} className="stat-card glass" style={{ padding: '1.25rem', textAlign: 'center', borderRadius: '12px' }}>
            <div style={{ fontSize: '2rem' }}>{s.icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2 }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Disease Distribution</h3>
      {entries.map(([disease, count]) => (
        <div key={disease} style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.9rem' }}>
            <span>{disease}</span><span style={{ color: 'var(--primary)', fontWeight: 600 }}>{count}</span>
          </div>
          <div style={{ height: '6px', borderRadius: '4px', background: 'rgba(255,255,255,0.07)' }}>
            <div style={{ height: '100%', width: `${(count / max) * 100}%`, borderRadius: '4px', background: 'linear-gradient(to right, var(--primary), var(--accent))', transition: 'width 0.6s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Add Protein Form ──────────────────────────────────────────────────── */
function AddProteinForm({ onAdded, onClose }) {
  const [form, setForm] = useState({ name: '', pdb_id: '', description: '', related_disease: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setFormError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/proteins`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Failed to create protein'); }
      const protein = await res.json();
      onAdded(protein);
    } catch (err) { setFormError(err.message); }
    finally { setSubmitting(false); }
  };

  const fields = [
    { name: 'name', label: 'Protein Name', placeholder: 'e.g. Haemoglobin', required: true },
    { name: 'pdb_id', label: 'PDB ID (4 chars)', placeholder: 'e.g. 2HHB', required: true },
    { name: 'related_disease', label: 'Related Disease', placeholder: 'e.g. Sickle Cell Anaemia' },
    { name: 'description', label: 'Description', placeholder: 'Biological role…', textarea: true },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box glass" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: 'var(--primary)' }}>➕ Add New Protein</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {fields.map(f => (
            <div key={f.name} className="form-group">
              <label>{f.label}{f.required && <span style={{ color: '#f87171' }}> *</span>}</label>
              {f.textarea
                ? <textarea name={f.name} placeholder={f.placeholder} value={form[f.name]} onChange={handleChange} rows={3} className="form-input" />
                : <input type="text" name={f.name} placeholder={f.placeholder} value={form[f.name]} onChange={handleChange} required={f.required} className="form-input" />
              }
            </div>
          ))}
          {formError && <p style={{ color: '#f87171', marginBottom: '1rem', fontSize: '0.9rem' }}>{formError}</p>}
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Saving…' : '💾 Save Protein'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Metadata Panel ────────────────────────────────────────────────────── */
function MetadataPanel({ metadata, loading, pdbId }) {
  if (loading) return (
    <div className="metadata-panel glass animate-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid rgba(34,211,238,0.2)', borderTop: '3px solid #22d3ee', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: 'var(--primary)' }}>Fetching metadata…</p>
    </div>
  );
  if (!metadata) return (
    <div className="metadata-panel glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Select a curated protein to view its RCSB metadata.
    </div>
  );

  const d = metadata.data || {};
  const info = d.rcsb_entry_info || {};
  const accession = d.rcsb_accession_info || {};
  const struct = d.struct || {};
  const authors = (d.audit_author || []).map(a => a.name).join(', ');

  const rows = [
    { label: '📋 Title', value: struct.title },
    { label: '🔬 Method', value: info.experimental_method },
    { label: '📐 Resolution', value: info.resolution_combined ? `${info.resolution_combined[0]} Å` : undefined },
    { label: '🦠 Organism', value: d.rcsb_entity_source_organism?.[0]?.scientific_name },
    { label: '📅 Deposited', value: accession.deposit_date?.split('T')[0] },
    { label: '🗓️ Released', value: accession.initial_release_date?.split('T')[0] },
    { label: '⚛️ Atoms', value: info.deposited_atom_count?.toLocaleString() },
    { label: '✍️ Authors', value: authors || undefined },
  ].filter(r => r.value);

  return (
    <div className="metadata-panel glass animate-fade">
      <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>📄 RCSB Metadata — {pdbId}</h2>
      <a href={`https://www.rcsb.org/structure/${pdbId}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '0.85rem', display: 'block', marginBottom: '1.5rem' }}>
        View on RCSB →
      </a>
      <div className="metadata-grid">
        {rows.map(r => (
          <div key={r.label} className="metadata-row">
            <span className="meta-label">{r.label}</span>
            <span className="meta-value">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main App ──────────────────────────────────────────────────────────── */
export default function App() {
  const [proteins, setProteins] = useState([]);
  const [allProteins, setAllProteins] = useState([]);
  const [rcsbResults, setRcsbResults] = useState([]);
  const [selectedPdbId, setSelectedPdbId] = useState(null);
  const [selectedProtein, setSelectedProtein] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [rcsbLoading, setRcsbLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('viewer'); // 'viewer' | 'metadata' | 'stats'
  const [representation, setRepresentation] = useState('cartoon');
  const [showAddForm, setShowAddForm] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchDbProteins('');
    fetchAllProteins();
  }, []);

  const fetchAllProteins = async () => {
    try { const r = await fetch(`${API_BASE_URL}/proteins?limit=500`); const d = await r.json(); setAllProteins(d); }
    catch {}
  };

  const fetchDbProteins = async (query) => {
    try {
      setLoading(true);
      const ep = query ? `${API_BASE_URL}/proteins/search?q=${encodeURIComponent(query)}` : `${API_BASE_URL}/proteins`;
      const res = await fetch(ep);
      if (!res.ok) throw new Error('Failed to fetch proteins');
      setProteins(await res.json()); setError(null);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    const q = e.target.value; setSearchQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await fetchDbProteins(q);
      if (q.trim().length >= 3) {
        setRcsbLoading(true);
        try { setRcsbResults(await searchRCSB(q.trim())); } catch { setRcsbResults([]); }
        finally { setRcsbLoading(false); }
      } else { setRcsbResults([]); }
    }, 400);
  };

  const selectProtein = async (protein) => {
    const pid = protein.pdb_id.toUpperCase();
    setSelectedProtein(protein); setSelectedPdbId(pid);
    setMetadata(null);

    // Fetch metadata if it's a curated DB protein
    if (protein.id) {
      setMetaLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/proteins/${protein.id}/metadata`);
        if (res.ok) setMetadata(await res.json());
      } catch {}
      finally { setMetaLoading(false); }
    } else {
      // RCSB direct result — fetch metadata from RCSB API directly
      setMetaLoading(true);
      try {
        const res = await fetch(`https://data.rcsb.org/rest/v1/core/entry/${pid}`);
        if (res.ok) setMetadata({ pdb_id: pid, source_url: res.url, data: await res.json() });
      } catch {}
      finally { setMetaLoading(false); }
    }
  };

  const handleProteinAdded = (newProtein) => {
    setProteins(prev => [newProtein, ...prev]);
    setAllProteins(prev => [newProtein, ...prev]);
    setShowAddForm(false);
    selectProtein(newProtein);
  };

  const dbPdbIds = new Set(proteins.map(p => p.pdb_id.toUpperCase()));
  const filteredRcsb = rcsbResults.filter(r => !dbPdbIds.has(r.pdb_id.toUpperCase()));

  return (
    <div className="App">
      <header>
        <h1 className="animate-fade">NeuroImmune</h1>
        <p className="animate-fade">Molecular Visualization Portal</p>
      </header>

      <main className="app-container">
        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <aside className="sidebar glass animate-fade">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input type="text" className="search-box" style={{ margin: 0, flex: 1 }}
              placeholder="Search proteins, diseases, PDB…" value={searchQuery} onChange={handleSearch} />
            <button className="add-btn" title="Add new protein" onClick={() => setShowAddForm(true)}>＋</button>
          </div>

          {loading && <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>Loading…</div>}
          {error && <div style={{ color: '#f87171', padding: '0.5rem 1rem' }}>{error}</div>}

          {proteins.length > 0 && <>
            <div className="section-label">📂 Curated Database</div>
            {proteins.map(p => (
              <div key={p.id} className={`protein-card glass ${selectedPdbId === p.pdb_id.toUpperCase() ? 'active' : ''}`} onClick={() => selectProtein(p)}>
                <h3>{p.name}</h3><p>{p.related_disease}</p><span className="badge">{p.pdb_id}</span>
              </div>
            ))}
          </>}

          {rcsbLoading && <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--primary)', fontSize: '0.9rem' }}>🔍 Searching RCSB PDB…</div>}
          {!rcsbLoading && filteredRcsb.length > 0 && <>
            <div className="section-label" style={{ marginTop: '1rem' }}>🌐 Live RCSB Results</div>
            {filteredRcsb.map(r => (
              <div key={r.pdb_id} className={`protein-card glass ${selectedPdbId === r.pdb_id.toUpperCase() ? 'active' : ''}`} onClick={() => selectProtein(r)}>
                <h3 style={{ fontSize: '0.9rem' }}>{r.pdb_id}</h3>
                <p style={{ fontSize: '0.8rem' }}>From RCSB PDB</p>
                <span className="badge" style={{ background: 'rgba(129,140,248,0.2)', color: '#818cf8' }}>{r.pdb_id}</span>
              </div>
            ))}
          </>}

          {!loading && proteins.length === 0 && filteredRcsb.length === 0 && !rcsbLoading && searchQuery && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No results found.</div>
          )}
        </aside>

        {/* ── Main Section ───────────────────────────────────────────── */}
        <section className="viewer-section animate-fade">
          {/* Tab bar */}
          <div className="tab-bar glass">
            {[['viewer','🔬 3D Viewer'],['metadata','📄 Metadata'],['stats','📊 Stats']].map(([id, label]) => (
              <button key={id} className={`tab-btn ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>{label}</button>
            ))}
            {selectedPdbId && (
              <a
                href={`https://www.rcsb.org/structure/${selectedPdbId}`}
                target="_blank"
                rel="noreferrer"
                className="tab-btn download-btn"
                style={{ marginLeft: 'auto' }}
                title={`View ${selectedPdbId} on RCSB PDB`}
              >
                🔗 View PDB
              </a>
            )}
          </div>

          {/* Viewer Tab */}
          {activeTab === 'viewer' && <>
            {/* Representation toggle */}
            <div className="rep-bar glass">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '0.5rem' }}>View:</span>
              {REPRESENTATIONS.map(rep => (
                <button key={rep} className={`rep-btn ${representation === rep ? 'active' : ''}`} onClick={() => setRepresentation(rep)}>
                  {rep.charAt(0).toUpperCase() + rep.slice(1)}
                </button>
              ))}
            </div>
            <ProteinViewer pdbId={selectedPdbId} representation={representation} />
            {selectedProtein ? (
              <div className="details-panel glass animate-fade" key={selectedPdbId}>
                <div className="details-header">
                  <div>
                    <h2>{selectedProtein.name || selectedProtein.pdb_id}</h2>
                    <p style={{ color: 'var(--accent)', fontWeight: 600 }}>{selectedProtein.related_disease || 'RCSB PDB Entry'}</p>
                  </div>
                  <div className="pdb-id">PDB: {selectedPdbId}</div>
                </div>
                <p style={{ lineHeight: 1.6, color: 'var(--text-muted)' }}>{selectedProtein.description || 'Structure fetched live from the RCSB Protein Data Bank.'}</p>
              </div>
            ) : (
              <div className="details-panel glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px', color: 'var(--text-muted)' }}>
                Select a protein from the list or search to visualize its 3D structure.
              </div>
            )}
          </>}

          {/* Metadata Tab */}
          {activeTab === 'metadata' && (
            <MetadataPanel metadata={metadata} loading={metaLoading} pdbId={selectedPdbId} />
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && <StatsPanel allProteins={allProteins} />}
        </section>
      </main>

      {/* Add Protein Modal */}
      {showAddForm && <AddProteinForm onAdded={handleProteinAdded} onClose={() => setShowAddForm(false)} />}
    </div>
  );
}
