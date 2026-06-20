import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, CheckCircle, Circle, Trash2 } from 'lucide-react';

export function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('status', { ascending: false }) // Pending first
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setTasks(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    
    const { error } = await supabase.from('tasks').insert({
      task_name: newTask,
      status: 'Pending'
    });
    
    if (!error) {
      setNewTask('');
      fetchTasks();
    }
  };

  const toggleTask = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
  };

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Tasks</h1>

      <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          placeholder="Add a new task..." 
          className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rosegold-500 outline-none shadow-sm"
        />
        <button type="submit" className="bg-rosegold-600 text-white p-3 rounded-2xl active:scale-95 transition-transform shadow-sm">
          <Plus size={24} />
        </button>
      </form>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-500">
          No tasks. You're all caught up!
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-opacity ${task.status === 'Completed' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleTask(task.id, task.status)}>
                {task.status === 'Completed' ? (
                  <CheckCircle className="text-green-500 shrink-0" size={24} />
                ) : (
                  <Circle className="text-gray-300 shrink-0" size={24} />
                )}
                <span className={`font-medium ${task.status === 'Completed' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                  {task.task_name}
                </span>
              </div>
              <button onClick={() => deleteTask(task.id)} className="text-gray-400 p-2 hover:text-red-500 active:bg-red-50 rounded-lg">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
