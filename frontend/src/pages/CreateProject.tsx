import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ChevronLeft } from 'lucide-react';
import { projectsApi } from '@/api';

export default function CreateProject() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      const res = await projectsApi.create({ name, description });
      // Navigate to project detail view after creation
      navigate(`/projects/${res.data.id}`);
    } catch (error) {
      console.error(error);
      alert('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="anim-fade-up mx-auto mt-10 max-w-xl">
      <button className="btn btn-ghost mb-6 px-3 py-1.5" onClick={() => navigate('/projects')}>
        <ChevronLeft size={16} /> Back to Projects
      </button>

      <div className="card">
        <h1 className="mb-2 text-2xl font-extrabold">Create New Project</h1>
        <p className="mb-6 text-(--text-muted)">Start a new AI-powered risk analysis workspace.</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="mb-2 block text-[13px] font-semibold text-(--text-secondary)">
              Project Name *
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Q3 Migration Project"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-[13px] font-semibold text-(--text-secondary)">
              Description (Optional)
            </label>
            <textarea
              placeholder="Briefly describe the project goals..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="input resize-y"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/projects')}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              {loading ? (
                <>Creating...</>
              ) : (
                <>
                  <Plus size={16} /> Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
