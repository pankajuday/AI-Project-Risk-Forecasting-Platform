import { useState, useEffect } from 'react';
import {
  Shield,
  Clock,
  User,
  AlertTriangle,
  X,
  Search,
  Filter,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import { risksApi } from '@/api';
import type { TrackedRisk, RiskSummary } from '@/types';

export default function RiskRegisterTab({ projectId }: { projectId: string }) {
  const [risks, setRisks] = useState<TrackedRisk[]>([]);
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, open, mitigating, resolved, accepted, stale
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [selectedRiskDetails, setSelectedRiskDetails] = useState<TrackedRisk | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [newNote, setNewNote] = useState('');

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (overdueOnly) params.overdue = true;

      const [risksRes, summaryRes] = await Promise.all([
        risksApi.list(projectId, params),
        risksApi.getSummary(projectId)
      ]);
      setRisks(risksRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to fetch risks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisks();
  }, [projectId, statusFilter, categoryFilter, overdueOnly]);

  const loadRiskDetails = async (id: string) => {
    try {
      setDetailsLoading(true);
      const res = await risksApi.get(id);
      setSelectedRiskDetails(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRiskId) {
      loadRiskDetails(selectedRiskId);
    } else {
      setSelectedRiskDetails(null);
    }
  }, [selectedRiskId]);

  const handleUpdateRisk = async (id: string, updates: any) => {
    try {
      await risksApi.update(id, updates);
      // Optimistic update
      setRisks(current => 
        current.map(r => r.id === id ? { ...r, ...updates } : r)
      );
      if (selectedRiskDetails?.id === id) {
        setSelectedRiskDetails({ ...selectedRiskDetails, ...updates });
      }
      fetchRisks(); // Re-fetch to update summary and proper list
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async (id: string) => {
    if (!newNote.trim()) return;
    try {
      await risksApi.addNote(id, newNote.trim(), "User");
      setNewNote('');
      loadRiskDetails(id);
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const s = severity.toLowerCase();
    if (s === 'critical') return <span className="badge badge-red">Critical</span>;
    if (s === 'high') return <span className="badge badge-orange">High</span>;
    if (s === 'medium') return <span className="badge badge-yellow">Medium</span>;
    return <span className="badge badge-green">Low</span>;
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'open') return <span className="badge badge-indigo">Open</span>;
    if (s === 'mitigating') return <span className="badge badge-yellow">Mitigating</span>;
    if (s === 'resolved') return <span className="badge badge-green">Resolved</span>;
    if (s === 'accepted') return <span className="badge badge-muted">Accepted</span>;
    if (s === 'stale') return <span className="badge badge-red">Stale</span>;
    return <span className="badge badge-muted">{status}</span>;
  };

  const uniqueCategories = summary ? Object.keys(summary.by_category) : [];

  return (
    <div className="anim-fade-in flex flex-col gap-6">
      
      {/* Summary Row */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 flex flex-col justify-center">
            <div className="text-(--text-muted) text-xs mb-1 flex items-center gap-1"><Shield size={14} /> Total Open</div>
            <div className="text-2xl font-bold">{summary.by_status['open'] || 0}</div>
          </div>
          <div className="card p-4 flex flex-col justify-center">
            <div className="text-(--text-muted) text-xs mb-1 flex items-center gap-1"><User size={14} /> Unowned</div>
            <div className="text-2xl font-bold text-amber-500">{summary.unowned}</div>
          </div>
          <div className="card p-4 flex flex-col justify-center">
            <div className="text-(--text-muted) text-xs mb-1 flex items-center gap-1"><Clock size={14} /> Overdue</div>
            <div className="text-2xl font-bold text-red-500">{summary.overdue}</div>
          </div>
          <div className="card p-4 flex flex-col justify-center">
            <div className="text-(--text-muted) text-xs mb-1 flex items-center gap-1"><AlertTriangle size={14} /> Stale</div>
            <div className="text-2xl font-bold text-orange-500">{summary.by_status['stale'] || 0}</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={16} className="text-(--text-muted)" />
          {['all', 'open', 'mitigating', 'resolved', 'accepted', 'stale'].map(s => (
            <button
              key={s}
              className={`badge cursor-pointer px-3 py-1.5 transition-colors ${statusFilter === s ? 'badge-indigo' : 'badge-muted hover:bg-(--bg-elevated)'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            className="input py-1.5 px-3 bg-(--bg-base)"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input 
              type="checkbox" 
              className="accent-(--accent)"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
            />
            Overdue Only
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-(--bg-elevated) border-b border-(--border)">
            <tr>
              <th className="px-4 py-3 font-semibold text-(--text-muted)">Severity</th>
              <th className="px-4 py-3 font-semibold text-(--text-muted)">Title</th>
              <th className="px-4 py-3 font-semibold text-(--text-muted)">Category</th>
              <th className="px-4 py-3 font-semibold text-(--text-muted)">Status</th>
              <th className="px-4 py-3 font-semibold text-(--text-muted)">Owner</th>
              <th className="px-4 py-3 font-semibold text-(--text-muted)">Due Date</th>
              <th className="px-4 py-3 font-semibold text-(--text-muted)">Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border)">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-(--text-muted)">
                  <div className="flex justify-center"><div className="anim-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>
                </td>
              </tr>
            ) : risks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-(--text-muted)">
                  <Shield size={32} className="mx-auto mb-3 opacity-20" />
                  No risks match the current filters.
                </td>
              </tr>
            ) : (
              risks.map((risk) => (
                <tr key={risk.id} className="hover:bg-(--bg-elevated) transition-colors">
                  <td className="px-4 py-3">{getSeverityBadge(risk.severity)}</td>
                  <td className="px-4 py-3">
                    <button 
                      className="font-medium text-(--text-primary) hover:text-(--accent) text-left truncate max-w-[300px]"
                      onClick={() => setSelectedRiskId(risk.id)}
                    >
                      {risk.title}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-(--text-secondary) capitalize">{risk.category}</td>
                  <td className="px-4 py-3">
                    <select 
                      className="bg-transparent border border-(--border) rounded px-2 py-1 text-xs text-(--text-secondary) cursor-pointer"
                      value={risk.status}
                      onChange={(e) => handleUpdateRisk(risk.id, { status: e.target.value })}
                    >
                      <option value="open">Open</option>
                      <option value="mitigating">Mitigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="accepted">Accepted</option>
                      <option value="stale">Stale</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="text" 
                      className="bg-transparent border-b border-transparent hover:border-(--border) focus:border-(--accent) focus:outline-none text-sm w-32 px-1 py-1"
                      placeholder="Unassigned"
                      value={risk.owner_name || ''}
                      onChange={(e) => handleUpdateRisk(risk.id, { owner_name: e.target.value })}
                      onBlur={(e) => handleUpdateRisk(risk.id, { owner_name: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3">
                     <input 
                      type="date"
                      className="bg-transparent text-sm text-(--text-secondary) cursor-pointer"
                      value={risk.due_date || ''}
                      onChange={(e) => handleUpdateRisk(risk.id, { due_date: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-(--text-muted)">
                    {risk.occurrences}x ({new Date(risk.last_seen_at).toLocaleDateString()})
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal/Drawer */}
      {selectedRiskId && (
        <div
          className="anim-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(2, 4, 14, 0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setSelectedRiskId(null)}
        >
          <div
            className="card flex flex-col"
            style={{
              width: 'min(800px, 94vw)',
              maxHeight: '90vh',
              padding: 0,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              border: '1px solid var(--border-glow)',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            {detailsLoading && !selectedRiskDetails ? (
              <div className="p-12 flex justify-center"><div className="anim-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>
            ) : selectedRiskDetails && (
              <>
                <div className="flex items-start justify-between p-5 border-b border-(--border) bg-(--bg-elevated)">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {getSeverityBadge(selectedRiskDetails.severity)}
                      {getStatusBadge(selectedRiskDetails.status)}
                      <span className="text-xs text-(--text-muted) capitalize">{selectedRiskDetails.category}</span>
                    </div>
                    <h2 className="text-xl font-bold text-(--text-primary)">{selectedRiskDetails.title}</h2>
                  </div>
                  <button className="btn btn-ghost p-2" onClick={() => setSelectedRiskId(null)}>
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider mb-2">Description</h4>
                      <p className="text-sm text-(--text-secondary) leading-relaxed">{selectedRiskDetails.description}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider mb-2">Source Context</h4>
                      <p className="text-sm text-(--text-secondary) italic bg-(--bg-base) p-3 rounded border border-(--border)">
                        "{selectedRiskDetails.source_context}"
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider mb-2">Suggested Mitigation</h4>
                    <p className="text-sm text-(--text-secondary) leading-relaxed">{selectedRiskDetails.mitigation}</p>
                  </div>

                  <div className="border-t border-(--border) pt-6">
                    <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
                      <TrendingUp size={16} /> History & Timeline
                    </h4>
                    
                    <div className="space-y-4">
                      {selectedRiskDetails.events?.map(event => (
                        <div key={event.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-(--accent) mt-2" />
                            <div className="w-px h-full bg-(--border) my-1" />
                          </div>
                          <div className="flex-1 bg-(--bg-elevated) p-3 rounded-lg border border-(--border)">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-semibold capitalize">{event.type.replace('_', ' ')}</span>
                              <span className="text-xs text-(--text-muted)">{new Date(event.created_at).toLocaleString()}</span>
                            </div>
                            <div className="text-xs text-(--text-secondary)">
                              {event.actor && <span className="font-medium">[{event.actor}] </span>}
                              {event.type === 'status_change' && `Changed status from ${event.from_value} to ${event.to_value}`}
                              {event.type === 'note_added' && event.note}
                              {event.type === 'detected' && 'Risk initially detected.'}
                              {event.type === 're_detected' && 'Risk re-detected in subsequent analysis.'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <input 
                        type="text" 
                        className="input flex-1 bg-(--bg-elevated)" 
                        placeholder="Add a note or update..." 
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNote(selectedRiskDetails.id)}
                      />
                      <button className="btn btn-primary" onClick={() => handleAddNote(selectedRiskDetails.id)}>Add Note</button>
                    </div>
                  </div>

                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
